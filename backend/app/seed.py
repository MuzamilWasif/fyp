"""Seed default users for every role. Run: python -m app.seed"""
from .database import Base, engine, SessionLocal
from .models import User, Role
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

def run():
    from .models import Hall, Camera, Exam, SeatAssignment
    db = SessionLocal()
    for email, name, role, dept, reg in USERS:
        if not db.query(User).filter(User.email == email).first():
            db.add(User(email=email, full_name=name, role=role, department=dept,
                        reg_no=reg, hashed_password=hash_password("password123")))
    db.commit()

    if not db.query(Hall).first():
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
        db.add_all([
            SeatAssignment(exam_id=exam.id, seat="A12", student_reg_no="232430",
                           student_name="Test Student", department="CS"),
            SeatAssignment(exam_id=exam.id, seat="A13", student_reg_no="232514",
                           student_name="Muhammad Abdullah", department="CS"),
        ])
        db.commit()

    db.close()
    print("Seeded users, halls, cameras, demo exam and seat plan. Password for all accounts: password123")

if __name__ == "__main__":
    run()
