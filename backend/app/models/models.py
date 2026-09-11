import enum
from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Enum, Boolean, Float
from sqlalchemy.orm import relationship
from ..database import Base


class Role(str, enum.Enum):
    ADMIN = "admin"
    INVIGILATOR = "invigilator"
    HOD = "hod"
    DEC = "dec"
    EXAM_DEPT = "exam_dept"
    UFM_COMMITTEE = "ufm_committee"
    STUDENT = "student"


class CaseStatus(str, enum.Enum):
    DRAFT = "draft"
    SUBMITTED = "submitted"
    HOD_APPROVED = "hod_approved"
    HOD_RETURNED = "hod_returned"
    DEC_FORWARDED = "dec_forwarded"
    EXAM_DEPT_FORWARDED = "exam_dept_forwarded"
    UNDER_COMMITTEE_REVIEW = "under_committee_review"
    DECIDED = "decided"
    CLOSED = "closed"


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    email = Column(String, unique=True, index=True, nullable=False)
    full_name = Column(String, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(Enum(Role), nullable=False, default=Role.STUDENT)
    department = Column(String, default="")
    reg_no = Column(String, default="")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class UFMCase(Base):
    __tablename__ = "ufm_cases"
    id = Column(Integer, primary_key=True)
    case_no = Column(String, unique=True, index=True)
    status = Column(Enum(CaseStatus), default=CaseStatus.SUBMITTED)

    student_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    student_reg_no = Column(String, nullable=False)
    student_name = Column(String, nullable=False)
    student_department = Column(String, default="")

    exam_name = Column(String, default="")
    exam_date = Column(String, default="")
    exam_time = Column(String, default="")
    room = Column(String, default="")
    seat = Column(String, default="")
    camera_id = Column(String, default="")

    violation_type = Column(String, nullable=False)
    description = Column(Text, default="")
    remarks = Column(Text, default="")
    source = Column(String, default="manual")

    invigilator_signed = Column(Boolean, default=False)
    hod_signed = Column(Boolean, default=False)
    result_hold = Column(Boolean, default=False)
    transcript_blocked = Column(Boolean, default=False)

    final_decision = Column(Text, default="")
    penalty = Column(String, default="")

    created_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    evidence = relationship("Evidence", back_populates="case", cascade="all, delete-orphan")
    actions = relationship("CaseAction", back_populates="case", cascade="all, delete-orphan")


class Evidence(Base):
    __tablename__ = "evidence"
    id = Column(Integer, primary_key=True)
    case_id = Column(Integer, ForeignKey("ufm_cases.id"))
    file_path = Column(String, nullable=False)
    file_type = Column(String, default="video")
    camera_id = Column(String, default="")
    room = Column(String, default="")
    seat = Column(String, default="")
    confidence = Column(Float, nullable=True)
    captured_at = Column(DateTime, default=datetime.utcnow)
    uploaded_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    source = Column(String, default="manual")

    case = relationship("UFMCase", back_populates="evidence")


class CaseAction(Base):
    __tablename__ = "case_actions"
    id = Column(Integer, primary_key=True)
    case_id = Column(Integer, ForeignKey("ufm_cases.id"))
    actor_id = Column(Integer, ForeignKey("users.id"))
    actor_role = Column(String)
    action = Column(String)
    comment = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.utcnow)

    case = relationship("UFMCase", back_populates="actions")


class AuditLog(Base):
    __tablename__ = "audit_logs"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, nullable=True)
    user_role = Column(String, default="")
    action = Column(String, nullable=False)
    entity = Column(String, default="")
    entity_id = Column(String, default="")
    detail = Column(Text, default="")
    ip = Column(String, default="")
    created_at = Column(DateTime, default=datetime.utcnow)


class Notification(Base):
    __tablename__ = "notifications"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    title = Column(String)
    body = Column(Text, default="")
    case_id = Column(Integer, nullable=True)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class DetectionAlert(Base):
    __tablename__ = "detection_alerts"
    id = Column(Integer, primary_key=True)
    camera_id = Column(String)
    room = Column(String, default="")
    label = Column(String)
    confidence = Column(Float)
    frame_count = Column(Integer, default=1)
    evidence_path = Column(String, default="")
    status = Column(String, default="new")
    case_id = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
