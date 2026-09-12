import os
from fastapi import FastAPI, Request
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from .database import Base, engine
from .config import settings
from .routers import auth, cases, alerts, dashboard, notifications, audit, admin, lookup

try:
    Base.metadata.create_all(bind=engine)
except Exception as e:
    print(f"[db] create_all skipped: {type(e).__name__}: {e}")

try:
    os.makedirs(settings.EVIDENCE_DIR, exist_ok=True)
except OSError:
    # read-only filesystem (serverless) - fall back to /tmp
    settings.EVIDENCE_DIR = "/tmp/evidence_store"
    os.makedirs(settings.EVIDENCE_DIR, exist_ok=True)

app = FastAPI(title="VigilantEye API", version="1.0.0",
              description="AI-Driven UFM Detection and Automated UFM Portal")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], allow_credentials=True,
    allow_methods=["*"], allow_headers=["*"],
    # pagination totals travel in headers so list responses keep their shape
    expose_headers=["X-Total-Count", "X-Unread-Count", "Content-Disposition"],
)


@app.exception_handler(RequestValidationError)
async def validation_error_handler(request: Request, exc: RequestValidationError):
    """Give validation failures the same {"detail": "<sentence>"} shape as every
    other error, so clients never have to branch on the error format."""
    first = (exc.errors() or [{}])[0]
    field = ".".join(str(p) for p in first.get("loc", []) if p not in ("body", "query"))
    message = first.get("msg", "Invalid request")
    return JSONResponse(
        status_code=422,
        content={"detail": f"{field}: {message}" if field else message,
                 "errors": jsonable_encoder(exc.errors())},
    )

app.include_router(auth.router)
app.include_router(cases.router)
app.include_router(alerts.router)
app.include_router(dashboard.router)
app.include_router(notifications.router)
app.include_router(audit.router)
app.include_router(admin.router)
app.include_router(lookup.router)

app.mount("/evidence", StaticFiles(directory=settings.EVIDENCE_DIR), name="evidence")


def _auto_seed():
    try:
        from .database import SessionLocal
        from .models import User
        db = SessionLocal()
        empty = db.query(User).first() is None
        db.close()
        if empty:
            from .seed import run
            run()
    except Exception as e:
        print(f"[seed] skipped: {type(e).__name__}: {e}")


_auto_seed()  # runs at import time so it works on serverless too


@app.get("/api/health")
def health():
    info = {"status": "ok", "service": "vigilanteye-backend"}
    try:
        from .database import SessionLocal
        from .models import User
        db = SessionLocal()
        info["users"] = db.query(User).count()
        db.close()
    except Exception as e:
        info["db_error"] = type(e).__name__
    return info
