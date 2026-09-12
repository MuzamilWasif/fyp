import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  FolderOpen, FileCheck2, PauseCircle, Siren, Gavel, ClipboardCheck, Building2,
  ShieldAlert, Layers, ArrowRight, CheckCircle2, FilePlus2, BookLock, Inbox,
  TrendingUp, CalendarClock, Video, VideoOff
} from 'lucide-react'
import api from '../lib/api'
import { useAuth } from '../lib/auth'
import {
  ROLE_LABELS, humanize, timeAgo, formatDate, ACTION_STATUSES, severityTone, currentStage
} from '../lib/format'
import { StatCard, Card, EmptyState, Button, StatusBadge, Skeleton } from '../components/ui'
import { MonthlyCasesChart, BreakdownChart, DonutChart } from '../components/charts'
import CaseProgress from '../components/CaseProgress'
import SeverityDial from '../components/SeverityDial'

/* roles whose token is accepted by the hall/exam endpoints */
const HALL_ROLES = ['invigilator', 'hod', 'exam_dept', 'admin']

const SUBTITLE = {
  invigilator: 'Report unfair means and track what you have submitted.',
  hod: 'Verify and sign off cases raised in your department.',
  dec: 'Review departmental cases before they reach the Examination Department.',
  exam_dept: 'Hold results, block transcripts and keep the institution’s records straight.',
  ufm_committee: 'Decide cases and award penalties.',
  student: 'Track any case registered against you and respond to it.',
  admin: 'Full institutional view of detection, cases and users.'
}

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

/** Each role gets the four figures its job actually turns on. */
function cardsFor(role, s, trend) {
  const d = s?.deltas || {}
  const series = Object.values(trend || {})
  const tail = series.slice(-8)

  const common = {
    total: { key: 'total', label: 'Total cases', value: s?.total_cases, tone: 'default', delta: d.total_cases, spark: tail },
    open: { key: 'open', label: 'Open cases', value: s?.open_cases, tone: 'warn' },
    decided: { key: 'decided', label: 'Decided', value: s?.decided_cases, tone: 'ok', delta: d.decided_cases },
    holds: { key: 'holds', label: 'Results on hold', value: s?.result_holds, tone: 'danger' },
    blocks: { key: 'blocks', label: 'Transcripts blocked', value: s?.transcript_blocks, tone: 'danger' },
    alerts: { key: 'alerts', label: 'Active alerts', value: s?.new_alerts, tone: 'danger', pulse: true }
  }
  const action = (label) => ({
    key: 'action', label, value: s?.action_required, tone: 'brand', pulse: (s?.action_required || 0) > 0,
    hint: s?.action_required ? 'Waiting on you' : 'Nothing pending'
  })

  switch (role) {
    case 'invigilator':
      return [common.alerts, { ...common.total, label: 'Cases I reported' }, action('Returned to me'), common.open]
    case 'hod':
      return [action('Awaiting my verification'), common.total, common.open, common.holds]
    case 'dec':
      return [action('Awaiting DEC review'), common.total, common.open, common.decided]
    case 'exam_dept':
      return [action('Awaiting my action'), common.holds, common.blocks, common.total]
    case 'ufm_committee':
      return [action('Awaiting decision'), common.decided, common.total, common.holds]
    case 'student':
      return [
        { ...common.total, label: 'My cases' },
        { ...common.open, label: 'In progress' },
        common.decided,
        { ...common.holds, label: 'Results on hold' }
      ]
    default:
      return [common.alerts, common.total, common.open, common.holds]
  }
}

const ACTION_ICON = { hod: ClipboardCheck, dec: Layers, exam_dept: PauseCircle, ufm_committee: Gavel }

