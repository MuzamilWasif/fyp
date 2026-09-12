import { useCallback, useEffect, useState } from 'react'
import {
  Building2, Video, CalendarDays, Upload, Trash2, Plus, LayoutGrid, Info, Radio
} from 'lucide-react'
import api from '../lib/api'
import { useToast } from '../lib/toast'
import { errorMessage, formatDate } from '../lib/format'
import {
  PageHeader, Card, Button, Input, Select, EmptyState, ConfirmDialog, Skeleton, Modal
} from '../components/ui'
import SeatMap from '../components/SeatMap'

const BLANK_HALL = { name: '', building: '', capacity: '' }
const BLANK_CAM = { camera_id: '', hall_id: '', stream_url: '', rtsp_url: '' }
const BLANK_EXAM = {
  name: '', course_code: '', department: '', semester: '',
  date: '', start_time: '', end_time: '', hall_id: ''
}

export default function Setup() {
  const toast = useToast()
  const [halls, setHalls] = useState([])
  const [exams, setExams] = useState([])
  const [loading, setLoading] = useState(true)

  const [hall, setHall] = useState(BLANK_HALL)
  const [cam, setCam] = useState(BLANK_CAM)
  const [exam, setExam] = useState(BLANK_EXAM)
  const [busy, setBusy] = useState('')
  const [errors, setErrors] = useState({})
  const [confirm, setConfirm] = useState(null)
  const [seatPreview, setSeatPreview] = useState(null)

  const load = useCallback(() => Promise.all([
    api.get('/api/admin/halls').then((r) => setHalls(r.data)),
    api.get('/api/admin/exams').then((r) => setExams(r.data))
  ]).catch((e) => toast.error('Could not load setup data', errorMessage(e)))
    .finally(() => setLoading(false)), []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load() }, [load])

  const addHall = async () => {
    if (!hall.name.trim()) { setErrors({ hall: 'A hall name is required' }); return }
    setBusy('hall')
    try {
      await api.post('/api/admin/halls', { ...hall, capacity: Number(hall.capacity) || 0 })
      setHall(BLANK_HALL); setErrors({})
      await load()
      toast.success('Hall added', hall.name)
    } catch (e) {
      const msg = errorMessage(e)
      setErrors({ hall: msg }); toast.error('Could not add the hall', msg)
    } finally { setBusy('') }
  }

  const addCamera = async () => {
    if (!cam.camera_id.trim() || !cam.hall_id) {
      setErrors({ cam: 'A camera ID and a hall are both required' }); return
    }
    setBusy('cam')
    try {
      await api.post('/api/admin/cameras', { ...cam, hall_id: Number(cam.hall_id) })
      setCam(BLANK_CAM); setErrors({})
      await load()
      toast.success('Camera registered', cam.camera_id)
    } catch (e) {
      const msg = errorMessage(e)
      setErrors({ cam: msg }); toast.error('Could not register the camera', msg)
    } finally { setBusy('') }
  }

  const addExam = async () => {
    if (!exam.name.trim()) { setErrors({ exam: 'An examination name is required' }); return }
    setBusy('exam')
    try {
      await api.post('/api/admin/exams', { ...exam, hall_id: exam.hall_id ? Number(exam.hall_id) : null })
      setExam(BLANK_EXAM); setErrors({})
      await load()
      toast.success('Examination added', exam.name)
    } catch (e) {
      const msg = errorMessage(e)
      setErrors({ exam: msg }); toast.error('Could not add the examination', msg)
    } finally { setBusy('') }
  }

  const uploadSeats = async (examId, file) => {
    if (!file) return
    setBusy(`seats-${examId}`)
    const fd = new FormData()
    fd.append('file', file)
    try {
      const { data } = await api.post(`/api/admin/exams/${examId}/seats/upload`, fd)
      await load()
      toast.success('Seat plan imported', `${data.imported} seats assigned.`)
    } catch (e) {
      toast.error('Seat plan not imported', errorMessage(e))
    } finally { setBusy('') }
  }

  const remove = async () => {
    const { kind, id, label } = confirm
    try {
      await api.delete(`/api/admin/${kind}/${id}`)
      await load()
      toast.success(`${label} removed`)
    } catch (e) {
      toast.error('Could not remove', errorMessage(e))
    } finally { setConfirm(null) }
  }

  const openSeatPlan = async (e) => {
    try {
      const { data } = await api.get(`/api/admin/exams/${e.id}/seats`)
      setSeatPreview({ exam: e, seats: data })
    } catch (err) {
      toast.error('Could not load the seat plan', errorMessage(err))
    }
  }

  return (
    <>
      <PageHeader
        title="Exams & Halls"
        subtitle="Institution setup: examination halls, cameras, examinations and seat plans"
      />

      <div className="grid xl:grid-cols-2 gap-4 items-start">
        {/* ---------------------------------------------------- halls */}
        <div className="space-y-4">
          <Card title="Examination halls" icon={Building2}
                subtitle={`${halls.length} hall${halls.length === 1 ? '' : 's'} registered`}>
            {loading ? (
              <div className="space-y-2">{[0, 1].map((i) => <Skeleton key={i} className="h-14" />)}</div>
            ) : halls.length === 0 ? (
              <EmptyState icon={Building2} title="No halls yet"
                          description="Add your first examination hall below, then register its cameras."
                          className="py-6" />
            ) : (
              <ul className="divide-y divide-line">
                {halls.map((h) => (
                  <li key={h.id} className="py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-body font-semibold">{h.name}</div>
                        <div className="text-small text-subtle">
                          {h.building || 'No building'} · capacity {h.capacity || '—'}
                        </div>
                      </div>
                      <Button size="sm" variant="subtle" icon={Trash2}
                              aria-label={`Remove hall ${h.name}`}
                              onClick={() => setConfirm({ kind: 'halls', id: h.id, label: `Hall ${h.name}` })}
                              className="text-subtle hover:text-danger" />
                    </div>
                    {h.cameras.length > 0 && (
                      <ul className="mt-2 flex flex-wrap gap-1.5">
                        {h.cameras.map((c) => (
                          <li key={c.id}>
                            <span className={c.stream_url ? 'badge-ok' : 'badge-neutral'}>
                              <Video size={11} aria-hidden="true" />
                              {c.camera_id}{c.stream_url ? ' · streaming' : ''}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-4 pt-4 border-t border-line">
              <div className="grid sm:grid-cols-3 gap-3">
                <Input label="Hall name" placeholder="A-101" value={hall.name}
                       onChange={(e) => setHall({ ...hall, name: e.target.value })} maxLength={60} />
                <Input label="Building" placeholder="CS Block" value={hall.building}
                       onChange={(e) => setHall({ ...hall, building: e.target.value })} maxLength={60} />
                <Input label="Capacity" type="number" min="0" placeholder="40" value={hall.capacity}
                       onChange={(e) => setHall({ ...hall, capacity: e.target.value })} />
              </div>
              {errors.hall && <p className="error-text" role="alert">{errors.hall}</p>}
              <Button variant="ghost" icon={Plus} className="mt-3"
                      loading={busy === 'hall'} onClick={addHall}>Add hall</Button>
            </div>
          </Card>

          <Card title="Cameras" icon={Video}
                subtitle="Point each camera at the detection engine's MJPEG stream">
            <div className="grid sm:grid-cols-2 gap-3">
              <Input label="Camera ID" placeholder="CAM-A101-1" value={cam.camera_id}
                     onChange={(e) => setCam({ ...cam, camera_id: e.target.value })} maxLength={60} />
              <Select label="Hall" value={cam.hall_id}
                      onChange={(e) => setCam({ ...cam, hall_id: e.target.value })}>
                <option value="">Select a hall</option>
                {halls.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
              </Select>
              <Input label="RTSP URL" placeholder="rtsp://… (optional)" value={cam.rtsp_url}
                     onChange={(e) => setCam({ ...cam, rtsp_url: e.target.value })} maxLength={300} />
              <Input label="Stream URL" placeholder="http://localhost:8090/stream/CAM-A101-1"
                     value={cam.stream_url}
                     onChange={(e) => setCam({ ...cam, stream_url: e.target.value })} maxLength={300} />
            </div>
            {errors.cam && <p className="error-text" role="alert">{errors.cam}</p>}
            <div className="flex items-start gap-2 text-small text-subtle mt-3">
              <Radio size={14} className="text-brand mt-0.5 shrink-0" aria-hidden="true" />
              <span className="min-w-0">
                Cameras without a stream URL still record alerts; they simply show as offline
                on the Live Monitoring wall.
              </span>
            </div>
            <Button variant="ghost" icon={Plus} className="mt-3"
                    loading={busy === 'cam'} onClick={addCamera}>Register camera</Button>
          </Card>
        </div>

        {/* ---------------------------------------------------- exams */}
        <div className="space-y-4">
          <Card title="Examinations & seat plans" icon={CalendarDays}
                subtitle={`${exams.length} examination${exams.length === 1 ? '' : 's'} scheduled`}>
            {loading ? (
              <div className="space-y-2">{[0, 1].map((i) => <Skeleton key={i} className="h-20" />)}</div>
            ) : exams.length === 0 ? (
              <EmptyState icon={CalendarDays} title="No examinations scheduled"
                          description="Add an examination below, then upload its seat plan so invigilators can tap a seat to report."
                          className="py-6" />
            ) : (
              <ul className="divide-y divide-line">
                {exams.map((e) => (
                  <li key={e.id} className="py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-body font-semibold truncate">{e.name}</div>
                        <div className="text-small text-subtle">
                          {[e.course_code, e.department, e.semester].filter(Boolean).join(' · ') || 'No course details'}
                        </div>
                        <div className="text-small text-subtle">
                          {e.date ? formatDate(e.date) : 'No date'} · {e.hall || 'No hall'}
                          {e.start_time && ` · ${e.start_time}${e.end_time ? `–${e.end_time}` : ''}`}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={e.seat_count ? 'badge-brand' : 'badge-neutral'}>
                          {e.seat_count} seats
                        </span>
                        <Button size="sm" variant="subtle" icon={Trash2}
                                aria-label={`Remove examination ${e.name}`}
                                onClick={() => setConfirm({ kind: 'exams', id: e.id, label: e.name })}
                                className="text-subtle hover:text-danger" />
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      <label className="btn-ghost btn-sm cursor-pointer">
                        <Upload size={14} aria-hidden="true" />
                        {busy === `seats-${e.id}` ? 'Uploading…' : 'Upload seat CSV'}
                        <input
                          type="file" accept=".csv" className="sr-only"
                          onChange={(ev) => { uploadSeats(e.id, ev.target.files[0]); ev.target.value = '' }}
                        />
                      </label>
                      {e.seat_count > 0 && (
                        <Button size="sm" variant="subtle" icon={LayoutGrid}
                                onClick={() => openSeatPlan(e)}>View seat map</Button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <div className="flex items-start gap-2 text-small text-subtle mt-4">
              <Info size={14} className="text-brand mt-0.5 shrink-0" aria-hidden="true" />
              <span className="min-w-0">
                Seat CSV columns: <code className="kbd">seat</code>, <code className="kbd">student_reg_no</code>,{' '}
                <code className="kbd">student_name</code>, <code className="kbd">department</code>.
                Uploading replaces the existing plan for that examination.
              </span>
            </div>

            <div className="mt-4 pt-4 border-t border-line">
              <div className="grid sm:grid-cols-2 gap-3">
                <Input label="Examination name" placeholder="Data Structures Final" value={exam.name}
                       onChange={(e) => setExam({ ...exam, name: e.target.value })} maxLength={160} />
                <Input label="Course code" placeholder="CS-201" value={exam.course_code}
                       onChange={(e) => setExam({ ...exam, course_code: e.target.value })} maxLength={40} />
                <Input label="Department" placeholder="CS" value={exam.department}
                       onChange={(e) => setExam({ ...exam, department: e.target.value })} maxLength={60} />
                <Input label="Semester" placeholder="Fall 2026" value={exam.semester}
                       onChange={(e) => setExam({ ...exam, semester: e.target.value })} maxLength={40} />
                <Input label="Date" type="date" value={exam.date}
                       onChange={(e) => setExam({ ...exam, date: e.target.value })} />
                <div className="grid grid-cols-2 gap-3">
                  <Input label="Start" type="time" value={exam.start_time}
                         onChange={(e) => setExam({ ...exam, start_time: e.target.value })} />
                  <Input label="End" type="time" value={exam.end_time}
                         onChange={(e) => setExam({ ...exam, end_time: e.target.value })} />
                </div>
                <Select label="Hall" wrapperClassName="sm:col-span-2" value={exam.hall_id}
                        onChange={(e) => setExam({ ...exam, hall_id: e.target.value })}>
                  <option value="">Select a hall</option>
                  {halls.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
                </Select>
              </div>
              {errors.exam && <p className="error-text" role="alert">{errors.exam}</p>}
              <Button variant="brand" icon={Plus} className="mt-3"
                      loading={busy === 'exam'} onClick={addExam}>Add examination</Button>
            </div>
          </Card>
        </div>
      </div>

      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={remove}
        title={confirm ? `Remove ${confirm.label}?` : ''}
        description="This cannot be undone. Cases already recorded keep their own copy of these details."
        confirmLabel="Remove"
        tone="danger"
      />

      <Modal
        open={!!seatPreview}
        onClose={() => setSeatPreview(null)}
        size="xl"
        title={seatPreview ? `Seat plan · ${seatPreview.exam.name}` : ''}
        description={seatPreview ? `${seatPreview.seats.length} seats · ${seatPreview.exam.hall || 'no hall'}` : ''}
      >
        {seatPreview && <SeatMap seats={seatPreview.seats} />}
      </Modal>
    </>
  )
}
