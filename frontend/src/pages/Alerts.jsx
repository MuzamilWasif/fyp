import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Siren, FilePlus2, ShieldCheck, RefreshCw, Camera
} from 'lucide-react'
import api from '../lib/api'
import useAlertsSocket from '../lib/useAlertsSocket'
import { useToast } from '../lib/toast'
import { humanize, timeAgo, formatDateTime, severityTone, pct, errorMessage } from '../lib/format'
import {
  Card, Button, EmptyState, Tabs, Skeleton, ConfirmDialog
} from '../components/ui'

const POLL_MS = 20000

const STATUS_TONE = {
  new: 'badge-danger',
  acknowledged: 'badge-info',
  dismissed: 'badge-neutral',
  case_created: 'badge-ok'
}

/** One row of the detection ledger. */
function AlertRow({ a, onAck, onDismiss, onCreate, busy }) {
  const tone = severityTone(a.severity)
  const sev = Math.round((a.severity || 0) * 100)
  const conf = Math.round((a.confidence || 0) * 100)
  const colour = tone.key === 'critical' ? '#FF4D4D' : tone.key === 'elevated' ? '#FFB020' : '#2DE3A7'

  return (
    <div
      className="grid items-center gap-4 px-6 py-3.5 border-b border-line last:border-0
                 transition-colors duration-fast hover:bg-surface-2
                 grid-cols-[52px_minmax(0,1fr)_auto] lg:grid-cols-[56px_minmax(0,1fr)_190px_130px_76px_212px]"
      style={{ boxShadow: `inset 2px 0 0 0 ${a.status === 'new' ? colour : 'transparent'}` }}
    >
      <span className="font-mono text-body font-semibold tnum" style={{ color: colour }}>{sev}</span>

      <div className="flex items-center gap-2.5 min-w-0">
        <Siren size={16} strokeWidth={1.7} style={{ color: colour }} className="shrink-0" aria-hidden="true" />
        <span className="text-body text-fg truncate capitalize">{humanize(a.label)}</span>
        <span className={`${STATUS_TONE[a.status] || 'badge-neutral'} shrink-0`}>{humanize(a.status)}</span>
      </div>

      <span className="hidden lg:block font-mono text-micro text-subtle truncate">
        {a.camera_id}{a.room && ` · ${a.room}`}
      </span>

      <div className="hidden lg:flex items-center gap-2">
        <span className="flex-1 h-1 rounded-sm bg-line relative overflow-hidden">
          <span className="absolute inset-y-0 left-0 rounded-sm"
                style={{ width: `${conf}%`, background: colour }} />
        </span>
        <span className="font-mono text-micro text-muted tnum">{(a.confidence || 0).toFixed(2)}</span>
      </div>

      <span className="hidden lg:block font-mono text-micro text-faint" title={formatDateTime(a.created_at)}>
        {timeAgo(a.created_at)}
      </span>

      <div className="flex gap-1.5 justify-end">
        {a.status === 'new' && (
          <>
            <Button size="sm" variant="subtle" onClick={() => onDismiss(a)}>Dismiss</Button>
            <Button size="sm" variant="ghost" onClick={() => onAck(a)} loading={busy === `ack-${a.id}`}>Ack</Button>
          </>
        )}
        {['new', 'acknowledged'].includes(a.status) && (
          <Button size="sm" variant="outline" onClick={() => onCreate(a)}>Create case</Button>
        )}
        {a.case_id && (
          <Button size="sm" variant="ghost" onClick={() => onCreate(a, true)}>View case</Button>
        )}
      </div>
    </div>
  )
}

