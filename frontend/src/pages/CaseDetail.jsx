import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import api from '../lib/api'
import { useAuth } from '../lib/auth'
import StatusBadge from '../components/StatusBadge'

const ROLE_ACTIONS = {
  hod: [['approve', 'Approve & forward to DEC'], ['return', 'Return to invigilator'], ['note', 'Add note']],
  dec: [['forward', 'Forward to Examination Dept'], ['return', 'Return'], ['note', 'Add note']],
  exam_dept: [['forward', 'Forward to UFM Committee'], ['hold', 'Hold result'], ['release_result', 'Release result'],
              ['block_transcript', 'Block transcript'], ['unblock_transcript', 'Unblock transcript'],
              ['close', 'Close case'], ['note', 'Add note']],
  ufm_committee: [['decide', 'Record final decision'], ['note', 'Add note']],
  invigilator: [['note', 'Add note']],
  admin: [['approve','Approve'],['return','Return'],['forward','Forward'],['decide','Decide'],
          ['hold','Hold'],['release_result','Release result'],['close','Close'],['note','Note']]
}

export default function CaseDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const [c, setC] = useState(null)
  const [comment, setComment] = useState('')
  const [decision, setDecision] = useState('')
  const [penalty, setPenalty] = useState('')
  const [file, setFile] = useState(null)
  const [error, setError] = useState('')

  const load = () => api.get(`/api/cases/${id}`).then(r => setC(r.data)).catch(() => {})
  useEffect(() => { load() }, [id])

  const act = async (action) => {
    setError('')
    try {
      await api.post(`/api/cases/${id}/transition`, { action, comment, final_decision: decision, penalty })
      setComment(''); setDecision(''); setPenalty('')
      load()
    } catch (e) { setError(e.response?.data?.detail || 'Action failed') }
  }

  const uploadEvidence = async () => {
    if (!file) return
    const fd = new FormData(); fd.append('file', file)
    await api.post(`/api/cases/${id}/evidence`, fd)
    setFile(null); load()
  }

  if (!c) return <div className="text-neutral-500">Loading…</div>

  const actions = ROLE_ACTIONS[user.role] || []
  const evidenceUrl = (p) => `/evidence/${p.split(/[\\/]/).pop()}`

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold">Case {c.case_no}</h1>
          <div className="text-sm text-neutral-400">{c.exam_name} · {c.room}{c.seat && ` / Seat ${c.seat}`} · {c.exam_date} {c.exam_time}</div>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-ghost no-print" onClick={() => window.print()}>Print report</button>
          {c.result_hold && <span className="badge bg-red-500/20 text-red-400">result hold</span>}
          {c.transcript_blocked && <span className="badge bg-red-500/20 text-red-400">transcript blocked</span>}
          <StatusBadge status={c.status} />
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4 mb-4">
        <div className="card">
          <div className="font-semibold mb-2">Student</div>
          <div className="text-sm">{c.student_name}</div>
          <div className="text-sm text-neutral-400">{c.student_reg_no} · {c.student_department}</div>
        </div>
        <div className="card">
          <div className="font-semibold mb-2">Violation</div>
          <div className="text-sm">{c.violation_type.replaceAll('_', ' ')}
            {c.source === 'ai' && <span className="badge bg-brand/20 text-brand ml-2">AI detected</span>}</div>
          {c.description && <div className="text-sm text-neutral-400 mt-1">{c.description}</div>}
          <div className="text-xs text-neutral-500 mt-2">
            Signatures: invigilator {c.invigilator_signed ? '✓' : '—'} · HOD {c.hod_signed ? '✓' : '—'}
          </div>
        </div>
      </div>

      {c.final_decision && (
        <div className="card mb-4 border-emerald-700">
          <div className="font-semibold text-emerald-400 mb-1">Final decision</div>
          <div className="text-sm">{c.final_decision}</div>
          {c.penalty && <div className="text-sm text-neutral-400 mt-1">Penalty: {c.penalty}</div>}
        </div>
      )}

      <div className="card mb-4">
        <div className="font-semibold mb-2">Evidence ({c.evidence.length})</div>
        <div className="grid md:grid-cols-2 gap-3">
          {c.evidence.map(ev => (
            <div key={ev.id} className="bg-neutral-900 rounded-lg p-2">
              {ev.file_type === 'image'
                ? <img src={evidenceUrl(ev.file_path)} className="rounded w-full" />
                : <video src={evidenceUrl(ev.file_path)} controls className="rounded w-full" />}
              <div className="text-xs text-neutral-500 mt-1">
                {ev.source === 'ai' ? `AI · conf ${(ev.confidence ?? 0).toFixed(2)}` : 'Manual upload'}
                {ev.camera_id && ` · ${ev.camera_id}`} · {new Date(ev.captured_at).toLocaleString()}
              </div>
            </div>
          ))}
          {c.evidence.length === 0 && <div className="text-sm text-neutral-500">No evidence attached.</div>}
        </div>
        {['invigilator', 'hod', 'exam_dept', 'admin'].includes(user.role) && (
          <div className="flex gap-2 mt-3">
            <input type="file" className="input" onChange={e => setFile(e.target.files[0])} />
            <button className="btn-ghost" onClick={uploadEvidence}>Upload</button>
          </div>
        )}
      </div>

      {actions.length > 0 && c.status !== 'closed' && (
        <div className="card mb-4">
          <div className="font-semibold mb-2">Actions</div>
          <textarea className="input mb-2" rows="2" placeholder="Comment / remarks"
            value={comment} onChange={e => setComment(e.target.value)} />
          {user.role === 'ufm_committee' && (
            <>
              <textarea className="input mb-2" rows="2" placeholder="Final decision text"
                value={decision} onChange={e => setDecision(e.target.value)} />
              <input className="input mb-2" placeholder="Penalty (e.g. F grade in course, one semester suspension)"
                value={penalty} onChange={e => setPenalty(e.target.value)} />
            </>
          )}
          <div className="flex flex-wrap gap-2">
            {actions.map(([a, label]) =>
              <button key={a} className="btn-ghost" onClick={() => act(a)}>{label}</button>)}
          </div>
          {error && <div className="text-red-400 text-sm mt-2">{error}</div>}
        </div>
      )}

      <div className="card">
        <div className="font-semibold mb-2">Case history</div>
        {c.actions.map(a => (
          <div key={a.id} className="text-sm border-b border-neutral-800 last:border-0 py-2">
            <span className="text-brand">{a.actor_role}</span> · {a.action.replaceAll('_', ' ')}
            {a.comment && <span className="text-neutral-400"> — {a.comment}</span>}
            <div className="text-xs text-neutral-500">{new Date(a.created_at).toLocaleString()}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