/* ------------------------------------------------------------- queue row */
function QueueRow({ c, onOpen }) {
  // which of the six lifecycle stages this case sits at, 1-based
  const stage = Math.min(6, currentStage(c.status) + 1)
  const progress = Math.round((stage / 6) * 100)
  const tone = c.result_hold ? severityTone(0.8) : severityTone(0.4)

  return (
    <div
      onClick={() => onOpen(c.id)}
      onKeyDown={(e) => { if (e.key === 'Enter') onOpen(c.id) }}
      role="button"
      tabIndex={0}
      className="flex items-center gap-4 px-6 py-4 border-t border-line border-l-2 cursor-pointer
                 transition-colors duration-fast hover:bg-surface-2"
      style={{ borderLeftColor: c.result_hold ? '#FF4D4D' : 'transparent' }}
    >
      <SeverityDial value={progress} label={String(stage)}
                    color={tone.key === 'critical' ? '#FF4D4D' : '#2DE3A7'} />

      <div className="flex-1 min-w-0">
        <div className="text-body font-medium text-fg truncate">
          {c.student_name} · {humanize(c.violation_type)}
        </div>
        <div className="font-mono text-micro text-subtle mt-1.5 truncate">
          {c.case_no} · {c.student_reg_no} · {c.room || 'NO HALL'}{c.seat && ` · ${c.seat}`}
        </div>
      </div>

      <div className="hidden sm:flex items-center gap-2 shrink-0">
        <StatusBadge status={c.status} />
        {c.source === 'ai' && <span className="badge-brand">AI</span>}
      </div>

      <span className="font-mono text-micro text-faint shrink-0 hidden md:block">{timeAgo(c.created_at)}</span>

      <Button size="sm" variant="outline" className="shrink-0"
              onClick={(e) => { e.stopPropagation(); onOpen(c.id) }}>
        Open
      </Button>
    </div>
  )
}

