import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import api from '../lib/api'

const VIOLATIONS = ['mobile_phone', 'smart_watch', 'electronic_device', 'notes_paper', 'talking_communication', 'other']

export default function NewCase() {
  const nav = useNavigate()
  const [params] = useSearchParams()
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

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

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

  const Field = ({ label, k, type = 'text', placeholder }) => (
    <div>
      <label className="text-xs text-neutral-400">{label}</label>
      <input className="input" type={type} value={form[k]} onChange={set(k)} placeholder={placeholder || ''} />
    </div>
  )

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-4">Report UFM Case</h1>
      <div className="card grid md:grid-cols-2 gap-4">
        <Field label="Student Reg No *" k="student_reg_no" placeholder="232430" />
        <Field label="Student Name *" k="student_name" />
        <Field label="Department" k="student_department" placeholder="CS" />
        <Field label="Exam Name" k="exam_name" placeholder="Data Structures Final" />
        <Field label="Exam Date" k="exam_date" type="date" />
        <Field label="Exam Time" k="exam_time" type="time" />
        <Field label="Room" k="room" placeholder="A-101" />
        <Field label="Seat" k="seat" placeholder="A12" />
        <Field label="Camera ID" k="camera_id" />
        <div>
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
