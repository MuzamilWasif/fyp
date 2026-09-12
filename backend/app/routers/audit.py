"""Tamper-proof audit trail: read-only, filterable, exportable."""
import csv, io
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import User, Role, AuditLog
from ..core.security import require_roles
from ..services.audit import log

router = APIRouter(prefix="/api/audit", tags=["audit"])
reader = require_roles(Role.EXAM_DEPT, Role.UFM_COMMITTEE, Role.ADMIN)

MAX_LIMIT = 1000


def _parse_day(value: str | None, end: bool = False):
    """Accept YYYY-MM-DD; the `to` bound is inclusive of the whole day."""
    if not value:
        return None
    try:
        d = datetime.strptime(value[:10], "%Y-%m-%d")
    except ValueError:
        raise HTTPException(422, f"Invalid date '{value}', expected YYYY-MM-DD")
    return d + timedelta(days=1) if end else d


def _filtered(db: Session, action, role, entity, entity_id, date_from, date_to):
    q = db.query(AuditLog)
    if action:
        q = q.filter(AuditLog.action == action)
    if role:
        q = q.filter(AuditLog.user_role == role)
    if entity:
        q = q.filter(AuditLog.entity == entity)
    if entity_id:
        q = q.filter(AuditLog.entity_id == str(entity_id))
    start = _parse_day(date_from)
    end = _parse_day(date_to, end=True)
    if start:
        q = q.filter(AuditLog.created_at >= start)
    if end:
        q = q.filter(AuditLog.created_at < end)
    return q.order_by(AuditLog.created_at.desc())


def _row(r: AuditLog) -> dict:
    return {"id": r.id, "user_id": r.user_id, "user_role": r.user_role, "action": r.action,
            "entity": r.entity, "entity_id": r.entity_id, "detail": r.detail,
            "ip": r.ip, "created_at": r.created_at}


@router.get("/filters")
def filter_options(db: Session = Depends(get_db), user: User = Depends(reader)):
    """Distinct values present in the log, so the UI never offers a dead filter."""
    actions = [a for (a,) in db.query(AuditLog.action).distinct().all() if a]
    roles = [r for (r,) in db.query(AuditLog.user_role).distinct().all() if r]
    entities = [e for (e,) in db.query(AuditLog.entity).distinct().all() if e]
    return {"actions": sorted(actions), "roles": sorted(roles), "entities": sorted(entities)}


@router.get("/export.csv")
def export_audit(action: str | None = None, role: str | None = None,
                 entity: str | None = None, entity_id: str | None = None,
                 date_from: str | None = None, date_to: str | None = None,
                 db: Session = Depends(get_db), user: User = Depends(reader)):
    q = _filtered(db, action, role, entity, entity_id, date_from, date_to)
    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow(["ID", "Timestamp", "Role", "User ID", "Action", "Entity", "Entity ID", "Detail", "IP"])
    count = 0
    for r in q.all():
        w.writerow([r.id, r.created_at.strftime("%Y-%m-%d %H:%M:%S") if r.created_at else "",
                    r.user_role, r.user_id or "", r.action, r.entity, r.entity_id, r.detail, r.ip])
        count += 1
    log(db, user=user, action="audit_exported", entity="audit", detail=f"{count} rows")
    filename = f"vigilanteye-audit-{datetime.utcnow().strftime('%Y%m%d')}.csv"
    return Response(content=buf.getvalue(), media_type="text/csv",
                    headers={"Content-Disposition": f'attachment; filename="{filename}"'})


@router.get("")
def audit_trail(limit: int = 200, offset: int = 0,
                action: str | None = None, role: str | None = None,
                entity: str | None = None, entity_id: str | None = None,
                date_from: str | None = None, date_to: str | None = None,
                response: Response = None,
                db: Session = Depends(get_db), user: User = Depends(reader)):
    """Filtered, paginated audit entries.

    The body stays a plain list for backward compatibility; the total row
    count for the current filter travels in the X-Total-Count header.
    """
    if limit < 1 or offset < 0:
        raise HTTPException(422, "limit must be >= 1 and offset >= 0")
    q = _filtered(db, action, role, entity, entity_id, date_from, date_to)
    total = q.count()
    rows = q.offset(offset).limit(min(limit, MAX_LIMIT)).all()
    if response is not None:
        response.headers["X-Total-Count"] = str(total)
    return [_row(r) for r in rows]
