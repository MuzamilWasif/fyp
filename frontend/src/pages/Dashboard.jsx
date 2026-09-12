import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  FolderOpen, FileCheck2, PauseCircle, Siren, Gavel, ClipboardCheck, Building2,
  ShieldAlert, Layers, ArrowRight, CheckCircle2, FilePlus2, BookLock, Inbox, TrendingUp
} from 'lucide-react'
import api from '../lib/api'
import { useAuth } from '../lib/auth'
import {
  ROLE_LABELS, humanize, statusLabel, timeAgo, ACTION_STATUSES
} from '../lib/format'
import { StatCard, Card, EmptyState, Button, StatusBadge, Skeleton } from '../components/ui'
import { MonthlyCasesChart, BreakdownChart, DonutChart } from '../components/charts'
import CaseProgress from '../components/CaseProgress'

/* ------------------------------------------------------------------ config */
/** Each role gets the four numbers that actually matter to its job. */
function cardsFor(role, s) {
  const d = s?.deltas || {}
  const common = {
    total: { key: 'total', label: 'Total cases', value: s?.total_cases, icon: FolderOpen, delta: d.total_cases },
    open: { key: 'open', label: 'Open cases', value: s?.open_cases, icon: Layers, tone: 'warn' },
    decided: { key: 'decided', label: 'Decided', value: s?.decided_cases, icon: FileCheck2, tone: 'ok', delta: d.decided_cases },
    holds: { key: 'holds', label: 'Results on hold', value: s?.result_holds, icon: PauseCircle, tone: 'danger' },
    blocks: { key: 'blocks', label: 'Transcripts blocked', value: s?.transcript_blocks, icon: BookLock, tone: 'danger' },
    alerts: { key: 'alerts', label: 'New AI alerts', value: s?.new_alerts, icon: Siren, tone: 'brand' }
  }
  const action = (label, icon = ClipboardCheck) => ({
    key: 'action', label, value: s?.action_required, icon, tone: 'brand',
    hint: s?.action_required ? 'Waiting on you' : 'Nothing pending'
  })

  switch (role) {
    case 'invigilator':
      return [
        { ...common.total, label: 'Cases I reported' },
        action('Returned to me', FilePlus2),
        common.open,
        common.alerts
      ]
    case 'hod':
      return [action('Awaiting my verification'), common.total, common.open, common.holds]
    case 'dec':
      return [action('Awaiting DEC review'), common.total, common.open, common.decided]
    case 'exam_dept':
      return [action('Awaiting my action'), common.holds, common.blocks, common.total]
    case 'ufm_committee':
      return [action('Awaiting decision', Gavel), common.decided, common.total, common.holds]
    case 'student':
      return [
        { ...common.total, label: 'My cases' },
        { ...common.open, label: 'In progress' },
        common.decided,
        { ...common.holds, label: 'Results on hold' }
      ]
    default:
      return [common.total, common.open, common.holds, common.alerts]
  }
}

const SUBTITLE = {
  invigilator: 'Report unfair means and track what you have submitted.',
  hod: 'Verify and sign off cases raised in your department.',
  dec: 'Review departmental cases before they reach the Examination Department.',
  exam_dept: 'Hold results, block transcripts and keep the institution’s records straight.',
  ufm_committee: 'Decide cases and award penalties.',
  student: 'Track any case registered against you and respond to it.',
  admin: 'Full institutional view of detection, cases and users.'
}

/* -------------------------------------------------------------- queue item */
function QueueRow({ c, onOpen }) {
  return (
    <button
      onClick={() => onOpen(c.id)}
      className="w-full text-left flex items-center gap-3 px-3 py-3 rounded-xl border border-transparent
                 hover:bg-surface-2 hover:border-line transition-colors duration-fast group"
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-body font-semibold tnum">{c.case_no}</span>
          <StatusBadge status={c.status} />
          {c.source === 'ai' && <span className="badge-brand">AI</span>}
        </div>
        <div className="text-small text-muted mt-0.5 truncate">
          {c.student_name} · {c.student_reg_no} · {humanize(c.violation_type)}
        </div>
      </div>
      <div className="text-right shrink-0 hidden sm:block">
        <div className="text-small text-subtle">{timeAgo(c.created_at)}</div>
        {c.room && <div className="text-micro text-subtle">{c.room}{c.seat && ` / ${c.seat}`}</div>}
      </div>
      <ArrowRight size={16} className="text-subtle group-hover:text-brand transition-colors duration-fast shrink-0" />
    </button>
  )
}

