import { useEffect, useState } from 'react'
import api from '../lib/api'

export default function Setup() {
  const [halls, setHalls] = useState([])
  const [exams, setExams] = useState([])
  const [hall, setHall] = useState({ name: '', building: '', capacity: '' })
  const [cam, setCam] = useState({ camera_id: '', hall_id: '', stream_url: '', rtsp_url: '' })
  const [exam, setExam] = useState({ name: '', course_code: '', department: '', semester: '', date: '', start_time: '', end_time: '', hall_id: '' })
  const [seatFile, setSeatFile] = useState({})

  const load = () => {
    api.get('/api/admin/halls').then(r => setHalls(r.data)).catch(() => {})
    api.get('/api/admin/exams').then(r => setExams(r.data)).catch(() => {})
  }
  useEffect(() => { load() }, [])

  const addHall = () => api.post('/api/admin/halls', { ...hall, capacity: Number(hall.capacity) || 0 })
    .then(() => { setHall({ name: '', building: '', capacity: '' }); load() })
  const addCam = () => api.post('/api/admin/cameras', { ...cam, hall_id: Number(cam.hall_id) })
    .then(() => { setCam({ camera_id: '', hall_id: '', stream_url: '', rtsp_url: '' }); load() })
  const addExam = () => api.post('/api/admin/exams', { ...exam, hall_id: exam.hall_id ? Number(exam.hall_id) : null })
    .then(() => { setExam({ name: '', course_code: '', department: '', semester: '', date: '', start_time: '', end_time: '', hall_id: '' }); load() })
  const uploadSeats = (examId) => {
    const f = seatFile[examId]
    if (!f) return
    const fd = new FormData(); fd.append('file', f)
    api.post(`/api/admin/exams/${examId}/seats/upload`, fd).then(load)
  }

  return (
    <div className="grid xl:grid-cols-2 gap-4">
      <div className="card">
        <h2 className="text-lg font-semibold mb-3">Examination halls &amp; cameras</h2>
        {halls.map(h => (
          <div key={h.id} className="border-b border-neutral-800 py-2 last:border-0">
            <div className="flex justify-between text-sm">
              <span className="font-medium">{h.name} <span className="text-neutral-500 font-normal">{h.building} · cap {h.capacity}</span></span>
              <button className="text-red-400 text-xs" onClick={() => api.delete(`/api/admin/halls/${h.id}`).then(load)}>remove</button>
            </div>
            {h.cameras.map(c => (
              <div key={c.id} className="text-xs text-neutral-400 ml-3 mt-1">
                {c.camera_id} {c.stream_url && <span className="text-brand">· streaming</span>}
              </div>
            ))}
          </div>
        ))}
        <div className="grid grid-cols-3 gap-2 mt-3">
          <input className="input" placeholder="Hall name (A-101)" value={hall.name} onChange={e => setHall({ ...hall, name: e.target.value })} />
          <input className="input" placeholder="Building" value={hall.building} onChange={e => setHall({ ...hall, building: e.target.value })} />
          <input className="input" placeholder="Capacity" value={hall.capacity} onChange={e => setHall({ ...hall, capacity: e.target.value })} />
        </div>
        <button className="btn-ghost mt-2" onClick={addHall}>Add hall</button>

        <div className="grid grid-cols-2 gap-2 mt-4">
          <input className="input" placeholder="Camera ID (CAM-A101-1)" value={cam.camera_id} onChange={e => setCam({ ...cam, camera_id: e.target.value })} />
          <select className="input" value={cam.hall_id} onChange={e => setCam({ ...cam, hall_id: e.target.value })}>
            <option value="">Select hall</option>
            {halls.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
          </select>
          <input className="input" placeholder="RTSP URL (optional)" value={cam.rtsp_url} onChange={e => setCam({ ...cam, rtsp_url: e.target.value })} />
          <input className="input" placeholder="Stream URL (http://host:8090/stream/…)" value={cam.stream_url} onChange={e => setCam({ ...cam, stream_url: e.target.value })} />
        </div>
        <button className="btn-ghost mt-2" onClick={addCam} disabled={!cam.camera_id || !cam.hall_id}>Add camera</button>
      </div>

      <div className="card">
        <h2 className="text-lg font-semibold mb-3">Exams &amp; seat plans</h2>
        {exams.map(e => (
          <div key={e.id} className="border-b border-neutral-800 py-2 last:border-0">
            <div className="flex justify-between text-sm">
              <span className="font-medium">{e.name} <span className="text-neutral-500 font-normal">{e.course_code} · {e.date} · {e.hall}</span></span>
              <span className="text-xs text-neutral-400">{e.seat_count} seats</span>
            </div>
            <div className="flex gap-2 mt-1 items-center">
              <input type="file" accept=".csv" className="input text-xs"
                onChange={ev => setSeatFile(s => ({ ...s, [e.id]: ev.target.files[0] }))} />
              <button className="btn-ghost text-xs" onClick={() => uploadSeats(e.id)}>Upload seat CSV</button>
              <button className="text-red-400 text-xs" onClick={() => api.delete(`/api/admin/exams/${e.id}`).then(load)}>remove</button>
            </div>
          </div>
        ))}
        <div className="text-xs text-neutral-500 mt-2 mb-3">Seat CSV columns: seat, student_reg_no, student_name, department</div>
        <div className="grid grid-cols-2 gap-2">
          <input className="input" placeholder="Exam name" value={exam.name} onChange={e => setExam({ ...exam, name: e.target.value })} />
          <input className="input" placeholder="Course code" value={exam.course_code} onChange={e => setExam({ ...exam, course_code: e.target.value })} />
          <input className="input" placeholder="Department" value={exam.department} onChange={e => setExam({ ...exam, department: e.target.value })} />
          <input className="input" placeholder="Semester" value={exam.semester} onChange={e => setExam({ ...exam, semester: e.target.value })} />
          <input className="input" type="date" value={exam.date} onChange={e => setExam({ ...exam, date: e.target.value })} />
          <div className="flex gap-2">
            <input className="input" type="time" value={exam.start_time} onChange={e => setExam({ ...exam, start_time: e.target.value })} />
            <input className="input" type="time" value={exam.end_time} onChange={e => setExam({ ...exam, end_time: e.target.value })} />
          </div>
          <select className="input col-span-2" value={exam.hall_id} onChange={e => setExam({ ...exam, hall_id: e.target.value })}>
            <option value="">Select hall</option>
            {halls.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
          </select>
        </div>
        <button className="btn-ghost mt-2" onClick={addExam} disabled={!exam.name}>Add exam</button>
      </div>
    </div>
  )
}
