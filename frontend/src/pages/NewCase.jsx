import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import api from '../lib/api'

const VIOLATIONS = ['mobile_phone', 'smart_watch', 'electronic_device', 'notes_paper', 'talking_communication', 'other']

export default function NewCase() {
  const nav = useNavigate()
  const [params] = useSearchParams()
  const [exams, setExams] = useState([])
  const [examId, setExamId] = useState('')
  const [form, setForm] = useState({
    student_reg_no: '', student_name: '', student_department: '',
    exam_name: '', exam_date: '', exam_time: '', room: params.get('room') || '',
    seat: '', camera_id: params.get('camera_id') || '',
    violation_type: params.get('label') || 'mobile_phone',
    description: '', remarks: '', source: params.get('alert_id') ? 'ai' : 'manual',
    alert_id: params.get('alert_id') ? Number(params.get('alert_id')) : null,
    invigilator_signed: true
  })
  const [file, setFile] = useState(null)
  const [error, setError] = useState('')
  const [hint, setHint] = useState('')

  useEffect(() => { api.get('/api/admin/exams').then(r => setExams(r.data)).catch(() => {}) }, [])

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const pickExam = (id) => {
    setExamId(id)
    const e = exams.find(x => String(x.id) === String(id))
    if (e) setForm(f => ({ ...f, exam_name: e.name, exam_date: e.date, exam_time: e.start_time, room: e.hall || f.room, student_department: e.department || f.student_department }))
  }

  const lookupSeat = async () => {
    setHint('')
    if (!examId || !form.seat) { setHint('Select an exam and enter a seat first'); return }
    try {
      const { data } = await api.get('/api/lookup/seat', { params: { exam_id: examId, seat: form.seat } })
      setForm(f => ({ ...f, ...data, seat: f.seat }))
      setHint(`Auto-filled from seat plan: ${data.student_name}`)
    } catch { setHint('No student assigned to that seat') }
  }

  const lookupStudent = async () => {
    if (!form.student_reg_no) return
    try {
      const { data } = await api.get('/api/lookup/student', { params: { reg_no: form.student_reg_no } })
      setForm(f => ({ ...f, student_name: data.student_name || f.student_name, student_department: data.department || f.student_department }))
    } catch {}
  }

  const submit = async () => {
    setError('')
    if (!form.student_reg_no || !form.student_name) { setError('Student registration number and name are required'); return }
    try {
      const { data } = await api.post('/api/cases', form)
      if (file) {
        const fd = new FormData()
        fd.append('file', file)
        await api.post(`/api/cases/${data.id}/evidence`, fd)
      }
      nav(`/cases/${data.id}`)
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to create case')
    }
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-1">Report UFM Case</h1>
      <p className="text-sm text-neutral-400 mb-4">Pick the exam and seat to auto-fill the student, or enter details manually.</p>
      <div className="card grid md:grid-cols-2 gap-4">
        <div className="md:col-span-2 grid md:grid-cols-3 gap-2 items-end">
          <div className="md:col-span-2">
            <label className="text-xs text-neutral-400">Exam</label>
            <select className="input" value={examId} onChange={e => pickExam(e.target.value)}>
              <option value="">Select exam (optional)</option>
              {exams.map(e => <option key={e.id} value={e.id}>{e.name} · {e.date} · {e.hall}</option>)}
            </select>
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-xs text-neutral-400">Seat</label>
              <input className="input" value={form.seat} onChange={set('seat')} placeholder="A12" />
            </div>
            <button className="btn-ghost self-end" onClick={lookupSeat}>Find</button>
          </div>
          {hint && <div className="md:col-span-3 text-xs text-brand">{hint}</div>}
        </div>

        <div>
          <label className="text-xs text-neutral-400">Student Reg No *</label>
          <input className="input" value={form.student_reg_no} onChange={set('student_reg_no')} onBlur={lookupStudent} placeholder="232430" />
        </div>
        <div>
          <label className="text-xs text-neutral-400">Student Name *</label>
          <input className="input" value={form.student_name} onChange={set('student_name')} />
        </div>
        <div>
          <label className="text-xs text-neutral-400">Department</label>
          <input className="input" value={form.student_department} onChange={set('student_department')} placeholder="CS" />
        </div>
        <div>
          <label className="text-xs text-neutral-400">Exam Name</label>
          <input className="input" value={form.exam_name} onChange={set('exam_name')} />
        </div>
        <div>
          <label className="text-xs text-neutral-400">Exam Date</label>
          <input className="input" type="date" value={form.exam_date} onChange={set('exam_date')} />
        </div>
        <div>
          <label className="text-xs text-neutral-400">Exam Time</label>
          <input className="input" type="time" value={form.exam_time} onChange={set('exam_time')} />
        </div>
        <div>
          <label className="text-xs text-neutral-400">Room</label>
          <input className="input" value={form.room} onChange={set('room')} placeholder="A-101" />
        </div>
        <div>
          <label className="text-xs text-neutral-400">Camera ID</label>
          <input className="input" value={form.camera_id} onChange={set('camera_id')} />
        </div>
        <div className="md:col-span-2">
          <label className="text-xs text-neutral-400">Violation Type *</label>
          <select className="input" value={form.violation_type} onChange={set('violation_type')}>
            {VIOLATIONS.map(v => <option key={v} value={v}>{v.replaceAll('_', ' ')}</option>)}
          </select>
        </div>
        <div className="md:col-span-2">
          <label className="text-xs text-neutral-400">Incident Description</label>
          <textarea className="input" rows="3" value={form.description} onChange={set('description')} />
        </div>
        <div className="md:col-span-2">
          <label className="text-xs text-neutral-400">Remarks</label>
          <textarea className="input" rows="2" value={form.remarks} onChange={set('remarks')} />
        </div>
        <div className="md:col-span-2">
          <label className="text-xs text-neutral-400">Evidence (image/video)</label>
          <input type="file" className="input" accept="image/*,video/*" onChange={e => setFile(e.target.files[0])} />
        </div>
        <label className="md:col-span-2 flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.invigilator_signed}
            onChange={e => setForm(f => ({ ...f, invigilator_signed: e.target.checked }))} />
          I digitally sign this case as the reporting invigilator
        </label>
        {error && <div className="md:col-span-2 text-red-400 text-sm">{error}</div>}
        <div className="md:col-span-2">
          <button className="btn-brand" onClick={submit}>Submit case</button>
        </div>
      </div>
    </div>
  )
}
