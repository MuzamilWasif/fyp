import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, CheckCheck } from 'lucide-react'
import api from '../lib/api'
import useAlertsSocket from '../lib/useAlertsSocket'
import { timeAgo } from '../lib/format'
import EmptyState from './ui/EmptyState'

const POLL_MS = 30000

export default function NotificationBell() {
  const [items, setItems] = useState([])
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const wrapRef = useRef(null)
  const nav = useNavigate()
  const event = useAlertsSocket()

  const load = () => api.get('/api/notifications').then((r) => setItems(r.data)).catch(() => {})

  // Polling is the primary refresh (serverless has no WebSockets); a socket
  // event, when one is available on-prem, just refreshes early.
  useEffect(() => {
    load()
    const t = setInterval(load, POLL_MS)
    return () => clearInterval(t)
  }, [])
  useEffect(() => { if (event?.type === 'notification') load() }, [event])

  useEffect(() => {
    if (!open) return undefined
    const onDown = (e) => { if (!wrapRef.current?.contains(e.target)) setOpen(false) }
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey) }
  }, [open])

  const unread = items.filter((i) => !i.is_read)

  const openNotification = async (n) => {
    setOpen(false)
    if (!n.is_read) {
      setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, is_read: true } : x))) // optimistic
      api.post(`/api/notifications/${n.id}/read`).catch(load)
    }
    if (n.case_id) nav(`/cases/${n.case_id}`)
  }

  const markAll = async () => {
    if (!unread.length) return
    setBusy(true)
    setItems((prev) => prev.map((x) => ({ ...x, is_read: true }))) // optimistic
    try {
      await api.post('/api/notifications/read-all')
    } catch { load() } finally { setBusy(false) }
  }

  return (
    <div className="relative" ref={wrapRef}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={unread.length ? `Notifications, ${unread.length} unread` : 'Notifications'}
        aria-expanded={open}
        aria-haspopup="true"
        className="btn-subtle btn-icon relative text-muted hover:text-fg"
      >
        <Bell size={18} aria-hidden="true" />
        {unread.length > 0 && (
          <span className="absolute top-0.5 right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-brand
                           text-brand-fg text-[10px] font-bold flex items-center justify-center tnum">
            {unread.length > 99 ? '99+' : unread.length}
          </span>
        )}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-[calc(100vw-2rem)] sm:w-96 max-h-[70vh] overflow-hidden
                     bg-surface-3 border border-line rounded-2xl shadow-e3 z-50 animate-slide-down flex flex-col"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-line">
            <span className="text-body font-semibold">Notifications</span>
            <button
              onClick={markAll}
              disabled={!unread.length || busy}
              className="text-small text-muted hover:text-brand disabled:opacity-40 transition-colors duration-fast
                         inline-flex items-center gap-1.5"
            >
              <CheckCheck size={14} aria-hidden="true" /> Mark all read
            </button>
          </div>

          <div className="overflow-y-auto">
            {items.length === 0 ? (
              <EmptyState
                icon={Bell}
                title="You're all caught up"
                description="Case updates and AI alerts will appear here."
                className="py-8"
              />
            ) : items.map((n) => (
              <button
                key={n.id}
                role="menuitem"
                onClick={() => openNotification(n)}
                className={`w-full text-left px-4 py-3 border-b border-line last:border-0
                            transition-colors duration-fast hover:bg-surface-2
                            ${n.is_read ? 'opacity-60' : ''}`}
              >
                <div className="flex items-start gap-2">
                  {!n.is_read && <span className="w-1.5 h-1.5 rounded-full bg-brand mt-1.5 shrink-0" aria-hidden="true" />}
                  <div className="min-w-0 flex-1">
                    <div className="text-body font-medium text-fg break-words">{n.title}</div>
                    {n.body && <div className="text-small text-muted mt-0.5 break-words line-clamp-2">{n.body}</div>}
                    <div className="text-micro text-subtle mt-1">{timeAgo(n.created_at)}</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
