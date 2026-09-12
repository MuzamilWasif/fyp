from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, EmailStr, Field


class UserCreate(BaseModel):
    email: EmailStr
    full_name: str = Field(min_length=1, max_length=120)
    password: str = Field(min_length=8, max_length=128)
    role: str = Field(default="student", max_length=32)
    department: str = Field(default="", max_length=60)
    reg_no: str = Field(default="", max_length=40)


class UserOut(BaseModel):
    id: int
    email: str
    full_name: str
    role: str
    department: str
    reg_no: str

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class EvidenceOut(BaseModel):
    id: int
    file_path: str
    file_type: str
    camera_id: str
    room: str
    seat: str
    confidence: Optional[float] = None
    captured_at: datetime
    source: str

    class Config:
        from_attributes = True


class CaseActionOut(BaseModel):
    id: int
    actor_role: str
    action: str
    comment: str
    created_at: datetime

    class Config:
        from_attributes = True


class CaseCreate(BaseModel):
    student_reg_no: str = Field(min_length=1, max_length=40)
    student_name: str = Field(min_length=1, max_length=120)
    student_department: str = Field(default="", max_length=60)
    exam_name: str = Field(default="", max_length=160)
    exam_date: str = Field(default="", max_length=32)
    exam_time: str = Field(default="", max_length=32)
    room: str = Field(default="", max_length=60)
    seat: str = Field(default="", max_length=20)
    camera_id: str = Field(default="", max_length=60)
    violation_type: str = Field(min_length=1, max_length=60)
    description: str = Field(default="", max_length=2000)
    remarks: str = Field(default="", max_length=1000)
    source: str = Field(default="manual", max_length=20)
    alert_id: Optional[int] = None
    invigilator_signed: bool = True


class CaseOut(BaseModel):
    id: int
    case_no: str
    status: str
    student_reg_no: str
    student_name: str
    student_department: str
    exam_name: str
    exam_date: str
    exam_time: str
    room: str
    seat: str
    camera_id: str
    violation_type: str
    description: str
    remarks: str
    source: str
    invigilator_signed: bool
    hod_signed: bool
    result_hold: bool
    transcript_blocked: bool
    final_decision: str
    penalty: str
    created_at: datetime
    updated_at: datetime
    evidence: List[EvidenceOut] = []
    actions: List[CaseActionOut] = []

    class Config:
        from_attributes = True


class StudentResponse(BaseModel):
    text: str = Field(min_length=1, max_length=4000)


class CaseTransition(BaseModel):
    # approve | return | forward | decide | hold | release_result |
    # block_transcript | unblock_transcript | close | note
    action: str = Field(min_length=1, max_length=32)
    comment: str = Field(default="", max_length=2000)
    final_decision: str = Field(default="", max_length=2000)
    penalty: str = Field(default="", max_length=300)


class AlertIn(BaseModel):
    camera_id: str = Field(min_length=1, max_length=60)
    room: str = Field(default="", max_length=60)
    label: str = Field(min_length=1, max_length=60)
    confidence: float = Field(ge=0.0, le=1.0)
    frame_count: int = Field(default=1, ge=1, le=100000)
    evidence_path: str = Field(default="", max_length=500)


class AlertOut(AlertIn):
    id: int
    severity: float = 0.5
    status: str
    case_id: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True


class NotificationOut(BaseModel):
    id: int
    title: str
    body: str
    case_id: Optional[int]
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True
