/** Shared label, tone and formatting helpers so no two screens disagree. */

export const ROLE_LABELS = {
  admin: 'Administrator',
  invigilator: 'Invigilator',
  hod: 'Head of Department',
  dec: 'Departmental Examination Committee',
  exam_dept: 'Examination Department',
  ufm_committee: 'UFM Committee',
  student: 'Student'
}

export const ROLE_SHORT = {
  admin: 'Admin', invigilator: 'Invigilator', hod: 'HOD', dec: 'DEC',
  exam_dept: 'Exam Dept', ufm_committee: 'UFM Committee', student: 'Student'
}

export const STATUS_LABELS = {
  draft: 'Draft',
  submitted: 'Submitted',
  hod_approved: 'HOD approved',
  hod_returned: 'Returned by HOD',
  dec_forwarded: 'Forwarded by DEC',
  exam_dept_forwarded: 'With UFM Committee',
  under_committee_review: 'Under committee review',
  decided: 'Decided',
  closed: 'Closed'
}

/** badge class per case status */
export const STATUS_TONE = {
  draft: 'badge-neutral',
  submitted: 'badge-warn',
  hod_approved: 'badge-info',
  hod_returned: 'badge-danger',
  dec_forwarded: 'badge-info',
  exam_dept_forwarded: 'badge-brand',
  under_committee_review: 'badge-brand',
  decided: 'badge-ok',
  closed: 'badge-neutral'
}

export const ALL_STATUSES = [
  'submitted', 'hod_approved', 'hod_returned', 'dec_forwarded',
  'exam_dept_forwarded', 'under_committee_review', 'decided', 'closed'
]

export const VIOLATION_TYPES = [
  'mobile_phone', 'smart_watch', 'electronic_device', 'notes_paper',
  'paper_exchange', 'talking_communication', 'looking_around',
  'impersonation', 'other'
]

export const PENALTY_OPTIONS = [
  'Warning',
  'F grade in course',
  'F grade in all courses',
  'One semester suspension',
  'Expulsion recommendation'
]

/** The stage each status is waiting on — drives the "needs your action" queues. */
export const PENDING_ROLE = {
  submitted: 'hod',
  hod_returned: 'invigilator',
  hod_approved: 'dec',
  dec_forwarded: 'exam_dept',
  exam_dept_forwarded: 'ufm_committee',
  under_committee_review: 'ufm_committee',
  decided: 'exam_dept'
}

/** Statuses a given role must act on right now. */
export const ACTION_STATUSES = {
  hod: ['submitted'],
  dec: ['hod_approved'],
  exam_dept: ['dec_forwarded', 'decided'],
  ufm_committee: ['exam_dept_forwarded', 'under_committee_review'],
  invigilator: ['hod_returned'],
  admin: ['submitted', 'hod_approved', 'dec_forwarded', 'exam_dept_forwarded'],
  student: [],
  dec_member: []
}

export const titleize = (s) => (s || '').replaceAll('_', ' ').replace(/\b\w/g, (m) => m.toUpperCase())
export const humanize = (s) => (s || '').replaceAll('_', ' ')
export const statusLabel = (s) => STATUS_LABELS[s] || humanize(s)
export const roleLabel = (r) => ROLE_SHORT[r] || humanize(r)

/** Severity 0..1 → tone used by alerts, monitoring and case badges alike. */
export function severityTone(sev) {
  const pct = (sev || 0) * 100
  if (pct >= 70) return { key: 'critical', label: 'Critical', badge: 'badge-danger', text: 'text-danger', bar: 'bg-danger', ring: 'border-danger/40' }
  if (pct >= 50) return { key: 'elevated', label: 'Elevated', badge: 'badge-warn', text: 'text-warn', bar: 'bg-warn', ring: 'border-warn/40' }
  return { key: 'low', label: 'Low', badge: 'badge-neutral', text: 'text-muted', bar: 'bg-brand', ring: 'border-line' }
}

export const pct = (v) => `${Math.round((v || 0) * 100)}%`

export function formatDate(value, opts = {}) {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return String(value)
  return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric', ...opts })
}

export function formatDateTime(value) {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return String(value)
  return d.toLocaleString(undefined, {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
  })
}

export function timeAgo(value) {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  const secs = Math.floor((Date.now() - d.getTime()) / 1000)
  if (secs < 45) return 'just now'
  const units = [['y', 31536000], ['mo', 2592000], ['d', 86400], ['h', 3600], ['m', 60]]
  for (const [label, size] of units) {
    if (secs >= size) return `${Math.floor(secs / size)}${label} ago`
  }
  return `${secs}s ago`
}

/** Turn an axios error into one readable sentence. */
export function errorMessage(err, fallback = 'Something went wrong') {
  const d = err?.response?.data?.detail
  if (typeof d === 'string') return d
  if (Array.isArray(d) && d.length) return d[0]?.msg || fallback
  if (err?.response?.status === 403) return 'You do not have permission to do that'
  if (err?.response?.status === 404) return 'Not found'
  return err?.message === 'Network Error' ? 'Cannot reach the server' : fallback
}

/** The six official lifecycle stages, used by the student tracker and the
 *  case timeline so both tell the same story. */
export const LIFECYCLE_STAGES = [
  { key: 'reported', label: 'Reported', role: 'invigilator', hint: 'Invigilator submits the case; result placed on hold' },
  { key: 'hod', label: 'HOD verification', role: 'hod', hint: 'Head of Department verifies and signs' },
  { key: 'dec', label: 'DEC review', role: 'dec', hint: 'Departmental Examination Committee reviews' },
  { key: 'exam_dept', label: 'Examination Dept', role: 'exam_dept', hint: 'Result hold, transcript block and records' },
  { key: 'committee', label: 'UFM Committee', role: 'ufm_committee', hint: 'Final decision and penalty' },
  { key: 'closure', label: 'Decision & closure', role: 'exam_dept', hint: 'Result released and case closed' }
]

/** Index of the stage a case is currently sitting at. */
export function currentStage(status) {
  switch (status) {
    case 'draft': return 0
    case 'hod_returned': return 0
    case 'submitted': return 1
    case 'hod_approved': return 2
    case 'dec_forwarded': return 3
    case 'exam_dept_forwarded':
    case 'under_committee_review': return 4
    case 'decided': return 5
    case 'closed': return 6
    default: return 0
  }
}

export const isReturned = (status) => status === 'hod_returned'
export const isTerminal = (status) => status === 'closed'

/** Readable names for the workflow actions recorded on a case. */
export const ACTION_LABELS = {
  submitted: 'Case submitted',
  approve: 'Verified & approved',
  return: 'Returned for correction',
  forward: 'Forwarded onward',
  decide: 'Final decision recorded',
  hold: 'Result placed on hold',
  release_result: 'Result released',
  block_transcript: 'Transcript blocked',
  unblock_transcript: 'Transcript unblocked',
  close: 'Case closed',
  note: 'Note added',
  evidence_uploaded: 'Evidence uploaded',
  student_response: 'Student explanation'
}

export const actionLabel = (a) => ACTION_LABELS[a] || titleize(a)
