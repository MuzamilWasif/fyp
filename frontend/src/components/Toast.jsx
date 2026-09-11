import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import useAlertsSocket from '../lib/useAlertsSocket'

export default function ToastHost() {
  const event = useAlertsSocket()
  const [toasts, setToasts] = useState([])

  useEffect(() => {
    if (!event) return
    const id = Date.now()
    let t = null
    if (event.type === 'alert') {
      t = { id, title: `AI alert: ${event.label?.replaceAll('_', ' ')}`,
            body: `${event.camera_id}${event.room ? ` (${event.room})` : ''} · severity ${(event.severity * 100 || 0).toFixed(0)}%`,
            to: '/alerts' }
    } else if (event.type === 'notification') {
      t = { id, title: event.title, body: event.body, to: event.case_id ? `/cases/${event.case_id}` : null }
    }
    if (t) {
      setToasts(prev => [...prev.slice(-2), t])
      setTimeout(() => setToasts(prev => prev.filter(x => x.id !== id)), 6000)
    }
  }, [event])

  return (
    <div className="toast-wrap no-print">
      {toasts.map(t => (
        <div key={t.id} className="toast">
          <div className="text-sm font-semibold text-brand">{t.title}</div>
          {t.body && <div className="text-xs text-neutral-300 mt-0.5">{t.body}</div>}
          {t.to && <Link to={t.to} className="text-xs text-brand underline">View</Link>}
        </div>
      ))}
    </div>
  )
}
