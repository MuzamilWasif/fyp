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