/* ------------------------------------------------------------------ page */
export default function Dashboard() {
  const { user } = useAuth()
  const nav = useNavigate()
  const [stats, setStats] = useState(null)
  const [queue, setQueue] = useState([])
  const [myCases, setMyCases] = useState([])
  const [exams, setExams] = useState([])
  const [cameras, setCameras] = useState([])
  const [loading, setLoading] = useState(true)
  const [queueLoading, setQueueLoading] = useState(true)
  const [clock, setClock] = useState(() => new Date())

  const isStudent = user.role === 'student'
  const hasQueue = (ACTION_STATUSES[user.role] || []).length > 0
  const canSeeHalls = HALL_ROLES.includes(user.role)

  useEffect(() => {
    const t = setInterval(() => setClock(new Date()), 30000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    let alive = true
    api.get('/api/dashboard/stats')
      .then((r) => { if (alive) setStats(r.data) })
      .catch(() => {})
      .finally(() => { if (alive) setLoading(false) })

    const listReq = isStudent
      ? api.get('/api/cases')
      : api.get('/api/cases', { params: { pending: true } })
    listReq
      .then((r) => { if (!alive) return; isStudent ? setMyCases(r.data) : setQueue(r.data) })
      .catch(() => {})
      .finally(() => { if (alive) setQueueLoading(false) })

    if (canSeeHalls) {
      api.get('/api/admin/exams').then((r) => { if (alive) setExams(r.data) }).catch(() => {})
      api.get('/api/admin/cameras').then((r) => { if (alive) setCameras(r.data) }).catch(() => {})
    }
    return () => { alive = false }
  }, [isStudent, canSeeHalls])

  const cards = useMemo(
    () => cardsFor(user.role, stats, stats?.monthly_trend),
    [user.role, stats]
  )
  const showDepartments = stats?.scope === 'institution'
  const firstName = user.full_name.split(' ')[0]
  const liveCameras = cameras.filter((c) => c.stream_url && c.is_active)

  const stamp = `${clock.toLocaleDateString('en-GB', {
    weekday: 'short', day: '2-digit', month: 'short', year: 'numeric'
  }).toUpperCase()} · ${clock.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })} PKT`

  const upcoming = useMemo(
    () => [...exams].sort((a, b) => String(a.date).localeCompare(String(b.date))).slice(0, 4),
    [exams]
  )

  const ActionIcon = ACTION_ICON[user.role] || ClipboardCheck

  return (
    <>
      {/* greeting */}
      <div className="flex flex-wrap items-end justify-between gap-6 mb-6">
        <div className="min-w-0">
          <h1 className="font-display text-display font-semibold text-fg">
            {greeting()}, {firstName}
          </h1>
          <div className="font-mono text-small text-subtle mt-2 tracking-[.04em] tnum">{stamp}</div>
          <p className="text-body text-subtle mt-2">{SUBTITLE[user.role] || 'Maintain integrity, ensure fairness.'}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2 no-print">
          {canSeeHalls && (
            <span className="pill-live">
              <span className="w-1.5 h-1.5 rounded-full bg-brand animate-ve-dot" aria-hidden="true" />
              {liveCameras.length} of {cameras.length} cameras live
            </span>
          )}
          {['invigilator', 'admin'].includes(user.role) && (
            <Link to="/cases/new"><Button variant="brand" icon={FilePlus2}>Report UFM</Button></Link>
          )}
          <Link to="/cases"><Button variant="ghost" icon={FolderOpen}>All cases</Button></Link>
        </div>
      </div>

      {/* stat row */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-5 mb-6">
        {cards.map(({ key, ...card }) => (
          <StatCard
            key={key}
            {...card}
            loading={loading}
            onClick={key === 'action' && hasQueue ? () => nav('/cases?pending=1') : undefined}
          />
        ))}
      </div>

      {/* 60 / 40 */}
      <div className="grid lg:grid-cols-[minmax(0,60fr)_minmax(0,40fr)] gap-5 items-start mb-5">
        {/* left: what this role must act on */}
        {isStudent ? (
          <Card title="My cases" subtitle="Every case registered against your registration number"
                icon={Inbox}
                action={<Link to="/cases"><Button size="sm" variant="subtle" iconRight={ArrowRight}>View all</Button></Link>}>
            {queueLoading ? (
              <div className="space-y-3">{[0, 1].map((i) => <Skeleton key={i} className="h-24" />)}</div>
            ) : myCases.length === 0 ? (
              <EmptyState icon={CheckCircle2} title="No cases against you"
                          description="You have a clean record. Cases would appear here with their full progress." />
            ) : (
              <div className="space-y-3">
                {myCases.slice(0, 4).map((c) => (
                  <Link key={c.id} to={`/cases/${c.id}`}
                        className="block panel p-4 hover:border-line-strong transition-colors duration-fast">
                    <div className="flex items-center justify-between gap-3 mb-4">
                      <div className="min-w-0">
                        <div className="font-mono text-body text-fg">{c.case_no}</div>
                        <div className="text-small text-subtle truncate">
                          {humanize(c.violation_type)} · {c.exam_name || 'Examination'}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {c.result_hold && <span className="badge-danger">Result hold</span>}
                        <StatusBadge status={c.status} />
                      </div>
                    </div>
                    <CaseProgress status={c.status} />
                  </Link>
                ))}
              </div>
            )}
          </Card>
        ) : hasQueue && (
          <section className="bg-surface border border-line rounded-2xl overflow-hidden">
            <header className="flex items-start justify-between gap-3 px-6 pt-[22px] pb-[18px]">
              <div>
                <h2 className="font-display text-subtitle font-semibold text-fg flex items-center gap-2">
                  <ActionIcon size={16} className="text-brand" aria-hidden="true" />
                  Requires your action
                </h2>
                <p className="text-small text-subtle mt-1.5">
                  {queueLoading ? 'Checking the queue…'
                    : queue.length === 0 ? 'Nothing at your stage of the workflow'
                    : `${queue.length} case${queue.length === 1 ? '' : 's'} waiting on the ${ROLE_LABELS[user.role]}`}
                </p>
              </div>
            </header>

            {queueLoading ? (
              <div className="px-6 pb-6 space-y-2">
                {[0, 1, 2].map((i) => <Skeleton key={i} className="h-16" />)}
              </div>
            ) : queue.length === 0 ? (
              <EmptyState icon={CheckCircle2} title="Nothing waiting on you"
                          description="New arrivals appear here and raise a notification." className="py-10" />
            ) : (
              <>
                {queue.slice(0, 5).map((c) => (
                  <QueueRow key={c.id} c={c} onOpen={(id) => nav(`/cases/${id}`)} />
                ))}
                <div className="px-6 py-4 border-t border-line text-center">
                  <Link to="/cases?pending=1" className="link font-mono text-micro tracking-[.06em]">
                    VIEW ALL {queue.length} →
                  </Link>
                </div>
              </>
            )}
          </section>
        )}

        {/* right rail */}
        <div className="flex flex-col gap-5">
          {canSeeHalls && (
            <Card title="Today’s schedule" icon={CalendarClock}
                  subtitle={upcoming.length ? undefined : 'Nothing scheduled'}>
              {upcoming.length === 0 ? (
                <p className="text-small text-subtle">
                  No examinations are scheduled. Add one under Exams &amp; Halls.
                </p>
              ) : (
                <ul className="flex flex-col gap-3.5">
                  {upcoming.map((e) => (
                    <li key={e.id} className="flex items-center gap-3">
                      <span className="font-mono text-small text-subtle w-11 shrink-0 tnum">
                        {e.start_time || '—'}
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="block text-body text-fg font-medium truncate">
                          {e.course_code || e.name}
                        </span>
                        <span className="block text-small text-faint truncate">{e.name}</span>
                      </span>
                      <span className="badge-neutral shrink-0">{e.hall || 'TBD'}</span>
                      <span className="badge-brand shrink-0">{e.seat_count}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          )}

          {canSeeHalls && (
            <Card title="Live halls" icon={Video}
                  action={<Link to="/monitoring" className="link font-mono text-micro tracking-[.08em]">WALL →</Link>}>
              {cameras.length === 0 ? (
                <p className="text-small text-subtle">No cameras registered yet.</p>
              ) : (
                <ul className="flex flex-col gap-3">
                  {cameras.slice(0, 3).map((c) => {
                    const live = c.stream_url && c.is_active
                    return (
                      <li key={c.id}
                          className={`relative rounded-xl overflow-hidden border aspect-video bg-chrome
                                      ${live ? 'border-brand/30' : 'border-line'}`}>
                        {live ? (
                          <img src={c.stream_url} alt="" className="w-full h-full object-cover"
                               onError={(e) => { e.currentTarget.style.display = 'none' }} />
                        ) : null}
                        <span className="absolute inset-0 flex items-center justify-center text-faint">
                          {!live && <VideoOff size={18} aria-hidden="true" />}
                        </span>
                        <span className="absolute top-2 left-2 font-mono text-[9px] tracking-[.06em] text-muted
                                         bg-bg/80 border border-line rounded-[5px] px-1.5 py-0.5">
                          {c.camera_id}
                        </span>
                        <span className={`absolute top-2 right-2 flex items-center gap-1.5 rounded-[5px] px-1.5 py-0.5
                                          bg-bg/80 font-mono text-[9px] tracking-[.1em]
                                          ${live ? 'text-brand' : 'text-faint'}`}>
                          {live && <span className="w-1 h-1 rounded-full bg-brand animate-ve-dot" aria-hidden="true" />}
                          {live ? 'LIVE' : 'OFFLINE'}
                        </span>
                        <span className="absolute bottom-0 inset-x-0 flex items-center justify-between gap-2
                                         px-2.5 py-1.5 bg-bg/90 border-t border-line">
                          <span className="font-display text-small font-semibold text-fg">{c.hall || 'Unassigned'}</span>
                        </span>
                      </li>
                    )
                  })}
                </ul>
              )}
            </Card>
          )}

          {!canSeeHalls && (
            <Card title="By status" icon={Layers}>
              {loading ? <Skeleton className="h-[240px]" /> : <DonutChart data={stats?.by_status} kind="status" />}
            </Card>
          )}
        </div>
      </div>

      {/* charts */}
      <div className="grid gap-5">
        <Card title="Cases per month" subtitle="Rolling 12 months" icon={TrendingUp}>
          {loading ? <Skeleton className="h-[240px]" /> : <MonthlyCasesChart trend={stats?.monthly_trend} />}
        </Card>

        <div className={`grid gap-5 ${showDepartments ? 'lg:grid-cols-3' : 'lg:grid-cols-2'}`}>
          {canSeeHalls && (
            <Card title="By status" icon={Layers}>
              {loading ? <Skeleton className="h-[240px]" /> : <DonutChart data={stats?.by_status} kind="status" />}
            </Card>
          )}
          <Card title="By violation type" icon={ShieldAlert}>
            {loading ? <Skeleton className="h-[240px]" /> : <BreakdownChart data={stats?.by_violation} color="#4D9FFF" />}
          </Card>
          {showDepartments && (
            <Card title="By department" icon={Building2}>
              {loading ? <Skeleton className="h-[220px]" /> : <BreakdownChart data={stats?.by_department} />}
            </Card>
          )}
        </div>
      </div>

      <p className="text-small text-faint mt-5">Figures cover {scopeLabel(stats?.scope)}.</p>
    </>
  )
}

function scopeLabel(scope) {
  if (!scope) return 'the cases you can access'
  if (scope === 'own') return 'cases registered against you'
  if (scope === 'reported_by_me') return 'cases you reported'
  if (scope.startsWith('department:')) return `the ${scope.split(':')[1]} department`
  return 'the whole institution'
}
