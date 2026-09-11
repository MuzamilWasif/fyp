import asyncio
from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import User, Role, DetectionAlert
from ..schemas.schemas import AlertIn, AlertOut
from ..core.security import get_current_user, require_roles
from ..services.ws_manager import manager
from ..services.audit import log

router = APIRouter(prefix="/api/alerts", tags=["alerts"])


LABEL_WEIGHTS = {
    "mobile_phone": 0.95, "smart_watch": 0.85, "electronic_device": 0.85,
    "notes": 0.75, "notes_paper": 0.75, "paper_exchange": 0.8,
    "talking_communication": 0.6, "looking_around": 0.5,
}


@router.post("", response_model=AlertOut)
async def ingest_alert(payload: AlertIn, db: Session = Depends(get_db)):
    """Called by the detection engine when a UFM event is confirmed across frames.
    Severity = label weight x model confidence (suspicion score matrix)."""
    severity = round(LABEL_WEIGHTS.get(payload.label, 0.5) * payload.confidence, 3)
    alert = DetectionAlert(**payload.model_dump(), severity=severity)
    db.add(alert); db.commit(); db.refresh(alert)
    log(db, user=None, action="ai_alert", entity="alert", entity_id=alert.id,
        detail=f"{alert.label} cam={alert.camera_id} conf={alert.confidence:.2f}")
    await manager.broadcast({
        "type": "alert", "id": alert.id, "camera_id": alert.camera_id, "room": alert.room,
        "label": alert.label, "confidence": alert.confidence, "severity": alert.severity,
        "created_at": alert.created_at,
    })
    return alert


@router.get("", response_model=list[AlertOut])
def list_alerts(status: str | None = None, db: Session = Depends(get_db),
                user: User = Depends(require_roles(Role.INVIGILATOR, Role.HOD, Role.EXAM_DEPT))):
    q = db.query(DetectionAlert)
    if status:
        q = q.filter(DetectionAlert.status == status)
    return q.order_by(DetectionAlert.created_at.desc()).limit(200).all()


@router.post("/{alert_id}/{action}", response_model=AlertOut)
def act_on_alert(alert_id: int, action: str, db: Session = Depends(get_db),
                 user: User = Depends(require_roles(Role.INVIGILATOR, Role.HOD))):
    if action not in ("acknowledge", "dismiss"):
        raise HTTPException(400, "action must be acknowledge or dismiss")
    alert = db.query(DetectionAlert).get(alert_id)
    if not alert:
        raise HTTPException(404, "Alert not found")
    alert.status = "acknowledged" if action == "acknowledge" else "dismissed"
    db.commit(); db.refresh(alert)
    log(db, user=user, action=f"alert_{action}", entity="alert", entity_id=alert.id)
    return alert


@router.websocket("/ws")
async def alerts_ws(ws: WebSocket):
    await manager.connect(ws)
    try:
        while True:
            await ws.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(ws)
