const COLORS = {
  submitted: 'bg-amber-500/20 text-amber-400',
  hod_approved: 'bg-blue-500/20 text-blue-400',
  hod_returned: 'bg-red-500/20 text-red-400',
  dec_forwarded: 'bg-indigo-500/20 text-indigo-400',
  exam_dept_forwarded: 'bg-purple-500/20 text-purple-400',
  under_committee_review: 'bg-fuchsia-500/20 text-fuchsia-400',
  decided: 'bg-emerald-500/20 text-emerald-400',
  closed: 'bg-neutral-500/20 text-neutral-400',
  draft: 'bg-neutral-500/20 text-neutral-400'
}

export default function StatusBadge({ status }) {
  return <span className={`badge ${COLORS[status] || 'bg-neutral-700'}`}>{status.replaceAll('_', ' ')}</span>
}
