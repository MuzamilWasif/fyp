import csv, io, os, shutil
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Response
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import User, Role, UFMCase, Evidence, CaseAction, CaseStatus, DetectionAlert
from ..schemas.schemas import CaseCreate, CaseOut, CaseTransition, StudentResponse
from ..core.security import get_current_user, require_roles
from ..services.audit import log
from ..services.notify import notify_roles, notify_user
from ..services.scoping import scope_cases, pending_statuses
from ..config import settings

router = APIRouter(prefix="/api/cases", tags=["cases"])


def _gen_case_no(db: Session) -> str:
    year = datetime.utcnow().year
    count = db.query(UFMCase).count() + 1
    return f"UFM-{year}-{count:04d}"


def _record(db, case, user, action, comment=""):
    db.add(CaseAction(case_id=case.id, actor_id=user.id, actor_role=user.role.value, action=action, comment=comment))
    db.commit()


@router.post("", response_model=CaseOut)
def create_case(payload: CaseCreate, db: Session = Depends(get_db),
                user: User = Depends(require_roles(Role.INVIGILATOR))):
    student = db.query(User).filter(User.reg_no == payload.student_reg_no, User.role == Role.STUDENT).first()
    case = UFMCase(
        case_no=_gen_case_no(db),
        status=CaseStatus.SUBMITTED,
        student_id=student.id if student else None,
        student_reg_no=payload.student_reg_no,
        student_name=payload.student_name,
        student_department=payload.student_department,
        exam_name=payload.exam_name, exam_date=payload.exam_date, exam_time=payload.exam_time,
        room=payload.room, seat=payload.seat, camera_id=payload.camera_id,
        violation_type=payload.violation_type, description=payload.description,
        remarks=payload.remarks, source=payload.source,
        invigilator_signed=payload.invigilator_signed,
        result_hold=True,  # automatic result hold on case creation
        created_by=user.id,
    )
    db.add(case); db.commit(); db.refresh(case)

    if payload.alert_id:
        alert = db.query(DetectionAlert).get(payload.alert_id)
        if alert:
            alert.status = "case_created"
            alert.case_id = case.id
            if alert.evidence_path:
                db.add(Evidence(case_id=case.id, file_path=alert.evidence_path, file_type="video",
                                camera_id=alert.camera_id, room=alert.room,
                                confidence=alert.confidence, source="ai"))
            db.commit()

    _record(db, case, user, "submitted", payload.remarks)
    log(db, user=user, action="case_created", entity="case", entity_id=case.id, detail=case.case_no)
    notify_roles(db, [Role.HOD, Role.EXAM_DEPT], f"New UFM case {case.case_no}",
                 f"{case.student_name} ({case.student_reg_no}) - {case.violation_type}", case.id)
    if student:
        notify_user(db, student.id, f"UFM case {case.case_no} registered against you",
                    "Your result has been placed on hold pending review.", case.id)
    return case


