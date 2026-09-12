import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Video, VideoOff, Siren, ShieldCheck, Radio, RefreshCw, Maximize2, Settings2, Circle
} from 'lucide-react'
import api from '../lib/api'
import useAlertsSocket from '../lib/useAlertsSocket'
import { useAuth } from '../lib/auth'
import { humanize, timeAgo, severityTone, pct, errorMessage } from '../lib/format'
import { useToast } from '../lib/toast'
import { PageHeader, Card, Button, EmptyState, Skeleton, Modal } from '../components/ui'

const POLL_MS = 20000

function CameraTile({ cam, live, onExpand }) {
  // A camera can be configured and still be unreachable — the detection engine
  // may simply not be running. Show that plainly instead of a broken image.
  const [failed, setFailed] = useState(false)
  const streaming = live && !failed

  return (
    <figure className="bg-surface border border-line rounded-2xl overflow-hidden group">
      <div className="relative aspect-video bg-surface-2">
        {live && (
          <img
            src={cam.stream_url}
            alt={`Live feed from ${cam.camera_id}`}
            onError={() => setFailed(true)}
            onLoad={() => setFailed(false)}
            className={`w-full h-full object-cover ${failed ? 'hidden' : ''}`}
          />
        )}

        {streaming ? (
          <button
            onClick={() => onExpand(cam)}
            aria-label={`Expand ${cam.camera_id}`}
            className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/30
                       opacity-0 group-hover:opacity-100 transition-all duration-fast"
          >
            <span className="btn-ghost btn-sm"><Maximize2 size={14} aria-hidden="true" /> Expand</span>
          </button>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-subtle px-4 text-center">
            <VideoOff size={22} aria-hidden="true" />
            <span className="text-small">
              {!live ? 'No stream configured'
                     : 'Stream unreachable — is the detection engine running?'}
            </span>
          </div>
        )}

        <span className={`absolute top-2 left-2 badge ${streaming ? 'badge-danger' : failed ? 'badge-warn' : 'badge-neutral'}`}>
          <Circle size={7} className={streaming ? 'fill-current' : ''} aria-hidden="true" />
          {streaming ? 'LIVE' : failed ? 'UNREACHABLE' : 'OFFLINE'}
        </span>
      </div>
      <figcaption className="flex items-center justify-between gap-2 px-3 py-2.5">
        <span className="text-body font-medium truncate">{cam.camera_id}</span>
        <span className="text-small text-subtle truncate">{cam.hall || 'Unassigned'}</span>
      </figcaption>
    </figure>
  )
}

export default function LiveMonitoring() {
  const { user } = useAuth()
  const toast = useToast()
  const nav = useNavigate()
  const event = useAlertsSocket()

  const [cameras, setCameras] = useState([])
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(null)

  const loadAlerts = useCallback(() => api.get('/api/alerts', { params: { status: 'new' } })
    .then((r) => setAlerts(r.data.slice(0, 10)))
    .catch(() => {}), [])

  useEffect(() => {
    api.get('/api/admin/cameras')
      .then((r) => setCameras(r.data))
      .catch((e) => toast.error('Could not load cameras', errorMessage(e)))
      .finally(() => setLoading(false))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    loadAlerts()
    const t = setInterval(loadAlerts, POLL_MS)
    return () => clearInterval(t)
  }, [loadAlerts])
  useEffect(() => { if (event?.type === 'alert') loadAlerts() }, [event, loadAlerts])

  const { live, offline } = useMemo(() => ({
    live: cameras.filter((c) => c.stream_url && c.is_active),
    offline: cameras.filter((c) => !c.stream_url || !c.is_active)
  }), [cameras])

  return (
    <>
      <PageHeader
        title="Live Monitoring"
        subtitle="Annotated feeds from the on-premises detection engine"
        actions={
          <>
            <Button variant="ghost" icon={RefreshCw} onClick={loadAlerts}>Refresh alerts</Button>
            {['exam_dept', 'admin'].includes(user.role) && (
              <Link to="/setup"><Button variant="ghost" icon={Settings2}>Manage cameras</Button></Link>
            )}
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-3 mb-4 text-small">
        {/* these count configuration, not reachability — each tile reports whether
            its stream actually answered */}
        <span className="badge-ok"><Video size={11} aria-hidden="true" />{live.length} stream configured</span>
        <span className="badge-neutral"><VideoOff size={11} aria-hidden="true" />{offline.length} without a stream</span>
        <span className="inline-flex items-center gap-1.5 text-subtle">
          <Radio size={13} className="text-brand" aria-hidden="true" /> Alerts refresh every 20s
        </span>
      </div>

      <div className="grid lg:grid-cols-3 gap-4 items-start">
        <div className="lg:col-span-2">
          {loading ? (
            <div className="grid sm:grid-cols-2 gap-3">
              {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="aspect-[16/11]" />)}
            </div>
          ) : cameras.length === 0 ? (
            <Card>
              <EmptyState
                icon={VideoOff}
                title="No cameras registered"
                description="Add the exam-hall cameras under Exams & Halls, then point each one at the detection engine's MJPEG stream."
                action={['exam_dept', 'admin'].includes(user.role)
                  ? <Link to="/setup"><Button variant="brand" icon={Settings2}>Set up cameras</Button></Link>
                  : undefined}
              />
            </Card>
          ) : (
            <>
              <div className="grid sm:grid-cols-2 gap-3">
                {live.map((c) => <CameraTile key={c.id} cam={c} live onExpand={setExpanded} />)}
                {offline.map((c) => <CameraTile key={c.id} cam={c} live={false} onExpand={setExpanded} />)}
              </div>
              {live.length === 0 && (
                <p className="text-small text-subtle mt-3">
                  No feed is streaming. Run <code className="kbd">python run.py</code> in the
                  {' '}<code className="kbd">detection/</code> folder on the hall machine, then set each
                  camera's stream URL (for example <code className="kbd">http://localhost:8090/stream/CAM-A101-1</code>).
                </p>
              )}
            </>
          )}
        </div>

        <Card title="Unhandled alerts" icon={Siren}
              subtitle={alerts.length ? `${alerts.length} awaiting review` : undefined}
              action={<Link to="/alerts"><Button size="sm" variant="subtle">Open</Button></Link>}>
          {alerts.length === 0 ? (
            <EmptyState icon={ShieldCheck} title="All clear"
                        description="No unhandled detections in any hall." className="py-8" />
          ) : (
            <ul className="space-y-2">
              {alerts.map((a) => {
                const tone = severityTone(a.severity)
                return (
                  <li key={a.id}>
                    <button
                      onClick={() => nav('/alerts')}
                      className={`w-full text-left panel p-3 border ${tone.ring}
                                  hover:border-line-strong transition-colors duration-fast`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-body font-medium capitalize truncate">{humanize(a.label)}</span>
                        <span className={tone.badge}>{pct(a.severity)}</span>
                      </div>
                      <div className="text-small text-subtle mt-1 truncate">
                        {a.camera_id}{a.room && ` · ${a.room}`} · {timeAgo(a.created_at)}
                      </div>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </Card>
      </div>

      <Modal
        open={!!expanded}
        onClose={() => setExpanded(null)}
        size="xl"
        title={expanded?.camera_id}
        description={expanded?.hall ? `Hall ${expanded.hall}` : undefined}
      >
        {expanded && (
          <img src={expanded.stream_url} alt={`Live feed from ${expanded.camera_id}`}
               className="w-full rounded-xl bg-surface-2" />
        )}
      </Modal>
    </>
  )
}
