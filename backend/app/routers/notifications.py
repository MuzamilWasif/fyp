from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import User, Notification
from ..schemas.schemas import NotificationOut
from ..core.security import get_current_user

router = APIRouter(prefix="/api/notifications", tags=["notifications"])

MAX_LIMIT = 200


@router.get("", response_model=list[NotificationOut])
def my_notifications(limit: int = 100, offset: int = 0, unread_only: bool = False,
                     response: Response = None,
                     db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """Newest first. Totals travel in headers so the list shape stays unchanged."""
    if limit < 1 or offset < 0:
        raise HTTPException(422, "limit must be >= 1 and offset >= 0")
    q = db.query(Notification).filter(Notification.user_id == user.id)
    if unread_only:
        q = q.filter(Notification.is_read == False)  # noqa: E712
    total = q.count()
    unread = (db.query(Notification)
              .filter(Notification.user_id == user.id, Notification.is_read == False)  # noqa: E712
              .count())
    rows = (q.order_by(Notification.created_at.desc())
            .offset(offset).limit(min(limit, MAX_LIMIT)).all())
    if response is not None:
        response.headers["X-Total-Count"] = str(total)
        response.headers["X-Unread-Count"] = str(unread)
    return rows


@router.get("/unread-count")
def unread_count(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """Cheap poll target for the topbar badge."""
    count = (db.query(Notification)
             .filter(Notification.user_id == user.id, Notification.is_read == False)  # noqa: E712
             .count())
    return {"unread": count}


@router.post("/read-all")
def mark_all_read(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """Marks every unread notification for this user as read in one request."""
    updated = (db.query(Notification)
               .filter(Notification.user_id == user.id, Notification.is_read == False)  # noqa: E712
               .update({Notification.is_read: True}, synchronize_session=False))
    db.commit()
    return {"updated": updated}


@router.post("/{notif_id}/read", response_model=NotificationOut)
def mark_read(notif_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    n = (db.query(Notification)
         .filter(Notification.id == notif_id, Notification.user_id == user.id).first())
    if not n:
        raise HTTPException(404, "Notification not found")
    if not n.is_read:
        n.is_read = True
        db.commit()
    db.refresh(n)
    return n
