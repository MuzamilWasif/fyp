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
    db = SessionLocal()
    for email, name, role, dept, reg in USERS:
        if not db.query(User).filter(User.email == email).first():
            db.add(User(email=email, full_name=name, role=role, department=dept,
                        reg_no=reg, hashed_password=hash_password("password123")))
    db.commit()
    db.close()
    print("Seeded. All accounts use password: password123")

if __name__ == "__main__":
    run()
