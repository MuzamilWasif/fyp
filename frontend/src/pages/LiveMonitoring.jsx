import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../lib/api'
import useAlertsSocket from '../lib/useAlertsSocket'

export default function LiveMonitoring() {
  const [cameras, setCameras] = useState([])
  const [alerts, setAlerts] = useState([])
  const event = useAlertsSocket()
  const nav = useNavigate()

  useEffect(() => { api.get('/api/admin/cameras').then(r => setCameras(r.data)).catch(() => {}) }, [])
  const loadAlerts = () => api.get('/api/alerts', { params: { status: 'new' } }).then(r => setAlerts(r.data.slice(0, 8))).catch(() => {})
  useEffect(() => { loadAlerts() }, [])
  useEffect(() => { if (event?.type === 'alert') loadAlerts() }, [event])

  const withStream = cameras.filter(c => c.stream_url && c.is_active)
  const offline = cameras.filter(c => !c.stream_url || !c.is_active)

  return (
    <div className="grid lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2">
        <h1 className="text-2xl font-bold mb-1">Live Monitoring</h1>
        <p className="text-sm text-neutral-400 mb-4">Annotated feeds from the detection engine. Bounding boxes mark UFM-relevant objects.</p>
        <div className="grid md:grid-cols-2 gap-3">
          {withStream.map(c => (
            <div key={c.id} className="card p-2">
              <img src={c.stream_url} alt={c.camera_id} className="rounded-xl w-full aspect-video object-cover bg-neutral-900" />
              <div className="flex justify-between items-center px-1 pt-2 text-sm">
                <span className="font-medium">{c.camera_id}</span>
                <span className="text-neutral-400">{c.hall}</span>
              </div>
            </div>
          ))}
          {withStream.length === 0 && (
            <div className="card md:col-span-2 text-sm text-neutral-400">
              No live streams. Start the detection engine (<code className="text-brand">python run.py</code> in <code>detection/</code>) and set each camera's stream URL under Exams &amp; Halls, e.g. <code>http://localhost:8090/stream/CAM-A101-1</code>.
            </div>
          )}
          {offline.map(c => (
            <div key={c.id} className="card p-2 opacity-60">
              <div className="rounded-xl w-full aspect-video bg-neutral-900 flex items-center justify-center text-neutral-600 text-sm">no stream</div>
              <div className="flex justify-between items-center px-1 pt-2 text-sm">
                <span>{c.camera_id}</span><span className="text-neutral-500">{c.hall}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div>
        <h2 className="text-lg font-semibold mb-3 mt-1">Unhandled alerts</h2>
        <div className="grid gap-2">
          {alerts.map(a => (
            <button key={a.id} onClick={() => nav('/alerts')} className="card text-left hover:border-brand transition-colors">
              <div className="flex justify-between items-center">
                <span className="font-medium text-sm">{a.label.replaceAll('_', ' ')}</span>
                <span className={`badge ${a.severity >= 0.7 ? 'bg-red-500/20 text-red-400' : a.severity >= 0.5 ? 'bg-amber-500/20 text-amber-400' : 'bg-neutral-700 text-neutral-300'}`}>
                  {(a.severity * 100).toFixed(0)}%
                </span>
              </div>
              <div className="text-xs text-neutral-500 mt-1">{a.camera_id}{a.room && ` · ${a.room}`} · {new Date(a.created_at).toLocaleTimeString()}</div>
            </button>
          ))}
          {alerts.length === 0 && <div className="text-sm text-neutral-500">All clear.</div>}
        </div>
      </div>
    </div>
  )
}
