from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import User, Role, AuditLog
from ..core.security import require_roles

router = APIRouter(prefix="/api/audit", tags=["audit"])


@router.get("")
def audit_trail(limit: int = 200, entity: str | None = None, entity_id: str | None = None,
                db: Session = Depends(get_db),
                user: User = Depends(require_roles(Role.EXAM_DEPT, Role.UFM_COMMITTEE, Role.ADMIN))):
    q = db.query(AuditLog)
    if entity:
        q = q.filter(AuditLog.entity == entity)
    if entity_id:
        q = q.filter(AuditLog.entity_id == str(entity_id))
    rows = q.order_by(AuditLog.created_at.desc()).limit(min(limit, 1000)).all()
    return [
        {"id": r.id, "user_id": r.user_id, "user_role": r.user_role, "action": r.action,
         "entity": r.entity, "entity_id": r.entity_id, "detail": r.detail,
         "ip": r.ip, "created_at": r.created_at}
        for r in rows
    ]
