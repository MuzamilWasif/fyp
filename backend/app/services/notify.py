import asyncio
from sqlalchemy.orm import Session
from ..models import Notification, User, Role
from ..config import settings
from .ws_manager import manager


def notify_roles(db: Session, roles, title: str, body: str = "", case_id=None):
    users = db.query(User).filter(User.role.in_(roles)).all()
    for u in users:
        db.add(Notification(user_id=u.id, title=title, body=body, case_id=case_id))
    db.commit()
    try:
        loop = asyncio.get_event_loop()
        loop.create_task(manager.broadcast({"type": "notification", "title": title, "body": body, "case_id": case_id}))
    except RuntimeError:
        pass


def notify_user(db: Session, user_id: int, title: str, body: str = "", case_id=None):
    db.add(Notification(user_id=user_id, title=title, body=body, case_id=case_id))
    db.commit()


async def send_email(to: str, subject: str, body: str):
    """Best-effort email. Silently skipped when SMTP is not configured."""
    if not settings.SMTP_HOST or not settings.SMTP_USER:
        return
    import aiosmtplib
    from email.message import EmailMessage
    msg = EmailMessage()
    msg["From"] = settings.SMTP_USER
    msg["To"] = to
    msg["Subject"] = subject
    msg.set_content(body)
    try:
        await aiosmtplib.send(
            msg, hostname=settings.SMTP_HOST, port=settings.SMTP_PORT,
            username=settings.SMTP_USER, password=settings.SMTP_PASSWORD, start_tls=True,
        )
    except Exception:
        pass
