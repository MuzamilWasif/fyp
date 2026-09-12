"""Seed default users, institution setup and a realistic demo case load.

Run: python -m app.seed
Also invoked automatically at import time when the database is empty, so a
fresh serverless deployment always comes up with a working demo.
"""
from datetime import datetime, timedelta

from .database import Base, engine, SessionLocal
from .models import (User, Role, UFMCase, CaseStatus, CaseAction, Notification,
                     DetectionAlert, Hall, Camera, Exam, SeatAssignment)
from .core.security import hash_password

Base.metadata.create_all(bind=engine)

USERS = [
    ("admin@au.edu.pk", "System Admin", Role.ADMIN, "", ""),
    ("invigilator@au.edu.pk", "Invigilator One", Role.INVIGILATOR, "CS", ""),
    ("hod@au.edu.pk", "HOD Computer Science", Role.HOD, "CS", ""),
    ("dec@au.edu.pk", "DEC Member", Role.DEC, "CS", ""),
    ("examdept@au.edu.pk", "Examination Department", Role.EXAM_DEPT, "", ""),
    ("committee@au.edu.pk", "UFM Committee", Role.UFM_COMMITTEE, "", ""),
    ("student@au.edu.pk", "Test Student", Role.STUDENT, "CS", "232430"),
]

# (days_ago, reg_no, name, dept, violation, status, source, penalty, decision)
DEMO_CASES = [
    (5, "232430", "Test Student", "CS", "mobile_phone", CaseStatus.SUBMITTED, "ai", "", ""),
    (9, "232514", "Muhammad Abdullah", "CS", "notes_paper", CaseStatus.HOD_APPROVED, "manual", "", ""),
    (14, "221188", "Ayesha Khan", "CS", "paper_exchange", CaseStatus.DEC_FORWARDED, "ai", "", ""),
    (21, "219902", "Bilal Ahmed", "EE", "smart_watch", CaseStatus.EXAM_DEPT_FORWARDED, "ai", "", ""),
    (28, "223317", "Hira Siddiqui", "CS", "talking_communication", CaseStatus.HOD_RETURNED, "manual", "", ""),
    (34, "218845", "Usman Tariq", "ME", "mobile_phone", CaseStatus.DECIDED, "ai",
     "F grade in course", "Guilty of using a mobile phone during the examination."),
    (47, "224410", "Fatima Noor", "CS", "notes_paper", CaseStatus.CLOSED, "manual",
     "Warning", "First offence; formal warning issued and recorded."),
    (61, "217733", "Hamza Raza", "EE", "impersonation", CaseStatus.CLOSED, "manual",
     "One semester suspension", "Impersonation established beyond doubt."),
    (76, "232430", "Test Student", "CS", "looking_around", CaseStatus.CLOSED, "ai",
     "Warning", "Minor infraction; warning recorded on file."),
    (95, "225566", "Zainab Malik", "CS", "electronic_device", CaseStatus.CLOSED, "ai",
     "F grade in course", "Concealed electronic device recovered during the paper."),
    (118, "216690", "Ali Hassan", "ME", "mobile_phone", CaseStatus.CLOSED, "ai",
     "F grade in all courses", "Repeat offence; penalty applied across all registered courses."),
    (142, "228834", "Sana Javed", "EE", "notes_paper", CaseStatus.CLOSED, "manual",
     "Warning", "Notes found but unused; warning issued."),
]

# Which actions a case of each status has already accumulated.
HISTORY = {
    CaseStatus.SUBMITTED: [("invigilator", "submitted", "Observed during the paper.")],
    CaseStatus.HOD_RETURNED: [("invigilator", "submitted", "Observed during the paper."),
                              ("hod", "return", "Insufficient evidence attached; please re-submit.")],
    CaseStatus.HOD_APPROVED: [("invigilator", "submitted", "Observed during the paper."),
                              ("hod", "approve", "Verified and signed.")],
    CaseStatus.DEC_FORWARDED: [("invigilator", "submitted", "Observed during the paper."),
                               ("hod", "approve", "Verified and signed."),
                               ("dec", "forward", "Reviewed by the committee; forwarded.")],
    CaseStatus.EXAM_DEPT_FORWARDED: [("invigilator", "submitted", "Observed during the paper."),
                                     ("hod", "approve", "Verified and signed."),
                                     ("dec", "forward", "Reviewed by the committee; forwarded."),
                                     ("exam_dept", "forward", "Result held; forwarded to the UFM Committee.")],
    CaseStatus.DECIDED: [("invigilator", "submitted", "Observed during the paper."),
                         ("hod", "approve", "Verified and signed."),
                         ("dec", "forward", "Reviewed by the committee; forwarded."),
                         ("exam_dept", "forward", "Result held; forwarded to the UFM Committee."),
                         ("ufm_committee", "decide", "Decision recorded.")],
    CaseStatus.CLOSED: [("invigilator", "submitted", "Observed during the paper."),
                        ("hod", "approve", "Verified and signed."),
                        ("dec", "forward", "Reviewed by the committee; forwarded."),
                        ("exam_dept", "forward", "Result held; forwarded to the UFM Committee."),
                        ("ufm_committee", "decide", "Decision recorded."),
                        ("exam_dept", "release_result", "Penalty applied; result released."),
                        ("exam_dept", "close", "Case closed.")],
}

DEMO_ALERTS = [
    ("CAM-A101-1", "A-101", "mobile_phone", 0.93, 11, "new"),
    ("CAM-A101-2", "A-101", "notes_paper", 0.81, 7, "new"),
    ("CAM-B203-1", "B-203", "looking_around", 0.64, 5, "acknowledged"),
    ("CAM-A101-1", "A-101", "talking_communication", 0.72, 6, "dismissed"),
]


