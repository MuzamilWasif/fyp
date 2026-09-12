from datetime import datetime, timedelta
from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import User, Role, UFMCase, CaseStatus, DetectionAlert
from ..core.security import get_current_user
from ..services.scoping import scope_cases, scope_label, pending_statuses

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])

CLOSED_STATES = [CaseStatus.DECIDED, CaseStatus.CLOSED]


def _month_start(dt: datetime) -> datetime:
    return dt.replace(day=1, hour=0, minute=0, second=0, microsecond=0)


def _prev_month_start(dt: datetime) -> datetime:
    first = _month_start(dt)
    return _month_start(first - timedelta(days=1))


def _last_12_month_keys(now: datetime):
    """Exact calendar months, newest last — no 30-day drift."""
    keys = []
    y, m = now.year, now.month
    for _ in range(12):
        keys.append(f"{y:04d}-{m:02d}")
        m -= 1
        if m == 0:
            m, y = 12, y - 1
    return list(reversed(keys))


@router.get("/stats")
def stats(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """Role-scoped dashboard aggregates.

    Every figure covers exactly the cases this user may see, so the dashboard
    and the cases list can never disagree. All original keys are preserved;
    newer clients additionally read `deltas`, `action_required` and `scope`.
    """
    base = lambda: scope_cases(db.query(UFMCase), user)  # noqa: E731

    total = base().count()
    open_cases = base().filter(UFMCase.status.notin_(CLOSED_STATES)).count()
    decided = base().filter(UFMCase.status == CaseStatus.DECIDED).count()
    holds = base().filter(UFMCase.result_hold == True).count()  # noqa: E712
    transcript_blocks = base().filter(UFMCase.transcript_blocked == True).count()  # noqa: E712

    # AI alerts are hall-level, not case-level: students never see them.
    alerts_new = 0
    if user.role != Role.STUDENT:
        alerts_new = db.query(DetectionAlert).filter(DetectionAlert.status == "new").count()

    pending = pending_statuses(user)
    action_required = base().filter(UFMCase.status.in_(pending)).count() if pending else 0

    by_status = dict(base().with_entities(UFMCase.status, func.count(UFMCase.id))
                     .group_by(UFMCase.status).all())
    by_dept = dict(base().with_entities(UFMCase.student_department, func.count(UFMCase.id))
                   .group_by(UFMCase.student_department).all())
    by_violation = dict(base().with_entities(UFMCase.violation_type, func.count(UFMCase.id))
                        .group_by(UFMCase.violation_type).all())

    now = datetime.utcnow()
    trend = {key: 0 for key in _last_12_month_keys(now)}
    for (created,) in base().with_entities(UFMCase.created_at).all():
        if created is None:
            continue
        key = created.strftime("%Y-%m")
        if key in trend:
            trend[key] += 1

    this_month = _month_start(now)
    prev_month = _prev_month_start(now)
    created_this = base().filter(UFMCase.created_at >= this_month).count()
    created_prev = base().filter(UFMCase.created_at >= prev_month,
                                 UFMCase.created_at < this_month).count()
    decided_this = base().filter(UFMCase.status == CaseStatus.DECIDED,
                                 UFMCase.updated_at >= this_month).count()
    decided_prev = base().filter(UFMCase.status == CaseStatus.DECIDED,
                                 UFMCase.updated_at >= prev_month,
                                 UFMCase.updated_at < this_month).count()

    return {
        "monthly_trend": trend,
        "total_cases": total,
        "open_cases": open_cases,
        "decided_cases": decided,
        "result_holds": holds,
        "transcript_blocks": transcript_blocks,
        "new_alerts": alerts_new,
        "action_required": action_required,
        "scope": scope_label(user),
        "this_month": {"created": created_this, "decided": decided_this},
        "last_month": {"created": created_prev, "decided": decided_prev},
        "deltas": {
            "total_cases": created_this - created_prev,
            "decided_cases": decided_this - decided_prev,
        },
        "by_status": {(k.value if hasattr(k, "value") else k): v for k, v in by_status.items()},
        "by_department": by_dept,
        "by_violation": by_violation,
    }


# ---------------------------------------------------------------------------
# Examination Department analytics
# ---------------------------------------------------------------------------

def _semester_of(case: UFMCase) -> str:
    """Derive the academic semester from the examination date.

    The case record has no semester column and adding one would require a
    migration against the live database, so it is derived here: January-June
    is Spring, July-December is Fall, falling back to the reporting date when
    the exam date was left blank.
    """
    raw = (case.exam_date or "")[:10]
    dt = None
    if raw:
        for fmt in ("%Y-%m-%d", "%d-%m-%Y", "%d/%m/%Y"):
            try:
                dt = datetime.strptime(raw, fmt)
                break
            except ValueError:
                continue
    if dt is None:
        dt = case.created_at or datetime.utcnow()
    return f"{'Spring' if dt.month <= 6 else 'Fall'} {dt.year}"


@router.get("/analytics")
def analytics(semester: str | None = None, department: str | None = None,
              db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """Semester- and department-wise breakdowns for the Examination Department.

    Scoped exactly like every other view, so a HOD calling it sees their own
    department and nothing more.
    """
    cases = scope_cases(db.query(UFMCase), user).all()

    enriched = [(c, _semester_of(c)) for c in cases]
    semesters = sorted({s for _, s in enriched}, key=_semester_sort_key, reverse=True)
    departments = sorted({c.student_department for c in cases if c.student_department})

    if semester:
        enriched = [(c, s) for c, s in enriched if s == semester]
    if department:
        enriched = [(c, s) for c, s in enriched if c.student_department == department]

    selected = [c for c, _ in enriched]
    decided = [c for c in selected if c.status in (CaseStatus.DECIDED, CaseStatus.CLOSED)]

    def tally(pairs):
        out = {}
        for key in pairs:
            if key in (None, ""):
                key = "Unspecified"
            out[key] = out.get(key, 0) + 1
        return out

    by_semester = tally([s for _, s in enriched])
    by_department = tally([c.student_department for c in selected])
    by_violation = tally([c.violation_type for c in selected])
    by_status = tally([c.status.value if hasattr(c.status, "value") else c.status for c in selected])
    by_penalty = tally([c.penalty for c in decided if c.penalty])
    by_source = tally([c.source for c in selected])

    # semester x department matrix, for the cross-tab table
    matrix = {}
    for c, s in enriched:
        dept = c.student_department or "Unspecified"
        matrix.setdefault(s, {})
        matrix[s][dept] = matrix[s].get(dept, 0) + 1

    return {
        "scope": scope_label(user),
        "filters": {"semesters": semesters, "departments": departments,
                    "semester": semester, "department": department},
        "totals": {
            "cases": len(selected),
            "decided": len(decided),
            "result_holds": sum(1 for c in selected if c.result_hold),
            "transcript_blocks": sum(1 for c in selected if c.transcript_blocked),
            "ai_detected": sum(1 for c in selected if c.source == "ai"),
        },
        "by_semester": by_semester,
        "by_department": by_department,
        "by_violation": by_violation,
        "by_status": by_status,
        "by_penalty": by_penalty,
        "by_source": by_source,
        "matrix": matrix,
    }


def _semester_sort_key(label: str):
    """'Fall 2026' sorts after 'Spring 2026'."""
    try:
        term, year = label.split(" ")
        return (int(year), 1 if term == "Fall" else 0)
    except (ValueError, AttributeError):
        return (0, 0)
