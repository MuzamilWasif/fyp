from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, EmailStr


class UserCreate(BaseModel):
    email: EmailStr
    full_name: str
    password: str
    role: str = "student"
    department: str = ""
    reg_no: str = ""


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
    student_reg_no: str
    student_name: str
    student_department: str = ""
    exam_name: str = ""
    exam_date: str = ""
    exam_time: str = ""
    room: str = ""
    seat: str = ""
    camera_id: str = ""
    violation_type: str
    description: str = ""
    remarks: str = ""
    source: str = "manual"
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


class CaseTransition(BaseModel):
    action: str            # approve | return | forward | decide | hold | release_result | block_transcript | unblock_transcript | close | note
    comment: str = ""
    final_decision: str = ""
    penalty: str = ""


class AlertIn(BaseModel):
    camera_id: str
    room: str = ""
    label: str
    confidence: float
    frame_count: int = 1
    evidence_path: str = ""


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