def _seed_users(db):
    for email, name, role, dept, reg in USERS:
        if not db.query(User).filter(User.email == email).first():
            db.add(User(email=email, full_name=name, role=role, department=dept,
                        reg_no=reg, hashed_password=hash_password("password123")))
    db.commit()


def _seed_institution(db):
    if db.query(Hall).first():
        return
    h1 = Hall(name="A-101", building="CS Block", capacity=40)
    h2 = Hall(name="B-203", building="CS Block", capacity=60)
    db.add_all([h1, h2]); db.commit()
    db.add_all([
        Camera(camera_id="CAM-A101-1", hall_id=h1.id, stream_url="http://localhost:8090/stream/CAM-A101-1"),
        Camera(camera_id="CAM-A101-2", hall_id=h1.id),
        Camera(camera_id="CAM-B203-1", hall_id=h2.id),
    ])
    exam = Exam(name="Data Structures Final", course_code="CS-201", department="CS",
                semester="Fall 2026", date="2026-09-15", start_time="09:00",
                end_time="12:00", hall_id=h1.id)
    db.add(exam); db.commit()
    # a full seat grid so the seat map renders as a real hall plan
    named = {
        "A12": ("232430", "Test Student"),
        "A13": ("232514", "Muhammad Abdullah"),
        "B04": ("221188", "Ayesha Khan"),
        "C07": ("223317", "Hira Siddiqui"),
        "D02": ("224410", "Fatima Noor"),
        "E10": ("225566", "Zainab Malik"),
    }
    n = 0
    for row in "ABCDE":
        for col in range(1, 15):
            seat = f"{row}{col}"
            padded = f"{row}{col:02d}"
            reg, name = named.get(seat) or named.get(padded) or (f"23{2600 + n}", f"Student {n + 1}")
            db.add(SeatAssignment(exam_id=exam.id, seat=seat, student_reg_no=reg,
                                  student_name=name, department="CS"))
            n += 1
    db.commit()


def _seed_cases(db):
    """A realistic twelve-month case load so dashboards and charts are alive."""
    if db.query(UFMCase).first():
        return

    inv = db.query(User).filter(User.role == Role.INVIGILATOR).first()
    actors = {r.value: db.query(User).filter(User.role == r).first()
              for r in (Role.INVIGILATOR, Role.HOD, Role.DEC, Role.EXAM_DEPT, Role.UFM_COMMITTEE)}
    students = {u.reg_no: u for u in db.query(User).filter(User.role == Role.STUDENT).all() if u.reg_no}

    for n, (days, reg, name, dept, violation, status, source, penalty, decision) in enumerate(DEMO_CASES, start=1):
        created = datetime.utcnow() - timedelta(days=days)
        student = students.get(reg)
        closed = status in (CaseStatus.DECIDED, CaseStatus.CLOSED)
        case = UFMCase(
            case_no=f"UFM-{created.year}-{n:04d}",
            status=status,
            student_id=student.id if student else None,
            student_reg_no=reg, student_name=name, student_department=dept,
            exam_name="Data Structures Final" if dept == "CS" else "Semester Examination",
            exam_date=created.strftime("%Y-%m-%d"), exam_time="09:00",
            room="A-101" if dept == "CS" else "B-203",
            seat=f"{'ABCDE'[n % 5]}{(n % 8) + 1}",
            camera_id="CAM-A101-1" if source == "ai" else "",
            violation_type=violation,
            description="Detected by the AI engine and confirmed by the invigilator."
                        if source == "ai" else "Reported by the invigilator on duty.",
            source=source,
            invigilator_signed=True,
            hod_signed=status not in (CaseStatus.SUBMITTED, CaseStatus.HOD_RETURNED),
            result_hold=not (status == CaseStatus.CLOSED),
            transcript_blocked=status in (CaseStatus.EXAM_DEPT_FORWARDED, CaseStatus.DECIDED),
            final_decision=decision, penalty=penalty,
            created_by=inv.id if inv else None,
            created_at=created,
            updated_at=created + timedelta(days=2 if closed else 0),
        )
        db.add(case); db.commit(); db.refresh(case)

        for step, (role, action, comment) in enumerate(HISTORY.get(status, [])):
            actor = actors.get(role)
            db.add(CaseAction(case_id=case.id, actor_id=actor.id if actor else None,
                              actor_role=role, action=action, comment=comment,
                              created_at=created + timedelta(hours=step * 9)))
        db.commit()

        if student:
            db.add(Notification(user_id=student.id,
                                title=f"UFM case {case.case_no} registered against you",
                                body="Your result has been placed on hold pending review.",
                                case_id=case.id, is_read=days > 10, created_at=created))
    db.commit()


def _seed_alerts(db):
    if db.query(DetectionAlert).first():
        return
    weights = {"mobile_phone": 0.95, "notes_paper": 0.75,
               "looking_around": 0.5, "talking_communication": 0.6}
    for i, (cam, room, label, conf, frames, status) in enumerate(DEMO_ALERTS):
        db.add(DetectionAlert(camera_id=cam, room=room, label=label, confidence=conf,
                              severity=round(weights.get(label, 0.5) * conf, 3),
                              frame_count=frames, status=status,
                              created_at=datetime.utcnow() - timedelta(minutes=7 * (i + 1))))
    db.commit()


def run():
    db = SessionLocal()
    try:
        _seed_users(db)
        _seed_institution(db)
        _seed_cases(db)
        _seed_alerts(db)
    finally:
        db.close()
    print("Seeded users, institution setup, demo cases and alerts. "
          "Password for all accounts: password123")


if __name__ == "__main__":
    run()
