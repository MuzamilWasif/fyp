from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import User, Role, UFMCase, CaseStatus, DetectionAlert
from ..core.security import get_current_user

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("/stats")
def stats(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    total = db.query(UFMCase).count()
    open_cases = db.query(UFMCase).filter(UFMCase.status.notin_([CaseStatus.DECIDED, CaseStatus.CLOSED])).count()
    decided = db.query(UFMCase).filter(UFMCase.status == CaseStatus.DECIDED).count()
    holds = db.query(UFMCase).filter(UFMCase.result_hold == True).count()
    alerts_new = db.query(DetectionAlert).filter(DetectionAlert.status == "new").count()

    by_status = dict(db.query(UFMCase.status, func.count(UFMCase.id)).group_by(UFMCase.status).all())
    by_dept = dict(db.query(UFMCase.student_department, func.count(UFMCase.id))
                   .group_by(UFMCase.student_department).all())
    by_violation = dict(db.query(UFMCase.violation_type, func.count(UFMCase.id))
                        .group_by(UFMCase.violation_type).all())

    return {
        "total_cases": total,
        "open_cases": open_cases,
        "decided_cases": decided,
        "result_holds": holds,
        "new_alerts": alerts_new,
        "by_status": {(k.value if hasattr(k, "value") else k): v for k, v in by_status.items()},
        "by_department": by_dept,
        "by_violation": by_violation,
    }
