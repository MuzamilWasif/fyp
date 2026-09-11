"""Auto-fill support: resolve a student from an exam seat, and student search."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import User, Role, SeatAssignment, Exam
from ..core.security import require_roles

router = APIRouter(prefix="/api/lookup", tags=["lookup"])
staff = require_roles(Role.INVIGILATOR, Role.HOD, Role.EXAM_DEPT, Role.ADMIN)


@router.get("/seat")
def by_seat(exam_id: int, seat: str, db: Session = Depends(get_db), user: User = Depends(staff)):
    s = (db.query(SeatAssignment)
         .filter(SeatAssignment.exam_id == exam_id, SeatAssignment.seat == seat.strip()).first())
    if not s:
        raise HTTPException(404, "No student assigned to this seat")
    exam = db.query(Exam).get(exam_id)
    return {"student_reg_no": s.student_reg_no, "student_name": s.student_name,
            "department": s.department, "exam_name": exam.name if exam else "",
            "exam_date": exam.date if exam else "", "exam_time": exam.start_time if exam else "",
            "room": exam.hall.name if exam and exam.hall else ""}


@router.get("/student")
def by_reg_no(reg_no: str, db: Session = Depends(get_db), user: User = Depends(staff)):
    u = db.query(User).filter(User.reg_no == reg_no.strip(), User.role == Role.STUDENT).first()
    if u:
        return {"student_reg_no": u.reg_no, "student_name": u.full_name, "department": u.department}
    s = db.query(SeatAssignment).filter(SeatAssignment.student_reg_no == reg_no.strip()).first()
    if s:
        return {"student_reg_no": s.student_reg_no, "student_name": s.student_name, "department": s.department}
    raise HTTPException(404, "Student not found")
