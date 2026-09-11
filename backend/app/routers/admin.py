"""Institution setup: halls, cameras, exams, seat plans, user management."""
import csv, io
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from pydantic import BaseModel
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import User, Role, Hall, Camera, Exam, SeatAssignment
from ..core.security import require_roles, hash_password
from ..services.audit import log

router = APIRouter(prefix="/api/admin", tags=["admin"])
manage = require_roles(Role.EXAM_DEPT, Role.ADMIN)


# ---------- Halls ----------
class HallIn(BaseModel):
    name: str
    building: str = ""
    capacity: int = 0


@router.get("/halls")
def list_halls(db: Session = Depends(get_db), user: User = Depends(manage)):
    return [{"id": h.id, "name": h.name, "building": h.building, "capacity": h.capacity,
             "cameras": [{"id": c.id, "camera_id": c.camera_id, "stream_url": c.stream_url,
                          "is_active": c.is_active} for c in h.cameras]}
            for h in db.query(Hall).order_by(Hall.name).all()]


@router.post("/halls")
def create_hall(payload: HallIn, db: Session = Depends(get_db), user: User = Depends(manage)):
    if db.query(Hall).filter(Hall.name == payload.name).first():
        raise HTTPException(400, "Hall already exists")
    h = Hall(**payload.model_dump())
    db.add(h); db.commit(); db.refresh(h)
    log(db, user=user, action="hall_created", entity="hall", entity_id=h.id, detail=h.name)
    return {"id": h.id}


@router.delete("/halls/{hall_id}")
def delete_hall(hall_id: int, db: Session = Depends(get_db), user: User = Depends(manage)):
    h = db.query(Hall).get(hall_id)
    if h:
        db.delete(h); db.commit()
        log(db, user=user, action="hall_deleted", entity="hall", entity_id=hall_id)
    return {"ok": True}


# ---------- Cameras ----------
class CameraIn(BaseModel):
    camera_id: str
    hall_id: int
    rtsp_url: str = ""
    stream_url: str = ""


@router.get("/cameras")
def list_cameras(db: Session = Depends(get_db), user: User = Depends(require_roles(
        Role.EXAM_DEPT, Role.ADMIN, Role.INVIGILATOR, Role.HOD))):
    return [{"id": c.id, "camera_id": c.camera_id, "hall": c.hall.name if c.hall else "",
             "rtsp_url": c.rtsp_url, "stream_url": c.stream_url, "is_active": c.is_active}
            for c in db.query(Camera).all()]


@router.post("/cameras")
def create_camera(payload: CameraIn, db: Session = Depends(get_db), user: User = Depends(manage)):
    if db.query(Camera).filter(Camera.camera_id == payload.camera_id).first():
        raise HTTPException(400, "Camera ID already exists")
    c = Camera(**payload.model_dump())
    db.add(c); db.commit(); db.refresh(c)
    log(db, user=user, action="camera_created", entity="camera", entity_id=c.id, detail=c.camera_id)
    return {"id": c.id}


@router.delete("/cameras/{cam_id}")
def delete_camera(cam_id: int, db: Session = Depends(get_db), user: User = Depends(manage)):
    c = db.query(Camera).get(cam_id)
    if c:
        db.delete(c); db.commit()
        log(db, user=user, action="camera_deleted", entity="camera", entity_id=cam_id)
    return {"ok": True}


# ---------- Exams & seat plans ----------
class ExamIn(BaseModel):
    name: str
    course_code: str = ""
    department: str = ""
    semester: str = ""
    date: str = ""
    start_time: str = ""
    end_time: str = ""
    hall_id: int | None = None


@router.get("/exams")
def list_exams(db: Session = Depends(get_db), user: User = Depends(require_roles(
        Role.EXAM_DEPT, Role.ADMIN, Role.INVIGILATOR, Role.HOD))):
    return [{"id": e.id, "name": e.name, "course_code": e.course_code, "department": e.department,
             "semester": e.semester, "date": e.date, "start_time": e.start_time,
             "end_time": e.end_time, "hall": e.hall.name if e.hall else "",
             "hall_id": e.hall_id, "seat_count": len(e.seats)}
            for e in db.query(Exam).order_by(Exam.date.desc()).all()]


@router.post("/exams")
def create_exam(payload: ExamIn, db: Session = Depends(get_db), user: User = Depends(manage)):
    e = Exam(**payload.model_dump())
    db.add(e); db.commit(); db.refresh(e)
    log(db, user=user, action="exam_created", entity="exam", entity_id=e.id, detail=e.name)
    return {"id": e.id}


@router.delete("/exams/{exam_id}")
def delete_exam(exam_id: int, db: Session = Depends(get_db), user: User = Depends(manage)):
    e = db.query(Exam).get(exam_id)
    if e:
        db.delete(e); db.commit()
        log(db, user=user, action="exam_deleted", entity="exam", entity_id=exam_id)
    return {"ok": True}


@router.post("/exams/{exam_id}/seats/upload")
def upload_seat_plan(exam_id: int, file: UploadFile = File(...),
                     db: Session = Depends(get_db), user: User = Depends(manage)):
    """CSV columns: seat,student_reg_no,student_name,department"""
    exam = db.query(Exam).get(exam_id)
    if not exam:
        raise HTTPException(404, "Exam not found")
    text = file.file.read().decode("utf-8-sig")
    reader = csv.DictReader(io.StringIO(text))
    db.query(SeatAssignment).filter(SeatAssignment.exam_id == exam_id).delete()
    count = 0
    for row in reader:
        if not row.get("seat") or not row.get("student_reg_no"):
            continue
        db.add(SeatAssignment(exam_id=exam_id, seat=row["seat"].strip(),
                              student_reg_no=row["student_reg_no"].strip(),
                              student_name=(row.get("student_name") or "").strip(),
                              department=(row.get("department") or "").strip()))
        count += 1
    db.commit()
    log(db, user=user, action="seat_plan_uploaded", entity="exam", entity_id=exam_id, detail=f"{count} seats")
    return {"imported": count}


@router.get("/exams/{exam_id}/seats")
def seat_plan(exam_id: int, db: Session = Depends(get_db), user: User = Depends(require_roles(
        Role.EXAM_DEPT, Role.ADMIN, Role.INVIGILATOR, Role.HOD))):
    return [{"seat": s.seat, "student_reg_no": s.student_reg_no,
             "student_name": s.student_name, "department": s.department}
            for s in db.query(SeatAssignment).filter(SeatAssignment.exam_id == exam_id).all()]


# ---------- Users ----------
@router.get("/users")
def list_users(db: Session = Depends(get_db), user: User = Depends(require_roles(Role.ADMIN))):
    return [{"id": u.id, "email": u.email, "full_name": u.full_name, "role": u.role.value,
             "department": u.department, "reg_no": u.reg_no, "is_active": u.is_active}
            for u in db.query(User).order_by(User.id).all()]


@router.post("/users/{user_id}/toggle")
def toggle_user(user_id: int, db: Session = Depends(get_db), admin: User = Depends(require_roles(Role.ADMIN))):
    u = db.query(User).get(user_id)
    if not u:
        raise HTTPException(404, "User not found")
    if u.id == admin.id:
        raise HTTPException(400, "Cannot deactivate yourself")
    u.is_active = not u.is_active
    db.commit()
    log(db, user=admin, action="user_toggled", entity="user", entity_id=u.id,
        detail="activated" if u.is_active else "deactivated")
    return {"is_active": u.is_active}
