# VigilantEye — AI-Driven UFM Detection and Automated UFM Portal

Final Year Project — Department of Computer Science, Air University Islamabad

**Team:** Muhammad Abdullah (232514) · Muhammad Talha (232950) · Muzamil Wasif (232430)
**Supervisor:** Dr. Muhammad Bilal Khan

VigilantEye is a smart examination monitoring and case management system. An AI surveillance engine (YOLOv8 + MediaPipe) watches live CCTV/IP camera feeds in exam halls, confirms suspicious activity across multiple frames to suppress false positives, captures an evidence clip, and raises a real-time alert. A web portal then carries every incident through the full institutional UFM lifecycle: invigilator case creation, HOD verification, DEC review, Examination Department result control, and UFM Committee final decision — with automated notifications, result holds, transcript blocking, and a tamper-evident audit trail.

## Screenshots

> Placeholders — drop your own captures into `docs/screenshots/` using the file names
> below and they will render here. See `docs/screenshots/README.md` for capture settings.

| Screen | File | Shows |
|---|---|---|
| Sign in | `docs/screenshots/01-login.png` | Two-panel sign-in with one-click demo accounts |
| Invigilator dashboard | `docs/screenshots/02-dashboard-invigilator.png` | Stat cards, returned-to-me queue, live alert count |
| HOD dashboard | `docs/screenshots/03-dashboard-hod.png` | "Needs your action" queue of cases awaiting verification |
| Student dashboard | `docs/screenshots/04-dashboard-student.png` | Per-case lifecycle tracker across all six stages |
| Cases list | `docs/screenshots/05-cases.png` | Search, filters, sortable table, status and flag badges |
| Case detail | `docs/screenshots/06-case-detail.png` | Evidence gallery, workflow timeline, role action panel |
| Committee view | `docs/screenshots/07-case-committee.png` | Student UFM history and the penalty decision card |
| Printed report | `docs/screenshots/08-print-report.png` | A4 official report with proceedings and signatures |
| Report UFM | `docs/screenshots/09-new-case.png` | Clickable seat map auto-filling the student |
| Live alerts | `docs/screenshots/10-alerts.png` | Severity-ranked AI detections and alert-to-case flow |
| Live monitoring | `docs/screenshots/11-monitoring.png` | Annotated camera wall with live/offline status |
| Analytics | `docs/screenshots/12-analytics.png` | Semester x department cross-tab and CSV export |
| Audit trail | `docs/screenshots/13-audit.png` | Filterable, exportable append-only log |
| Mobile | `docs/screenshots/14-mobile.png` | Bottom navigation at 375px |

## Repository structure

```
vigilanteye/
├── backend/          FastAPI + SQLAlchemy + PostgreSQL (JWT auth, RBAC, case workflow,
│                     evidence storage, notifications, audit trail, WebSocket alerts)
│   └── app/
│       ├── models/       Database models (users, cases, evidence, actions, audit, alerts)
│       ├── schemas/      Pydantic request/response schemas
│       ├── routers/      auth, cases, alerts, dashboard, notifications, audit,
│       │                 admin, lookup
│       ├── services/     audit logger, notifications/email, WebSocket manager,
│       │                 role scoping rules
│       ├── core/         JWT security and role-based access control
│       ├── main.py       App entry point
│       └── seed.py       Seeds accounts, halls, cameras, exams, seat plan
│                         and a twelve-month demo case load
├── detection/        AI engine: YOLOv8 object detection, MediaPipe head-pose behavior
│                     analysis, multi-frame validation, rolling evidence-clip capture,
│                     RTSP/webcam/video-file input, alert POST to backend
├── frontend/         React 18 + Vite + Tailwind + recharts + lucide-react
│   └── src/
│       ├── components/ui/  Design-system primitives (Button, Card, DataTable,
│       │                   Modal, Timeline, StatCard, Lightbox, …)
│       ├── components/     App shell (sidebar, topbar, mobile nav), charts,
│       │                   seat map, case progress tracker, printed report
│       ├── lib/            api client, auth, toast context, formatters, nav map
│       └── pages/          One page per route (see docs/ARCHITECTURE.md)
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
- **Role-specific dashboards**: every role lands on the four figures its job needs, a
  monthly trend chart, status/violation/department breakdowns, and a "needs your action"
  queue holding exactly the cases at that role's stage.
- **Student voice**: students track their case through the six official stages and can
  submit a written explanation that the committee sees on the timeline.
- **Committee tools**: the student's full prior UFM record (with a repeat-offender
  warning) alongside a standard penalty list and free-text conditions.
- **Governance**: tamper-evident audit trail filterable by action, role, entity and date
  range with CSV export; complete case history; an A4 official printed report with
  proceedings and a signatures block; portal + email notifications at every stage.
- **Analytics**: semester- and department-wise breakdowns, a semester x department
  cross-tab, penalty and detection-source splits, and a role-scoped cases CSV export.
- **Administration**: halls, cameras, exams, seat plans (previewable as a hall map), and
  user management with account activation control.
- **Interface**: a documented dark design system (near-black surfaces, lime accent, Sora),
  collapsible sidebar with a mobile bottom nav down to 375px, skeleton loading states,
  toasts on every mutation, inline form validation, keyboard-accessible dialogs and
  menus, and a global reduced-motion setting.
- **Quality**: 32 end-to-end API tests covering auth, RBAC and permission denials, the
  whole case lifecycle, pagination, exports and analytics scoping; GitHub Actions CI for
  backend tests, frontend build, and detection syntax.

See `docs/ARCHITECTURE.md` for the system diagram, alert lifecycle, and role permission matrix. A sample seat plan CSV is in `docs/seat_plan_sample.csv`.

## Tech stack

React 18 + Vite + Tailwind CSS + recharts + lucide-react · FastAPI · PostgreSQL (SQLite for dev) · SQLAlchemy · JWT · WebSocket (on-premises) · YOLOv8 (Ultralytics) · MediaPipe · OpenCV · RTSP · Docker · Vercel

## Notes for development

- The detector currently maps COCO classes (cell phone, book, laptop) to UFM labels; replace `yolov8n.pt` with your fine-tuned exam-hall model and update `detection/config.py` `UFM_CLASSES`.
- False-positive suppression: an object must persist across `CONFIRM_FRAMES` detections within `CONFIRM_WINDOW_SEC` before an alert fires, with a per-camera cooldown.
- Evidence clips are written to `evidence_store/` and served by the backend at `/evidence/<filename>`.
- SMTP email is optional; configure it in `.env` to enable email notifications alongside portal notifications.

## Deployment notes

The portal is deployed on Vercel: the Vite frontend as a static build and the FastAPI app
as a serverless function mounted at `/api`, with Neon PostgreSQL behind it.

- **No WebSockets in production.** Vercel's serverless runtime cannot hold a socket open.
  The live-alert socket is used for on-premises deployments only; it fails silently in
  production and every consumer (notification bell, Live Alerts, Live Monitoring) polls
  on an interval instead, so nothing depends on it.
- **List endpoints stay plain arrays.** Pagination totals travel in the `X-Total-Count`
  header rather than an envelope, so older clients keep working.
- **Auto-seeding.** If the database is empty at import time the app seeds accounts,
  institution setup and a demo case load, so a fresh deployment is never a blank screen.
- **No schema migrations.** `Base.metadata.create_all` creates missing tables but cannot
  add columns to an existing one, so features are built without new columns — the
  academic semester, for example, is derived from each case's examination date.
