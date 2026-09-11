import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from .database import Base, engine
from .config import settings
from .routers import auth, cases, alerts, dashboard, notifications, audit

Base.metadata.create_all(bind=engine)
os.makedirs(settings.EVIDENCE_DIR, exist_ok=True)

app = FastAPI(title="VigilantEye API", version="1.0.0",
              description="AI-Driven UFM Detection and Automated UFM Portal")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], allow_credentials=True,
    allow_methods=["*"], allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(cases.router)
app.include_router(alerts.router)
app.include_router(dashboard.router)
app.include_router(notifications.router)
app.include_router(audit.router)

app.mount("/evidence", StaticFiles(directory=settings.EVIDENCE_DIR), name="evidence")


@app.get("/api/health")
def health():
    return {"status": "ok", "service": "vigilanteye-backend"}