@router.get("", response_model=list[CaseOut])
def list_cases(status: str | None = None, pending: bool = False,
               db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """Cases visible to the caller.

    `pending=true` narrows the list to the cases that are waiting on the
    caller's own role — the "needs your action" queue.
    """
    q = scope_cases(db.query(UFMCase), user)
    if status:
        try:
            q = q.filter(UFMCase.status == CaseStatus(status))
        except ValueError:
            raise HTTPException(422, f"Unknown status '{status}'")
    if pending:
        waiting = pending_statuses(user)
        if not waiting:
            return []
        q = q.filter(UFMCase.status.in_(waiting))
    return q.order_by(UFMCase.created_at.desc()).all()


EXPORT_COLUMNS = [
    "case_no", "status", "student_reg_no", "student_name", "student_department",
    "exam_name", "exam_date", "exam_time", "room", "seat", "violation_type",
    "source", "result_hold", "transcript_blocked", "penalty", "final_decision",
    "created_at", "updated_at",
]


@router.get("/export.csv")
def export_cases(status: str | None = None, db: Session = Depends(get_db),
                 user: User = Depends(get_current_user)):
    """CSV of every case the caller may see — same scope as the list endpoint."""
    q = scope_cases(db.query(UFMCase), user)
    if status:
        try:
            q = q.filter(UFMCase.status == CaseStatus(status))
        except ValueError:
            raise HTTPException(422, f"Unknown status '{status}'")

    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow([c.replace("_", " ").title() for c in EXPORT_COLUMNS])
    rows = 0
    for case in q.order_by(UFMCase.created_at.desc()).all():
        writer.writerow([_csv_value(getattr(case, col)) for col in EXPORT_COLUMNS])
        rows += 1

    log(db, user=user, action="cases_exported", entity="case", detail=f"{rows} rows")
    filename = f"vigilanteye-cases-{datetime.utcnow().strftime('%Y%m%d')}.csv"
    return Response(
        content=buf.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


def _csv_value(value):
    if isinstance(value, bool):
        return "yes" if value else "no"
    if isinstance(value, datetime):
        return value.strftime("%Y-%m-%d %H:%M")
    if hasattr(value, "value"):
        return value.value
    return "" if value is None else value


@router.get("/{case_id}", response_model=CaseOut)
def get_case(case_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    case = db.query(UFMCase).get(case_id)
    if not case:
        raise HTTPException(404, "Case not found")
    if user.role == Role.STUDENT and case.student_id != user.id and case.student_reg_no != user.reg_no:
        raise HTTPException(403, "Not your case")
    return case


@router.post("/{case_id}/evidence", response_model=CaseOut)
def upload_evidence(case_id: int, file: UploadFile = File(...), db: Session = Depends(get_db),
                    user: User = Depends(require_roles(Role.INVIGILATOR, Role.HOD, Role.EXAM_DEPT))):
    case = db.query(UFMCase).get(case_id)
    if not case:
        raise HTTPException(404, "Case not found")
    os.makedirs(settings.EVIDENCE_DIR, exist_ok=True)
    fname = f"{case.case_no}_{datetime.utcnow().strftime('%Y%m%d%H%M%S')}_{file.filename}"
    path = os.path.join(settings.EVIDENCE_DIR, fname)
    with open(path, "wb") as f:
        shutil.copyfileobj(file.file, f)
    ftype = "image" if file.content_type and file.content_type.startswith("image") else "video"
    db.add(Evidence(case_id=case.id, file_path=path, file_type=ftype, uploaded_by=user.id, source="manual"))
    db.commit(); db.refresh(case)
    _record(db, case, user, "evidence_uploaded", file.filename)
    log(db, user=user, action="evidence_uploaded", entity="case", entity_id=case.id, detail=fname)
    return case


ALLOWED = {
    Role.HOD: {"approve", "return", "note"},
    Role.DEC: {"forward", "return", "note"},
    Role.EXAM_DEPT: {"forward", "hold", "release_result", "block_transcript", "unblock_transcript", "close", "note"},
    Role.UFM_COMMITTEE: {"decide", "note"},
    Role.INVIGILATOR: {"note"},
    Role.ADMIN: {"approve", "return", "forward", "decide", "hold", "release_result",
                 "block_transcript", "unblock_transcript", "close", "note"},
}


@router.post("/{case_id}/transition", response_model=CaseOut)
def transition(case_id: int, payload: CaseTransition, db: Session = Depends(get_db),
               user: User = Depends(get_current_user)):
    case = db.query(UFMCase).get(case_id)
    if not case:
        raise HTTPException(404, "Case not found")
    if payload.action not in ALLOWED.get(user.role, set()):
        raise HTTPException(403, f"Role {user.role.value} cannot perform '{payload.action}'")

    a = payload.action
    if a == "approve":
        case.status = CaseStatus.HOD_APPROVED
        case.hod_signed = True
        notify_roles(db, [Role.DEC], f"Case {case.case_no} approved by HOD", payload.comment, case.id)
    elif a == "return":
        case.status = CaseStatus.HOD_RETURNED
        notify_roles(db, [Role.INVIGILATOR], f"Case {case.case_no} returned", payload.comment, case.id)
    elif a == "forward":
        if user.role == Role.DEC:
            case.status = CaseStatus.DEC_FORWARDED
            notify_roles(db, [Role.EXAM_DEPT], f"Case {case.case_no} forwarded by DEC", payload.comment, case.id)
        else:
            case.status = CaseStatus.EXAM_DEPT_FORWARDED
            notify_roles(db, [Role.UFM_COMMITTEE], f"Case {case.case_no} forwarded to UFM Committee", payload.comment, case.id)
    elif a == "decide":
        case.status = CaseStatus.DECIDED
        case.final_decision = payload.final_decision or payload.comment
        case.penalty = payload.penalty
        notify_roles(db, [Role.EXAM_DEPT], f"Decision recorded for {case.case_no}", case.final_decision, case.id)
        if case.student_id:
            notify_user(db, case.student_id, f"Decision on case {case.case_no}", case.final_decision, case.id)
    elif a == "hold":
        case.result_hold = True
    elif a == "release_result":
        case.result_hold = False
        if case.student_id:
            notify_user(db, case.student_id, f"Result released for case {case.case_no}", payload.comment, case.id)
    elif a == "block_transcript":
        case.transcript_blocked = True
    elif a == "unblock_transcript":
        case.transcript_blocked = False
    elif a == "close":
        case.status = CaseStatus.CLOSED

    db.commit(); db.refresh(case)
    _record(db, case, user, a, payload.comment)
    log(db, user=user, action=f"case_{a}", entity="case", entity_id=case.id, detail=payload.comment)
    return case


@router.post("/{case_id}/student-response", response_model=CaseOut)
def student_response(case_id: int, payload: StudentResponse, db: Session = Depends(get_db),
                     user: User = Depends(require_roles(Role.STUDENT))):
    """A student's written explanation, recorded on the case timeline.

    This is the only write a student may perform, and only on their own case
    while it is still open.
    """
    case = db.query(UFMCase).get(case_id)
    if not case:
        raise HTTPException(404, "Case not found")
    if user.role == Role.STUDENT and case.student_id != user.id and case.student_reg_no != user.reg_no:
        raise HTTPException(403, "Not your case")
    if case.status == CaseStatus.CLOSED:
        raise HTTPException(400, "This case is closed and can no longer receive a response")

    text = payload.text.strip()
    if not text:
        raise HTTPException(422, "Your response cannot be empty")

    _record(db, case, user, "student_response", text)
    log(db, user=user, action="student_response", entity="case", entity_id=case.id, detail=case.case_no)
    notify_roles(db, [Role.HOD, Role.EXAM_DEPT, Role.UFM_COMMITTEE],
                 f"Student response on {case.case_no}",
                 f"{case.student_name} ({case.student_reg_no}) submitted a clarification.", case.id)
    db.refresh(case)
    return case


@router.get("/{case_id}/student-history")
def student_history(case_id: int, db: Session = Depends(get_db),
                    user: User = Depends(require_roles(Role.HOD, Role.DEC, Role.EXAM_DEPT,
                                                       Role.UFM_COMMITTEE))):
    """Every prior UFM case for this student — the committee needs the pattern,
    not just the incident in front of them."""
    case = db.query(UFMCase).get(case_id)
    if not case:
        raise HTTPException(404, "Case not found")

    rows = (db.query(UFMCase)
            .filter(UFMCase.student_reg_no == case.student_reg_no)
            .order_by(UFMCase.created_at.desc()).all())
    prior = [r for r in rows if r.id != case.id]
    return {
        "student_reg_no": case.student_reg_no,
        "student_name": case.student_name,
        "total_cases": len(rows),
        "prior_cases": len(prior),
        "penalties": [r.penalty for r in prior if r.penalty],
        "cases": [
            {"id": r.id, "case_no": r.case_no, "status": r.status.value,
             "violation_type": r.violation_type, "exam_name": r.exam_name,
             "penalty": r.penalty, "final_decision": r.final_decision,
             "is_current": r.id == case.id, "created_at": r.created_at}
            for r in rows
        ],
    }
