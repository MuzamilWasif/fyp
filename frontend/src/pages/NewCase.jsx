import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import {
  FilePlus2, LayoutGrid, UserRound, ShieldAlert, Upload, PenLine, Search,
  Info, ArrowLeft, Send
} from 'lucide-react'
import api from '../lib/api'
import { useToast } from '../lib/toast'
import { VIOLATION_TYPES, titleize, errorMessage } from '../lib/format'
import { PageHeader, Card, Button, Input, Select, Textarea } from '../components/ui'
import SeatMap from '../components/SeatMap'

export default function NewCase() {
  const nav = useNavigate()
  const toast = useToast()
  const [params] = useSearchParams()

  const fromAlert = !!params.get('alert_id')

  const [exams, setExams] = useState([])
  const [examId, setExamId] = useState('')
  const [seats, setSeats] = useState([])
  const [seatsLoading, setSeatsLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState({})
  const [file, setFile] = useState(null)

  const [form, setForm] = useState({
    student_reg_no: '', student_name: '', student_department: '',
    exam_name: '', exam_date: '', exam_time: '',
    room: params.get('room') || '', seat: '',
    camera_id: params.get('camera_id') || '',
    violation_type: VIOLATION_TYPES.includes(params.get('label')) ? params.get('label') : 'mobile_phone',
    description: '', remarks: '',
    source: fromAlert ? 'ai' : 'manual',
    alert_id: fromAlert ? Number(params.get('alert_id')) : null,
    invigilator_signed: true
  })

  useEffect(() => {
    api.get('/api/admin/exams').then((r) => setExams(r.data)).catch(() => {})
  }, [])

  useEffect(() => {
    if (!examId) { setSeats([]); return }
    setSeatsLoading(true)
    api.get(`/api/admin/exams/${examId}/seats`)
      .then((r) => setSeats(r.data))
      .catch(() => setSeats([]))
      .finally(() => setSeatsLoading(false))
  }, [examId])

  const set = (k) => (e) => {
    const v = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setForm((f) => ({ ...f, [k]: v }))
    setErrors((x) => ({ ...x, [k]: undefined }))
  }

  const pickExam = (e) => {
    const id = e.target.value
    setExamId(id)
    const exam = exams.find((x) => String(x.id) === String(id))
    if (exam) {
      setForm((f) => ({
        ...f,
        exam_name: exam.name,
        exam_date: exam.date,
        exam_time: exam.start_time,
        room: exam.hall || f.room,
        student_department: exam.department || f.student_department
      }))
    }
  }

  /* clicking a seat fills the student in one gesture — the whole point of the
     seat plan for an invigilator standing in the hall */
  const pickSeat = (s) => {
    setForm((f) => ({
      ...f,
      seat: s.seat,
      student_reg_no: s.student_reg_no || f.student_reg_no,
      student_name: s.student_name || f.student_name,
      student_department: s.department || f.student_department
    }))
    setErrors({})
    toast.info(`Seat ${s.seat} selected`, s.student_name ? `${s.student_name} · ${s.student_reg_no}` : undefined)
  }

  const lookupStudent = async () => {
    const reg = form.student_reg_no.trim()
    if (!reg) return
    try {
      const { data } = await api.get('/api/lookup/student', { params: { reg_no: reg } })
      setForm((f) => ({
        ...f,
        student_name: data.student_name || f.student_name,
        student_department: data.department || f.student_department
      }))
    } catch { /* unknown registration is allowed — the invigilator can type it */ }
  }

  const validate = () => {
    const e = {}
    if (!form.student_reg_no.trim()) e.student_reg_no = 'Registration number is required'
    if (!form.student_name.trim()) e.student_name = "Student's name is required"
    if (!form.violation_type) e.violation_type = 'Select the type of violation'
    if (!form.description.trim()) e.description = 'Describe what you observed — this becomes part of the official record'
    if (!form.invigilator_signed) e.invigilator_signed = 'You must sign the case as the reporting invigilator'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const submit = async (ev) => {
    ev.preventDefault()
    if (!validate()) {
      toast.error('Check the form', 'Some required details are missing.')
      return
    }
    setSubmitting(true)
    try {
      const { data } = await api.post('/api/cases', form)
      if (file) {
        const fd = new FormData()
        fd.append('file', file)
        try {
          await api.post(`/api/cases/${data.id}/evidence`, fd)
        } catch {
          toast.error('Case created, evidence not attached', 'You can upload the file again from the case page.')
        }
      }
      toast.success(`Case ${data.case_no} submitted`, 'The result is on hold and the HOD has been notified.')
      nav(`/cases/${data.id}`)
    } catch (e) {
      const msg = errorMessage(e, 'Could not submit the case')
      setErrors((x) => ({ ...x, form: msg }))
      toast.error('Not submitted', msg)
    } finally { setSubmitting(false) }
  }

  return (
    <form onSubmit={submit} noValidate>
      <Link to="/cases" className="inline-flex items-center gap-1.5 text-small text-subtle hover:text-fg
                                   transition-colors duration-fast mb-3">
        <ArrowLeft size={14} aria-hidden="true" /> Back to cases
      </Link>

      <PageHeader
        title="Report a UFM case"
        subtitle="Pick the seat to auto-fill the student, or enter the details by hand"
      />

      {fromAlert && (
        <div className="flex items-start gap-2.5 text-body text-brand bg-brand-soft border border-brand/25
                        rounded-xl px-4 py-3 mb-4">
          <Info size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
          <span>
            Raised from AI alert #{params.get('alert_id')} on camera {params.get('camera_id')}.
            The captured evidence will be attached to this case automatically.
          </span>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-4 items-start">
        <div className="lg:col-span-2 space-y-4">
          <Card title="Examination & seat" icon={LayoutGrid}>
            <Select label="Examination" value={examId} onChange={pickExam}
                    hint="Selecting an exam loads its seat plan and fills the hall and timing">
              <option value="">Select an examination (optional)</option>
              {exams.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name} · {e.date} · {e.hall || 'no hall'}
                </option>
              ))}
            </Select>

            {examId && (
              <div className="mt-4 pt-4 border-t border-line">
                <SeatMap
                  seats={seats}
                  loading={seatsLoading}
                  selected={form.seat}
                  onSelect={pickSeat}
                />
              </div>
            )}
          </Card>

          <Card title="Student" icon={UserRound}>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="relative">
                <Input
                  label="Registration number" required
                  value={form.student_reg_no}
                  onChange={set('student_reg_no')}
                  onBlur={lookupStudent}
                  error={errors.student_reg_no}
                  placeholder="232430"
                  maxLength={40}
                  className="pr-9"
                />
                <Search size={15} aria-hidden="true"
                        className="absolute right-3 top-[34px] text-subtle pointer-events-none" />
              </div>
              <Input label="Student name" required value={form.student_name}
                     onChange={set('student_name')} error={errors.student_name} maxLength={120} />
              <Input label="Department" value={form.student_department}
                     onChange={set('student_department')} placeholder="CS" maxLength={60} />
              <Input label="Seat" value={form.seat} onChange={set('seat')} placeholder="A12" maxLength={20} />
            </div>
          </Card>

          <Card title="Violation" icon={ShieldAlert}>
            <div className="grid sm:grid-cols-2 gap-4">
              <Select label="Type of violation" required value={form.violation_type}
                      onChange={set('violation_type')} error={errors.violation_type}>
                {VIOLATION_TYPES.map((v) => (
                  <option key={v} value={v}>{titleize(v)}</option>
                ))}
              </Select>
              <Input label="Camera ID" value={form.camera_id} onChange={set('camera_id')}
                     placeholder="CAM-A101-1" maxLength={60} />
            </div>
            <Textarea
              wrapperClassName="mt-4"
              label="What did you observe?" required rows={4}
              value={form.description} onChange={set('description')} error={errors.description}
              maxLength={2000}
              placeholder="Describe the incident factually: what was seen, when, and what action you took."
              hint={`${form.description.length}/2000 characters`}
            />
            <Textarea
              wrapperClassName="mt-4"
              label="Additional remarks" rows={2}
              value={form.remarks} onChange={set('remarks')} maxLength={1000}
            />
          </Card>
        </div>

        {/* summary rail */}
        <div className="space-y-4 lg:sticky lg:top-[76px]">
          <Card title="Examination details" icon={FilePlus2}>
            <div className="space-y-4">
              <Input label="Exam name" value={form.exam_name} onChange={set('exam_name')} maxLength={160} />
              <div className="grid grid-cols-2 gap-3">
                <Input label="Date" type="date" value={form.exam_date} onChange={set('exam_date')} />
                <Input label="Time" type="time" value={form.exam_time} onChange={set('exam_time')} />
              </div>
              <Input label="Hall / Room" value={form.room} onChange={set('room')} placeholder="A-101" maxLength={60} />
            </div>
          </Card>

          <Card title="Evidence" icon={Upload} subtitle="Optional photo or clip">
            <input
              type="file"
              aria-label="Choose evidence file"
              accept="image/*,video/*"
              onChange={(e) => setFile(e.target.files[0])}
              className="input file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0
                         file:bg-surface-3 file:text-fg file:text-small file:cursor-pointer"
            />
            {file && <p className="hint truncate">Selected: {file.name}</p>}
          </Card>

          <Card title="Declaration" icon={PenLine}>
            <label className="flex items-start gap-2.5 text-body cursor-pointer">
              <input
                type="checkbox"
                checked={form.invigilator_signed}
                onChange={set('invigilator_signed')}
                className="mt-1 w-4 h-4 accent-[#a3e635] cursor-pointer"
              />
              <span className="text-muted">
                I digitally sign this case as the reporting invigilator and confirm the details are accurate.
              </span>
            </label>
            {errors.invigilator_signed && <p className="error-text" role="alert">{errors.invigilator_signed}</p>}

            <p className="text-small text-subtle mt-4 pt-4 border-t border-line">
              On submission the student's result is placed on hold automatically and the
              Head of Department is notified for verification.
            </p>

            {errors.form && <p className="error-text" role="alert">{errors.form}</p>}

            <Button type="submit" variant="brand" icon={Send} loading={submitting} className="w-full mt-4">
              Submit case
            </Button>
          </Card>
        </div>
      </div>
    </form>
  )
}
