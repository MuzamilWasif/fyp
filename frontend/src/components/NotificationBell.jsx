import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../lib/api'
import useAlertsSocket from '../lib/useAlertsSocket'

export default function NotificationBell() {
  const [items, setItems] = useState([])
  const [open, setOpen] = useState(false)
  const event = useAlertsSocket()

  const load = () => api.get('/api/notifications').then(r => setItems(r.data)).catch(() => {})
  useEffect(() => { load() }, [])
  useEffect(() => { if (event?.type === 'notification') load() }, [event])

  const unread = items.filter(i => !i.is_read).length

  const markRead = (id) => api.post(`/api/notifications/${id}/read`).then(load)

  return (
    <div className="relative">
      <button onClick={() => setOpen(o => !o)} className="btn-ghost relative">
        Notifications
        {unread > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">{unread}</span>}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto card z-20">
          {items.length === 0 && <div className="text-sm text-neutral-400">No notifications</div>}
          {items.map(n => (
            <div key={n.id} className={`py-2 border-b border-neutral-800 last:border-0 ${n.is_read ? 'opacity-60' : ''}`}>
              <div className="text-sm font-medium">{n.title}</div>
              {n.body && <div className="text-xs text-neutral-400">{n.body}</div>}
              <div className="flex gap-3 mt-1 text-xs">
                {n.case_id && <Link className="text-brand" to={`/cases/${n.case_id}`} onClick={() => setOpen(false)}>Open case</Link>}
                {!n.is_read && <button className="text-neutral-400 hover:text-white" onClick={() => markRead(n.id)}>Mark read</button>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
