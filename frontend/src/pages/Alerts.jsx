import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../lib/api'
import useAlertsSocket from '../lib/useAlertsSocket'

export default function Alerts() {
  const [alerts, setAlerts] = useState([])
  const event = useAlertsSocket()
  const nav = useNavigate()

  const load = () => api.get('/api/alerts').then(r => setAlerts(r.data)).catch(() => {})
  useEffect(() => { load() }, [])
  useEffect(() => { if (event?.type === 'alert') load() }, [event])

  const act = (id, action) => api.post(`/api/alerts/${id}/${action}`).then(load)

  const createCase = (a) => {
    const q = new URLSearchParams({ alert_id: a.id, camera_id: a.camera_id, room: a.room, label: a.label })
    nav(`/cases/new?${q.toString()}`)
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Live AI Alerts</h1>
      <p className="text-sm text-neutral-400 mb-4">Confirmed detections from the surveillance engine, updated in real time.</p>
      <div className="grid gap-3">
        {alerts.map(a => (
          <div key={a.id} className="card flex items-center justify-between">
            <div>
              <div className="font-semibold">{a.label.replaceAll('_', ' ')}
                <span className="text-neutral-400 font-normal"> · {a.camera_id}{a.room && ` (${a.room})`}</span></div>
              <div className="text-xs text-neutral-500">
                suspicion {(a.severity * 100).toFixed(0)}% · confidence {(a.confidence * 100).toFixed(0)}% · {a.frame_count} frames · {new Date(a.created_at).toLocaleString()}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`badge ${a.severity >= 0.7 ? 'bg-red-500/20 text-red-400' : a.severity >= 0.5 ? 'bg-amber-500/20 text-amber-400' : 'bg-neutral-700 text-neutral-300'}`}>sev {(a.severity * 100).toFixed(0)}</span>
              <span className={`badge ${a.status === 'new' ? 'bg-red-500/20 text-red-400' : 'bg-neutral-700 text-neutral-300'}`}>{a.status.replaceAll('_',' ')}</span>
              {a.status === 'new' && <>
                <button className="btn-ghost" onClick={() => act(a.id, 'acknowledge')}>Acknowledge</button>
                <button className="btn-ghost" onClick={() => act(a.id, 'dismiss')}>Dismiss</button>
              </>}
              {['new', 'acknowledged'].includes(a.status) &&
                <button className="btn-brand" onClick={() => createCase(a)}>Create case</button>}
            </div>
          </div>
        ))}
        {alerts.length === 0 && <div className="text-neutral-500 text-sm">No alerts. Start the detection engine to receive live events.</div>}
      </div>
    </div>
  )
}
