"""Shared visibility rules.

Every list/aggregate endpoint runs through `scope_cases` so a role can never
see more through one screen than another. Kept in one place on purpose: the
dashboard totals and the cases list must always agree.
"""
from ..models import Role, UFMCase, CaseStatus

# Statuses that are actively waiting on each role — drives the
# "needs your action" queue and the action_required counter.
PENDING_FOR_ROLE = {
    Role.HOD: [CaseStatus.SUBMITTED],
    Role.DEC: [CaseStatus.HOD_APPROVED],
    Role.EXAM_DEPT: [CaseStatus.DEC_FORWARDED, CaseStatus.DECIDED],
    Role.UFM_COMMITTEE: [CaseStatus.EXAM_DEPT_FORWARDED, CaseStatus.UNDER_COMMITTEE_REVIEW],
    Role.INVIGILATOR: [CaseStatus.HOD_RETURNED],
    Role.ADMIN: [CaseStatus.SUBMITTED, CaseStatus.HOD_APPROVED, CaseStatus.DEC_FORWARDED,
                 CaseStatus.EXAM_DEPT_FORWARDED, CaseStatus.UNDER_COMMITTEE_REVIEW],
    Role.STUDENT: [],
}


def scope_cases(query, user):
    """Restrict a UFMCase query to what `user` is allowed to see."""
    if user.role == Role.STUDENT:
        return query.filter((UFMCase.student_id == user.id) | (UFMCase.student_reg_no == user.reg_no))
    if user.role == Role.INVIGILATOR:
        return query.filter(UFMCase.created_by == user.id)
    if user.role in (Role.HOD, Role.DEC) and user.department:
        return query.filter(UFMCase.student_department == user.department)
    return query


def scope_label(user) -> str:
    """Human-readable description of what the numbers cover."""
    if user.role == Role.STUDENT:
        return "own"
    if user.role == Role.INVIGILATOR:
        return "reported_by_me"
    if user.role in (Role.HOD, Role.DEC) and user.department:
        return f"department:{user.department}"
    return "institution"


def pending_statuses(user):
    return PENDING_FOR_ROLE.get(user.role, [])
