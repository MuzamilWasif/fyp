# VigilantEye — AI-Driven UFM Detection and Automated UFM Portal

Final Year Project — Department of Computer Science, Air University Islamabad

**Team:** Muhammad Abdullah (232514) · Muhammad Talha (232950) · Muzamil Wasif (232430)
**Supervisor:** Dr. Muhammad Bilal Khan

VigilantEye is a smart examination monitoring and case management system. An AI surveillance engine (YOLOv8 + MediaPipe) watches live CCTV/IP camera feeds in exam halls, confirms suspicious activity across multiple frames to suppress false positives, captures an evidence clip, and raises a real-time alert. A web portal then carries every incident through the full institutional UFM lifecycle: invigilator case creation, HOD verification, DEC review, Examination Department result control, and UFM Committee final decision — with automated notifications, result holds, transcript blocking, and a tamper-evident audit trail.

## Repository structure

```
vigilanteye/
├── backend/          FastAPI + SQLAlchemy + PostgreSQL (JWT auth, RBAC, case workflow,
│                     evidence storage, notifications, audit trail, WebSocket alerts)
│   └── app/
│       ├── models/       Database models (users, cases, evidence, actions, audit, alerts)
│       ├── schemas/      Pydantic request/response schemas
│       ├── routers/      auth, cases, alerts, dashboard, notifications, audit
│       ├── services/     audit logger, notifications/email, WebSocket manager
│       ├── core/         JWT security and role-based access control
│       ├── main.py       App entry point
│       └── seed.py       Seeds one account per role
├── detection/        AI engine: YOLOv8 object detection, MediaPipe head-pose behavior
│                     analysis, multi-frame validation, rolling evidence-clip capture,
│                     RTSP/webcam/video-file input, alert POST to backend
├── frontend/         React 18 + Vite + Tailwind. Role-based dashboards for Invigilator,
│                     HOD, DEC, Examination Department, UFM Committee, and Student.
│                     Live alert feed over WebSocket, case management UI, audit viewer.
└── docker-compose.yml
```

## UFM case workflow

```
Invigilator submits case (result auto-held)
  → HOD approves (digital sign) or returns
  → DEC reviews and forwards
  → Examination Department (result hold / transcript block / forward)
  → UFM Committee records final decision + penalty
  → Examination Department releases result and closes case
```

Every step notifies the relevant roles in-portal (and by email when SMTP is configured), appends to the case history, and writes to the audit log.

## Quick start (local, no Docker)

Backend:
```bash
cd backend
python -m venv venv && source venv/bin/activate    # Windows: venv\Scripts\activate
pip install -r requirements.txt
python -m app.seed          # creates one login per role, password: password123
uvicorn app.main:app --reload
```
API runs at http://localhost:8000 (docs at /docs). Uses SQLite by default; set `DATABASE_URL` for PostgreSQL.

Frontend:
```bash
cd frontend
npm install
npm run dev
```
Open http://localhost:5173 and sign in with e.g. `invigilator@au.edu.pk` / `password123`.

Detection engine (needs a webcam, RTSP URL, or video file):
```bash
cd detection
pip install -r requirements.txt
# set the camera source: webcam index "0", an .mp4 path, or rtsp://...
CAM_SOURCE=0 python run.py
```
Confirmed detections appear on the Live Alerts page in real time; an invigilator can convert any alert into a UFM case with the evidence clip pre-attached.

## Quick start (Docker)

```bash
docker compose up --build
docker compose exec backend python -m app.seed
```

## Seed accounts (password: password123)

| Role | Email |
|---|---|
| Admin | admin@au.edu.pk |
| Invigilator | invigilator@au.edu.pk |
| HOD | hod@au.edu.pk |
| DEC | dec@au.edu.pk |
| Examination Dept | examdept@au.edu.pk |
| UFM Committee | committee@au.edu.pk |
| Student | student@au.edu.pk |

## Feature highlights

- **AI surveillance**: YOLOv8 + MediaPipe with multi-frame repeated-error validation, per-camera cooldowns, and a suspicion score matrix (label weight x confidence) on every alert.
- **Live monitoring**: annotated MJPEG feeds from the detection engine rendered in the portal, with an unhandled-alerts panel and real-time toasts over WebSocket.
- **One-click alert → case**: converting an AI alert pre-fills the case form and attaches the evidence clip automatically.
- **Seat-plan auto-fill**: Exam Dept uploads a per-exam seat CSV; invigilators resolve the student from exam + seat, or from reg no.
- **Full institutional workflow**: Invigilator → HOD (digital sign) → DEC → Examination Department (result hold / transcript block) → UFM Committee decision + penalty → release and close, with per-role permissions enforced server-side.
- **Governance**: tamper-evident audit trail of every action, complete case history, printable case report, portal + email notifications at every stage.
- **Administration**: halls, cameras, exams, seat plans, and user management with account activation control.
- **Quality**: end-to-end API tests for auth, RBAC, and the whole case lifecycle; GitHub Actions CI for backend tests, frontend build, and detection syntax.

See `docs/ARCHITECTURE.md` for the system diagram, alert lifecycle, and role permission matrix. A sample seat plan CSV is in `docs/seat_plan_sample.csv`.

## Tech stack

React.js + Tailwind CSS · FastAPI · PostgreSQL (SQLite for dev) · SQLAlchemy · JWT · WebSocket · YOLOv8 (Ultralytics) · MediaPipe · OpenCV · RTSP · Docker

## Notes for development

- The detector currently maps COCO classes (cell phone, book, laptop) to UFM labels; replace `yolov8n.pt` with your fine-tuned exam-hall model and update `detection/config.py` `UFM_CLASSES`.
- False-positive suppression: an object must persist across `CONFIRM_FRAMES` detections within `CONFIRM_WINDOW_SEC` before an alert fires, with a per-camera cooldown.
- Evidence clips are written to `evidence_store/` and served by the backend at `/evidence/<filename>`.
- SMTP email is optional; configure it in `.env` to enable email notifications alongside portal notifications.
