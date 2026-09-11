import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../lib/api'
import StatusBadge from '../components/StatusBadge'

export default function Cases() {
  const [cases, setCases] = useState([])
  const [filter, setFilter] = useState('')

  useEffect(() => {
    api.get('/api/cases', { params: filter ? { status: filter } : {} })
      .then(r => setCases(r.data)).catch(() => {})
  }, [filter])

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">UFM Cases</h1>
        <select className="input w-56" value={filter} onChange={e => setFilter(e.target.value)}>
          <option value="">All statuses</option>
          {['submitted','hod_approved','hod_returned','dec_forwarded','exam_dept_forwarded','decided','closed'].map(s =>
            <option key={s} value={s}>{s.replaceAll('_',' ')}</option>)}
        </select>
      </div>
      <div className="grid gap-3">
        {cases.map(c => (
          <Link to={`/cases/${c.id}`} key={c.id} className="card hover:border-brand transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold">{c.case_no} <span className="text-neutral-400 font-normal">· {c.violation_type.replaceAll('_',' ')}</span></div>
                <div className="text-sm text-neutral-400">{c.student_name} ({c.student_reg_no}) · {c.room}{c.seat && ` / ${c.seat}`} · {c.exam_name}</div>
              </div>
              <div className="flex items-center gap-2">
                {c.result_hold && <span className="badge bg-red-500/20 text-red-400">result hold</span>}
                {c.source === 'ai' && <span className="badge bg-brand/20 text-brand">AI</span>}
                <StatusBadge status={c.status} />
              </div>
            </div>
          </Link>
        ))}
        {cases.length === 0 && <div className="text-neutral-500 text-sm">No cases found.</div>}
      </div>
    </div>
  )
}
