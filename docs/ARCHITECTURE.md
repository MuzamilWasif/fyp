# VigilantEye Architecture

## System overview

```
 CCTV / IP cameras (RTSP)  ──►  Detection Engine (Python)
                                  ├─ YOLOv8 object detection
                                  ├─ MediaPipe head-pose behavior analysis
                                  ├─ multi-frame validation (false-positive suppression)
                                  ├─ rolling-buffer evidence clip capture
                                  ├─ MJPEG stream server :8090 (annotated live feeds)
                                  └─ POST /api/alerts ─────────►┐
                                                                │
 Browser (React portal) ◄── WebSocket /api/alerts/ws ◄── FastAPI Backend :8000
        │                                                       │
        └── REST (JWT) ────────────────────────────────────────►│
                                                                ▼
                                                          PostgreSQL
                                              (users, cases, evidence, seat plans,
                                               notifications, tamper-evident audit log)
```

## Alert lifecycle

1. Detector sees a UFM-relevant object; the sighting enters a per-camera/per-label history.
2. Only when the label persists across CONFIRM_FRAMES within CONFIRM_WINDOW_SEC does an
   alert fire (with a per-camera cooldown). This is the repeated-error validation from the
   scope document.
3. The rolling buffer for that camera is flushed to an evidence clip (last ~12 seconds).
4. The backend scores severity = label weight x model confidence (suspicion score matrix),
   stores the alert, and broadcasts it over WebSocket. It appears instantly as a toast and
   on Live Alerts / Live Monitoring.
5. An invigilator acknowledges, dismisses, or converts the alert to a UFM case; the
   evidence clip is attached automatically and the alert is linked to the case.

## Case workflow state machine

```
submitted ──HOD approve──► hod_approved ──DEC forward──► dec_forwarded
    │                                                        │
    └──HOD return──► hod_returned              Exam Dept forward
                                                             ▼
      closed ◄──Exam Dept close── decided ◄──Committee── exam_dept_forwarded
```

Side effects: case creation auto-holds the student's result; Exam Dept can hold/release
results and block/unblock transcripts at any stage; the UFM Committee records the final
decision and penalty. Every transition appends a CaseAction (visible case history) and an
AuditLog row (compliance trail), and notifies the roles responsible for the next step.

## Role permission matrix (case actions)

| Action | Invigilator | HOD | DEC | Exam Dept | Committee |
|---|---|---|---|---|---|
| create case | ✓ | | | | |
| approve / return | | ✓ | ✓ (return) | | |
| forward | | | ✓ | ✓ | |
| hold / release result | | | | ✓ | |
| block / unblock transcript | | | | ✓ | |
| final decision + penalty | | | | | ✓ |
| close | | | | ✓ | |
| upload evidence | ✓ | ✓ | | ✓ | |
| add note | ✓ | ✓ | ✓ | ✓ | ✓ |

Students see only their own cases and receive notifications at each stage.

## Auto-fill pipeline

Exam Dept uploads a seat plan CSV per exam (seat, reg no, name, department). When an
invigilator reports a case, selecting the exam + seat resolves the student from the seat
plan; entering a reg no alone resolves from registered student accounts or any seat plan.

## Frontend architecture

### Routes and pages

| Route | Page | Roles | Purpose |
|---|---|---|---|
| `/login` | `Login` | public | Two-panel sign-in, inline validation, one-click demo accounts |
| `/` | `Dashboard` | all | Role-specific figures, monthly trend, breakdowns, and the "needs your action" queue (students get a per-case lifecycle tracker instead) |
| `/cases` | `Cases` | all | Search, status/violation/department/date filters, sortable table on desktop and cards on mobile, plus a "Needs my action" tab |
| `/cases/new` | `NewCase` | invigilator, admin | Clickable seat map auto-fill, sectioned form, evidence attachment, digital-signature declaration |
| `/cases/:id` | `CaseDetail` | all (scoped) | Two-column case record: violation, student, evidence gallery with lightbox and prior UFM history on the left; decision card, role action panel and the workflow timeline on the right |
| `/alerts` | `Alerts` | invigilator, HOD, exam dept, admin | Severity-ranked AI detections, acknowledge/dismiss, alert-to-case conversion |
| `/monitoring` | `LiveMonitoring` | invigilator, HOD, exam dept, admin | Annotated camera wall with live/offline badges and an unhandled-alert rail |
| `/analytics` | `Analytics` | exam dept, committee, admin | Semester x department cross-tab, penalty and detection-source splits, cases CSV export |
| `/setup` | `Setup` | exam dept, admin | Halls, cameras, examinations, seat-plan upload and hall-map preview |
| `/audit` | `Audit` | exam dept, committee, admin | Filterable append-only log with CSV export and pagination |
| `/users` | `Users` | admin | Account creation, role filter, enable/disable |
| `/profile` | `Profile` | all | Role, department and password change |
| `*` | `NotFound` | all | 404, also shown when a role is not permitted a route |

Authenticated routes render inside `AppShell` (collapsible icon sidebar, sticky topbar
with breadcrumb, notification bell and user menu, mobile drawer plus bottom navigation).
Each route is wrapped in an `ErrorBoundary` keyed by path, so one failing screen never
blanks the application.

### Design system

Tokens live in `frontend/tailwind.config.js` and the component layer in
`frontend/src/index.css`.

- **Surfaces** `#0a0a0a` canvas, `#141414` panels, `#1a1a1a` inputs, `#212121` menus.
- **Elevation** hairline `#262626` borders plus three shadow tiers — never glows.
- **Accent** lime `#a3e635` with hover/press/soft variants; semantic ok/warn/danger/info
  each with a 12% soft fill.
