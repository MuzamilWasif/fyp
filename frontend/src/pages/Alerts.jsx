import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Siren, Check, X, FilePlus2, ShieldCheck, RefreshCw, Camera, Radio
} from 'lucide-react'
import api from '../lib/api'
import useAlertsSocket from '../lib/useAlertsSocket'
import { useToast } from '../lib/toast'
import { humanize, timeAgo, formatDateTime, severityTone, pct, errorMessage } from '../lib/format'
import {
  PageHeader, Card, Button, EmptyState, Tabs, Skeleton, ConfirmDialog
} from '../components/ui'

const POLL_MS = 20000

const STATUS_TONE = {
  new: 'badge-danger',
  acknowledged: 'badge-info',
  dismissed: 'badge-neutral',
  case_created: 'badge-ok'
}

function AlertRow({ a, onAck, onDismiss, onCreate, busy }) {
  const tone = severityTone(a.severity)
  return (
    <article className={`bg-surface border ${a.status === 'new' ? tone.ring : 'border-line'}
                         rounded-2xl p-4 flex flex-col lg:flex-row lg:items-center gap-4`}>
      {/* severity dial */}
      <div className="flex items-center gap-3 lg:w-56 shrink-0">
        <div className={`w-11 h-11 rounded-xl bg-surface-2 border ${tone.ring} flex items-center justify-center shrink-0`}>
          <Siren size={18} className={tone.text} aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <div className="text-body font-semibold capitalize truncate">{humanize(a.label)}</div>
          <div className="text-small text-subtle truncate">{a.camera_id}{a.room && ` · ${a.room}`}</div>
        </div>
      </div>

      {/* severity bar */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between text-small mb-1.5">
          <span className={`font-medium ${tone.text}`}>{tone.label} · suspicion {pct(a.severity)}</span>
          <span className="text-subtle tnum">confidence {pct(a.confidence)} · {a.frame_count} frames</span>
        </div>
        <div className="h-1.5 rounded-full bg-surface-2 overflow-hidden" role="img"
             aria-label={`Suspicion score ${pct(a.severity)}`}>
          <div className={`h-full rounded-full ${tone.bar}`} style={{ width: pct(a.severity) }} />
        </div>
        <div className="text-small text-subtle mt-1.5" title={formatDateTime(a.created_at)}>
          {timeAgo(a.created_at)}
        </div>
      </div>

      {/* status + actions */}
      <div className="flex flex-wrap items-center gap-2 lg:justify-end lg:w-[390px] shrink-0">
        <span className={STATUS_TONE[a.status] || 'badge-neutral'}>{humanize(a.status)}</span>
        {a.status === 'new' && (
          <>
            <Button size="sm" variant="ghost" icon={Check} onClick={() => onAck(a)} loading={busy === `ack-${a.id}`}>
              Acknowledge
            </Button>
            <Button size="sm" variant="subtle" icon={X} onClick={() => onDismiss(a)}>
              Dismiss
            </Button>
          </>
        )}
        {['new', 'acknowledged'].includes(a.status) && (
          <Button size="sm" variant="brand" icon={FilePlus2} onClick={() => onCreate(a)}>
            Create case
          </Button>
        )}
        {a.case_id && (
          <Button size="sm" variant="outline" onClick={() => onCreate(a, true)}>View case</Button>
        )}
      </div>
    </article>
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
      <PageHeader
        title="Live AI Alerts"
        subtitle="Confirmed detections from the surveillance engine, ranked by suspicion score"
        actions={
          <Button variant="ghost" icon={RefreshCw} onClick={() => { setLoading(true); load(false) }}>
            Refresh
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <Tabs
          value={tab}
          onChange={setTab}
          tabs={[
            { value: 'new', label: 'Unhandled', count: counts.new },
            { value: 'all', label: 'All alerts', count: counts.all }
          ]}
        />
        <span className="inline-flex items-center gap-1.5 text-small text-subtle">
          <Radio size={13} className="text-brand" aria-hidden="true" />
          Auto-refreshing every 20s
        </span>
      </div>

      {/* severity legend */}
      <div className="flex flex-wrap items-center gap-3 mb-4 text-small text-subtle">
        <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-danger" aria-hidden="true" />Critical ≥ 70%</span>
        <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-warn" aria-hidden="true" />Elevated ≥ 50%</span>
        <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-brand" aria-hidden="true" />Low</span>
      </div>

      {loading ? (
        <div className="grid gap-3">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-[104px]" />)}
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
        <div className="grid gap-3">
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
