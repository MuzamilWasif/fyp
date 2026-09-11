"""Vercel serverless entry point: exposes the FastAPI backend as /api/* on the same
domain as the frontend. Seeds demo accounts on cold start if the DB is empty."""
import os, sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))
os.environ.setdefault("EVIDENCE_DIR", "/tmp/evidence_store")

from app.main import app  # noqa: E402  (Vercel detects the ASGI `app`)

try:
    from app.database import SessionLocal
    from app.models import User
    db = SessionLocal()
    empty = db.query(User).first() is None
    db.close()
    if empty:
        from app.seed import run
        run()
except Exception:
    pass