export default function Alerts() {
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('new')
  const [busy, setBusy] = useState('')
  const [dismissing, setDismissing] = useState(null)
  const event = useAlertsSocket()
  const nav = useNavigate()
  const toast = useToast()

  const load = useCallback((quiet = true) => api.get('/api/alerts')
    .then((r) => setAlerts(r.data))
    .catch((e) => { if (!quiet) toast.error('Could not load alerts', errorMessage(e)) })
    .finally(() => setLoading(false)), []) // eslint-disable-line react-hooks/exhaustive-deps

  // Polling keeps this page live where WebSockets are unavailable (serverless).
  useEffect(() => {
    load()
    const t = setInterval(load, POLL_MS)
    return () => clearInterval(t)
  }, [load])
  useEffect(() => { if (event?.type === 'alert') load() }, [event, load])

  const counts = useMemo(() => ({
    new: alerts.filter((a) => a.status === 'new').length,
    all: alerts.length
  }), [alerts])

  const rows = useMemo(() => {
    const list = tab === 'new' ? alerts.filter((a) => a.status === 'new') : alerts
    return [...list].sort((a, b) => (b.severity - a.severity) || (new Date(b.created_at) - new Date(a.created_at)))
  }, [alerts, tab])

  const act = async (a, action) => {
    setBusy(`${action === 'acknowledge' ? 'ack' : 'dis'}-${a.id}`)
    setAlerts((prev) => prev.map((x) => // optimistic
      x.id === a.id ? { ...x, status: action === 'acknowledge' ? 'acknowledged' : 'dismissed' } : x))
    try {
      await api.post(`/api/alerts/${a.id}/${action}`)
      toast.success(action === 'acknowledge' ? 'Alert acknowledged' : 'Alert dismissed', humanize(a.label))
    } catch (e) {
      toast.error('Could not update the alert', errorMessage(e))
      load(false)
    } finally { setBusy(''); setDismissing(null) }
  }

  const createCase = (a, view = false) => {
    if (view && a.case_id) { nav(`/cases/${a.case_id}`); return }
    const q = new URLSearchParams({
      alert_id: a.id, camera_id: a.camera_id, room: a.room || '', label: a.label
    })
    nav(`/cases/new?${q.toString()}`)
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-3.5 mb-5">
        <h1 className="font-display text-title font-semibold text-fg">Live Alerts</h1>
        <span className="pill-live">
          <span className="w-1.5 h-1.5 rounded-full bg-brand animate-ve-dot" aria-hidden="true" />
          streaming
        </span>
        <div className="flex-1" />
        <span className="font-mono text-micro text-subtle tnum">
          {counts.new} unhandled · {counts.all} total
        </span>
        <Button variant="ghost" icon={RefreshCw} onClick={() => { setLoading(true); load(false) }}>
          Refresh
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <Tabs
          value={tab}
          onChange={setTab}
          tabs={[
            { value: 'new', label: 'Unhandled', count: counts.new },
            { value: 'all', label: 'All alerts', count: counts.all }
          ]}
        />
        <div className="flex-1" />
        <div className="flex flex-wrap items-center gap-3 font-mono text-micro text-faint uppercase">
          <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-danger" aria-hidden="true" />crit ≥ 70</span>
          <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-warn" aria-hidden="true" />elev ≥ 50</span>
          <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-brand" aria-hidden="true" />low</span>
        </div>
      </div>

      {loading ? (
        <div className="bg-surface border border-line rounded-2xl p-6 space-y-3">
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-11" />)}
        </div>
      ) : rows.length === 0 ? (
        <Card>
          <EmptyState
            icon={tab === 'new' ? ShieldCheck : Camera}
            title={tab === 'new' ? 'All clear' : 'No alerts recorded'}
            description={
              tab === 'new'
                ? 'No unhandled detections. New AI alerts appear here automatically and raise a notification.'
                : 'Start the detection engine on the exam-hall machine to begin receiving live events.'
            }
            action={tab === 'new' && counts.all > 0
              ? <Button variant="ghost" onClick={() => setTab('all')}>View all alerts</Button>
              : undefined}
          />
        </Card>
      ) : (
        <div className="bg-surface border border-line rounded-2xl overflow-hidden">
          <div className="hidden lg:grid items-center gap-4 px-6 py-3.5 bg-chrome border-b border-line
                          grid-cols-[56px_minmax(0,1fr)_190px_130px_76px_212px]
                          font-mono text-micro uppercase text-subtle">
            <div>sev</div><div>detection</div><div>camera · hall</div>
            <div>confidence</div><div>age</div><div />
          </div>
          {rows.map((a) => (
            <AlertRow
              key={a.id}
              a={a}
              busy={busy}
              onAck={(x) => act(x, 'acknowledge')}
              onDismiss={(x) => setDismissing(x)}
              onCreate={createCase}
            />
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!dismissing}
        onClose={() => setDismissing(null)}
        onConfirm={() => act(dismissing, 'dismiss')}
        title="Dismiss this alert?"
        description="It will be marked as reviewed with no further action. The alert stays on the audit trail."
        confirmLabel="Dismiss alert"
        tone="danger"
      >
        {dismissing && (
          <p className="text-body text-muted capitalize">
            {humanize(dismissing.label)} · {dismissing.camera_id} · suspicion {pct(dismissing.severity)}
          </p>
        )}
      </ConfirmDialog>
    </>
  )
}
