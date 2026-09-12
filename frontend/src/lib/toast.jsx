import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { CheckCircle2, AlertTriangle, Info, X, Siren } from 'lucide-react'

const ToastCtx = createContext(null)

const TONES = {
  success: { icon: CheckCircle2, cls: 'text-ok', border: 'border-ok/30' },
  error: { icon: AlertTriangle, cls: 'text-danger', border: 'border-danger/30' },
  info: { icon: Info, cls: 'text-info', border: 'border-info/30' },
  alert: { icon: Siren, cls: 'text-brand', border: 'border-brand/30' }
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const timers = useRef({})

  const dismiss = useCallback((id) => {
    clearTimeout(timers.current[id])
    delete timers.current[id]
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const push = useCallback((toast) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    const entry = { id, tone: 'info', duration: 5000, ...toast }
    setToasts((prev) => [...prev.slice(-3), entry])
    if (entry.duration > 0) {
      timers.current[id] = setTimeout(() => dismiss(id), entry.duration)
    }
    return id
  }, [dismiss])

  const api = useMemo(() => ({
    push,
    dismiss,
    success: (title, body) => push({ tone: 'success', title, body }),
    error: (title, body) => push({ tone: 'error', title, body, duration: 7000 }),
    info: (title, body) => push({ tone: 'info', title, body })
  }), [push, dismiss])

  return (
    <ToastCtx.Provider value={api}>
      {children}
      <div className="toast-wrap no-print" role="region" aria-label="Notifications">
        {toasts.map((t) => {
          const tone = TONES[t.tone] || TONES.info
          const Icon = tone.icon
          return (
            <div
              key={t.id}
              role="status"
              aria-live="polite"
              className={`bg-surface-3 border ${tone.border} rounded-xl px-4 py-3 shadow-e3 animate-slide-up flex gap-3`}
            >
              <Icon size={18} className={`${tone.cls} shrink-0 mt-0.5`} aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <div className="text-body font-semibold text-fg break-words">{t.title}</div>
                {t.body && <div className="text-small text-muted mt-0.5 break-words">{t.body}</div>}
                {t.to && (
                  <Link to={t.to} onClick={() => dismiss(t.id)} className="link text-small mt-1 inline-block">
                    View details
                  </Link>
                )}
              </div>
              <button
                onClick={() => dismiss(t.id)}
                aria-label="Dismiss notification"
                className="text-subtle hover:text-fg transition-colors duration-fast shrink-0 self-start"
              >
                <X size={16} />
              </button>
            </div>
          )
        })}
      </div>
    </ToastCtx.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastCtx)
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>')
  return ctx
}
