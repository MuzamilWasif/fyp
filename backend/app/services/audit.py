from sqlalchemy.orm import Session
from ..models import AuditLog


def log(db: Session, *, user=None, action: str, entity: str = "", entity_id="", detail: str = "", ip: str = ""):
    entry = AuditLog(
        user_id=user.id if user else None,
        user_role=user.role.value if user else "system",
        action=action,
        entity=entity,
        entity_id=str(entity_id),
        detail=detail,
        ip=ip,
    )
    db.add(entry)
    db.commit()