- **Radii** 16px cards, 12px controls, full-round badges. **Type** Sora, 14px body.
- **Motion** 150/200ms on a single easing curve, with a global `prefers-reduced-motion`
  kill switch.
- **Severity** one helper maps a suspicion score to its colour: >= 0.70 critical (red),
  >= 0.50 elevated (amber), otherwise low — so alerts, monitoring and case badges can
  never disagree.

Reusable primitives are in `frontend/src/components/ui`: `Button`, `Card`, `Field`
(`Input`/`Textarea`/`Select`), `Badge`/`StatusBadge`/`SeverityBadge`, the `Skeleton` set,
`EmptyState`, `Modal` (focus-trapped, Esc to close), `ConfirmDialog`, `StatCard`,
`DataTable`, `Timeline`, `Lightbox`, `Tabs`, `Tooltip`, `PageHeader` and `Pagination`.

### Printed report

`CasePrintReport` renders an A4 university document that is hidden on screen and is the
only thing that reaches the printer: letterhead, case number, student and examination
particulars, violation, evidence register, numbered proceedings, the decision and penalty,
and a five-way signatures block. The print stylesheet resets the application's dark
`color-scheme` and strips the shell's canvas, which would otherwise print as a black page.

## Visibility rules

`backend/app/services/scoping.py` is the single source of truth for who sees what, and
every list and aggregate endpoint runs through it — so the dashboard totals, the cases
list, the exports and the analytics can never disagree.

| Role | Sees |
|---|---|
| Student | Only cases matching their own id or registration number; no hall-level alert data |
| Invigilator | Only the cases they reported |
| HOD / DEC | Cases in their own department |
| Exam Dept / Committee / Admin | The whole institution |

The same module defines which statuses are waiting on each role, which drives both the
`action_required` counter and `GET /api/cases?pending=true`.

## API reference

Errors always take the shape `{"detail": "<sentence>"}`; validation failures add a
machine-readable `errors` array alongside it.

### Auth
| Method | Path | Roles | Notes |
|---|---|---|---|
| POST | `/api/auth/login` | public | OAuth2 password form, returns JWT + user |
| POST | `/api/auth/register` | admin | Create an account |
| GET | `/api/auth/me` | any | Current user |
| POST | `/api/auth/change-password` | any | Minimum 8 characters |

### Cases
| Method | Path | Roles | Notes |
|---|---|---|---|
| GET | `/api/cases` | any | Scoped; `status`, `pending`, `limit`, `offset`; total in `X-Total-Count` |
| POST | `/api/cases` | invigilator | Auto-holds the result, notifies HOD and Exam Dept |
| GET | `/api/cases/export.csv` | any | Role-scoped CSV, logged to the audit trail |
| GET | `/api/cases/{id}` | any (scoped) | Full case with evidence and actions |
| POST | `/api/cases/{id}/evidence` | invigilator, HOD, exam dept | Multipart upload |
| POST | `/api/cases/{id}/transition` | per matrix above | Workflow action |
| POST | `/api/cases/{id}/student-response` | student | Own open case only; the only student write |
| GET | `/api/cases/{id}/student-history` | HOD, DEC, exam dept, committee | Prior cases for the same registration number |

### Dashboard, alerts, notifications, audit
| Method | Path | Roles | Notes |
|---|---|---|---|
| GET | `/api/dashboard/stats` | any | Scoped totals, month-over-month deltas, `action_required` |
| GET | `/api/dashboard/analytics` | any (scoped) | Semester/department breakdowns and cross-tab |
| POST | `/api/alerts` | detection engine | Severity = label weight x confidence |
| GET | `/api/alerts` | invigilator, HOD, exam dept | Optional `status` filter |
| POST | `/api/alerts/{id}/{acknowledge\|dismiss}` | invigilator, HOD | |
| GET | `/api/notifications` | any | Paginated; `X-Total-Count`, `X-Unread-Count` |
| GET | `/api/notifications/unread-count` | any | Badge poll target |
| POST | `/api/notifications/read-all` | any | Bulk mark read |
| GET | `/api/audit` | exam dept, committee, admin | Filter by action, role, entity, date range |
| GET | `/api/audit/filters` | exam dept, committee, admin | Values actually present in the log |
| GET | `/api/audit/export.csv` | exam dept, committee, admin | CSV of the current filter |

### Administration and lookup
| Method | Path | Roles | Notes |
|---|---|---|---|
| GET/POST/DELETE | `/api/admin/halls`, `/api/admin/cameras`, `/api/admin/exams` | exam dept, admin | Reads also open to invigilator/HOD for cameras and exams |
| POST | `/api/admin/exams/{id}/seats/upload` | exam dept, admin | CSV: seat, student_reg_no, student_name, department |
| GET | `/api/admin/exams/{id}/seats` | staff | Drives the clickable seat map |
| GET | `/api/admin/users`, POST `/api/admin/users/{id}/toggle` | admin | |
| GET | `/api/lookup/seat`, `/api/lookup/student` | staff | Auto-fill helpers |

## Serverless constraints

The production deployment is Vercel (static frontend + FastAPI serverless function at
`/api`) with Neon PostgreSQL. Three consequences shape the design:

1. **No WebSockets.** The alert socket is for on-premises deployments; in production it
   never opens and fails silently, and every consumer polls instead.
2. **No schema migrations.** `create_all` adds missing tables but not columns, so features
   avoid new columns — the academic semester is derived from the examination date.
3. **Read-only filesystem.** Evidence falls back to `/tmp` when the evidence directory
   cannot be created; the app also seeds itself at import time when the database is empty.