/* ---------------------------------------------------------------- page */
export default function Dashboard() {
  const { user } = useAuth()
  const nav = useNavigate()
  const [stats, setStats] = useState(null)
  const [queue, setQueue] = useState([])
  const [myCases, setMyCases] = useState([])
  const [loading, setLoading] = useState(true)
  const [queueLoading, setQueueLoading] = useState(true)

  const isStudent = user.role === 'student'
  const hasQueue = (ACTION_STATUSES[user.role] || []).length > 0

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
      .then((r) => {
        if (!alive) return
        if (isStudent) setMyCases(r.data)
        else setQueue(r.data)
      })
      .catch(() => {})
      .finally(() => { if (alive) setQueueLoading(false) })

    return () => { alive = false }
  }, [isStudent])

  const cards = useMemo(() => cardsFor(user.role, stats), [user.role, stats])
  const showDepartments = stats?.scope === 'institution'
  const firstName = user.full_name.split(' ')[0]

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="badge-brand">{ROLE_LABELS[user.role] || user.role}</span>
            {user.department && <span className="badge-neutral">{user.department}</span>}
          </div>
          <h1 className="text-display font-bold">Welcome back, {firstName}</h1>
          <p className="text-body text-muted mt-1">{SUBTITLE[user.role] || 'Maintain integrity, ensure fairness.'}</p>
        </div>
        <div className="flex gap-2 no-print">
          {['invigilator', 'admin'].includes(user.role) && (
            <Link to="/cases/new"><Button variant="brand" icon={FilePlus2}>Report UFM</Button></Link>
          )}
          <Link to="/cases"><Button variant="ghost" icon={FolderOpen}>All cases</Button></Link>
        </div>
      </div>

      {/* stat cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-4">
        {cards.map((c) => (
          <StatCard
            key={c.key}
            label={c.label}
            value={c.value}
            tone={c.tone}
            icon={c.icon}
            delta={c.delta}
            hint={c.hint}
            loading={loading}
            onClick={c.key === 'action' && hasQueue ? () => nav('/cases?pending=1') : undefined}
          />
        ))}
      </div>

      {/* action queue / student tracker */}
      {isStudent ? (
        <Card
          title="My cases"
          subtitle="Every case registered against your registration number"
          icon={Inbox}
          className="mb-4"
          action={<Link to="/cases"><Button size="sm" variant="subtle" iconRight={ArrowRight}>View all</Button></Link>}
        >
          {queueLoading ? (
            <div className="space-y-3">
              {[0, 1].map((i) => <Skeleton key={i} className="h-24" />)}
            </div>
          ) : myCases.length === 0 ? (
            <EmptyState
              icon={CheckCircle2}
              title="No cases against you"
              description="You have a clean record. Cases would appear here with their full progress."
            />
          ) : (
            <div className="space-y-3">
              {myCases.slice(0, 4).map((c) => (
                <Link
                  key={c.id}
                  to={`/cases/${c.id}`}
                  className="block panel p-4 hover:border-line-strong transition-colors duration-fast"
                >
                  <div className="flex items-center justify-between gap-3 mb-4">
                    <div className="min-w-0">
                      <div className="text-body font-semibold tnum">{c.case_no}</div>
                      <div className="text-small text-muted truncate">
                        {humanize(c.violation_type)} · {c.exam_name || 'Examination'}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {c.result_hold && <span className="badge-danger">Result on hold</span>}
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
        <Card
          title="Needs your action"
          subtitle={`Cases waiting on the ${ROLE_LABELS[user.role]}`}
          icon={ClipboardCheck}
          className="mb-4"
          padded={false}
          bodyClassName="px-2 pb-2"
          action={
            queue.length > 0 && (
              <Link to="/cases?pending=1" className="mr-5">
                <Button size="sm" variant="subtle" iconRight={ArrowRight}>View all {queue.length}</Button>
              </Link>
            )
          }
        >
          {queueLoading ? (
            <div className="space-y-2 px-1">
              {[0, 1, 2].map((i) => <Skeleton key={i} className="h-14" />)}
            </div>
          ) : queue.length === 0 ? (
            <EmptyState
              icon={CheckCircle2}
              title="Nothing waiting on you"
              description={`No cases are currently at the ${ROLE_LABELS[user.role]} stage. New arrivals appear here and in your notifications.`}
              className="py-8"
            />
          ) : (
            queue.slice(0, 6).map((c) => <QueueRow key={c.id} c={c} onOpen={(id) => nav(`/cases/${id}`)} />)
          )}
        </Card>
      )}

      {/* charts */}
      <div className="grid gap-4">
        <Card title="Cases per month" subtitle="Rolling 12 months" icon={TrendingUp}>
          {loading ? <Skeleton className="h-[240px]" /> : <MonthlyCasesChart trend={stats?.monthly_trend} />}
        </Card>

        <div className={`grid gap-4 ${showDepartments ? 'lg:grid-cols-3' : 'lg:grid-cols-2'}`}>
          <Card title="By status" icon={Layers}>
            {loading ? <Skeleton className="h-[240px]" /> : <DonutChart data={stats?.by_status} kind="status" />}
          </Card>
          <Card title="By violation type" icon={ShieldAlert}>
            {loading ? <Skeleton className="h-[220px]" /> : <BreakdownChart data={stats?.by_violation} color="#60a5fa" />}
          </Card>
          {/* a department split only says something when more than one is in view */}
          {showDepartments && (
            <Card title="By department" icon={Building2}>
              {loading ? <Skeleton className="h-[220px]" /> : <BreakdownChart data={stats?.by_department} />}
            </Card>
          )}
        </div>
      </div>

      <p className="text-small text-subtle mt-4">
        Figures cover {statusScopeLabel(stats?.scope)}.
      </p>
    </>
  )
}

function statusScopeLabel(scope) {
  if (!scope) return 'the cases you can access'
  if (scope === 'own') return 'cases registered against you'
  if (scope === 'reported_by_me') return 'cases you reported'
  if (scope.startsWith('department:')) return `the ${scope.split(':')[1]} department`
  return 'the whole institution'
}
