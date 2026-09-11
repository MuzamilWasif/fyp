import os, shutil
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import User, Role, UFMCase, Evidence, CaseAction, CaseStatus, DetectionAlert
from ..schemas.schemas import CaseCreate, CaseOut, CaseTransition
from ..core.security import get_current_user, require_roles
from ..services.audit import log
from ..services.notify import notify_roles, notify_user
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
def list_cases(status: str | None = None, db: Session = Depends(get_db),
               user: User = Depends(get_current_user)):
    q = db.query(UFMCase)
    if user.role == Role.STUDENT:
        q = q.filter((UFMCase.student_id == user.id) | (UFMCase.student_reg_no == user.reg_no))
    elif user.role == Role.INVIGILATOR:
        q = q.filter(UFMCase.created_by == user.id)
    elif user.role in (Role.HOD, Role.DEC):
        if user.department:
            q = q.filter(UFMCase.student_department == user.department)
    if status:
        q = q.filter(UFMCase.status == CaseStatus(status))
    return q.order_by(UFMCase.created_at.desc()).all()


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
