import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  Search, SlidersHorizontal, X, FolderOpen, FilePlus2, PauseCircle,
  BookLock, Inbox, RotateCcw, Download
} from 'lucide-react'
import api from '../lib/api'
import { useAuth } from '../lib/auth'
import {
  ALL_STATUSES, VIOLATION_TYPES, statusLabel, humanize, titleize, formatDate, currentStage,
  timeAgo, ACTION_STATUSES, errorMessage
} from '../lib/format'
import { useToast } from '../lib/toast'
import {
  Button, Input, Select, DataTable, EmptyState, StatusBadge, Tabs
} from '../components/ui'

const EMPTY_FILTERS = { q: '', status: '', violation: '', department: '', from: '', to: '' }

export default function Cases() {
  const { user } = useAuth()
  const nav = useNavigate()
  const toast = useToast()
  const [params, setParams] = useSearchParams()

  const canQueue = (ACTION_STATUSES[user.role] || []).length > 0
  const [tab, setTab] = useState(params.get('pending') === '1' && canQueue ? 'pending' : 'all')
  const [cases, setCases] = useState([])
  const [loading, setLoading] = useState(true)
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState({
    ...EMPTY_FILTERS,
    q: params.get('q') || '',
    status: params.get('status') || ''
  })

  // the topbar search navigates here with ?q=
  useEffect(() => {
    const q = params.get('q')
    if (q !== null) setFilters((f) => (f.q === q ? f : { ...f, q }))
  }, [params])

  useEffect(() => {
    let alive = true
    setLoading(true)
    api.get('/api/cases', { params: tab === 'pending' ? { pending: true } : {} })
      .then((r) => { if (alive) setCases(r.data) })
      .catch((e) => { if (alive) toast.error('Could not load cases', errorMessage(e)) })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [tab]) // eslint-disable-line react-hooks/exhaustive-deps

  const setTabAndUrl = (next) => {
    setTab(next)
    const p = new URLSearchParams(params)
    if (next === 'pending') p.set('pending', '1'); else p.delete('pending')
    setParams(p, { replace: true })
  }

  const [exporting, setExporting] = useState(false)

  const exportCsv = async () => {
    setExporting(true)
    try {
      const res = await api.get('/api/cases/export.csv', { responseType: 'blob' })
      const url = URL.createObjectURL(new Blob([res.data], { type: 'text/csv' }))
      const a = document.createElement('a')
      a.href = url
      a.download = `vigilanteye-cases-${new Date().toISOString().slice(0, 10)}.csv`
      document.body.appendChild(a); a.click(); a.remove()
      URL.revokeObjectURL(url)
      toast.success('Cases exported', 'The CSV covers every case you can access.')
    } catch (e) {
      toast.error('Export failed', errorMessage(e))
    } finally { setExporting(false) }
  }

  const set = (k) => (e) => setFilters((f) => ({ ...f, [k]: e.target.value }))
  const clear = () => setFilters({ ...EMPTY_FILTERS })
  const activeCount = Object.entries(filters).filter(([k, v]) => k !== 'q' && v).length

  const departments = useMemo(
    () => [...new Set(cases.map((c) => c.student_department).filter(Boolean))].sort(),
    [cases]
  )

  const rows = useMemo(() => {
    const q = filters.q.trim().toLowerCase()
    return cases.filter((c) => {
      if (q) {
        const hay = `${c.case_no} ${c.student_name} ${c.student_reg_no} ${c.exam_name} ${c.room} ${c.seat}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      if (filters.status && c.status !== filters.status) return false
      if (filters.violation && c.violation_type !== filters.violation) return false
      if (filters.department && c.student_department !== filters.department) return false
      if (filters.from && new Date(c.created_at) < new Date(`${filters.from}T00:00:00`)) return false
      if (filters.to && new Date(c.created_at) > new Date(`${filters.to}T23:59:59`)) return false
      return true
    })
  }, [cases, filters])

  const columns = [
    {
      key: 'case_no', header: 'Case', sortable: true, thClassName: 'w-[200px]', className: 'whitespace-nowrap',
      render: (c) => (
        <div className="flex items-center gap-2">
          <span className="font-mono text-body text-fg">{c.case_no}</span>
          {c.source === 'ai' && <span className="badge-brand">AI</span>}
        </div>
      )
    },
    {
      key: 'student_name', header: 'Student', sortable: true,
      render: (c) => (
        <div className="min-w-0">
          <div className="text-body text-fg truncate">{c.student_name}</div>
          <div className="font-mono text-micro text-subtle mt-1">
            {c.student_reg_no}{c.student_department && ` · ${c.student_department}`}
          </div>
        </div>
      )
    },
    {
      key: 'violation_type', header: 'Violation', sortable: true,
      render: (c) => <span className="capitalize">{humanize(c.violation_type)}</span>
    },
    {
      key: 'room', header: 'Hall / Seat', sortable: true, className: 'whitespace-nowrap',
      render: (c) => (
        c.room
          ? <span className="badge-neutral">{c.room}{c.seat && ` · ${c.seat}`}</span>
          : <span className="text-faint">—</span>
      )
    },
    {
      key: 'stage', header: 'Progress', thClassName: 'w-24',
      sortValue: (c) => currentStage(c.status),
      render: (c) => {
        const stage = Math.min(6, currentStage(c.status) + 1)
        const done = c.status === 'closed'
        return (
          <span className="flex items-center gap-2" title={`Stage ${stage} of 6`}>
            <span className="relative flex-1 h-1 rounded-sm bg-line overflow-hidden">
              <span className={`absolute inset-y-0 left-0 rounded-sm ${done ? 'bg-brand' : 'bg-info'}`}
                    style={{ width: `${(stage / 6) * 100}%` }} />
            </span>
            <span className="font-mono text-micro text-faint tnum">{stage}/6</span>
          </span>
        )
      }
    },
    {
      key: 'status', header: 'Status', sortable: true, className: 'whitespace-nowrap',
      sortValue: (c) => ALL_STATUSES.indexOf(c.status),
      render: (c) => (
        <div className="flex items-center gap-1.5">
          <StatusBadge status={c.status} />
          {c.result_hold && (
            <span className="badge-danger" title="Result on hold">
              <PauseCircle size={10} aria-hidden="true" />hold
            </span>
          )}
          {c.transcript_blocked && (
            <span className="badge-danger" title="Transcript blocked">
              <BookLock size={10} aria-hidden="true" />tr
            </span>
          )}
        </div>
      )
    },
    {
      key: 'created_at', header: 'Reported', sortable: true, className: 'whitespace-nowrap',
      sortValue: (c) => new Date(c.created_at).getTime(),
      render: (c) => (
        <div className="font-mono text-micro">
          <div className="text-muted">{formatDate(c.created_at)}</div>
          <div className="text-faint mt-1">{timeAgo(c.created_at)}</div>
        </div>
      )
    }
  ]

  const mobileCard = (c) => (
    <Link to={`/cases/${c.id}`} className="block card-tight card-hover">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0">
          <div className="font-semibold tnum">{c.case_no}</div>
          <div className="text-small text-muted truncate">{c.student_name} · {c.student_reg_no}</div>
        </div>
        <StatusBadge status={c.status} />
      </div>
      <div className="text-small text-muted capitalize">{humanize(c.violation_type)}</div>
      <div className="text-small text-subtle mt-0.5">
        {c.room || '—'}{c.seat && ` / ${c.seat}`} · {formatDate(c.created_at)}
      </div>
      <div className="flex gap-1 mt-2">
        {c.source === 'ai' && <span className="badge-brand">AI</span>}
        {c.result_hold && <span className="badge-danger">Result hold</span>}
        {c.transcript_blocked && <span className="badge-danger">Transcript blocked</span>}
      </div>
    </Link>
  )

  const emptyState = filters.q || activeCount ? (
    <EmptyState
      icon={Search}
      title="No cases match your filters"
      description="Try a different search term, or clear the filters to see everything you have access to."
      action={<Button variant="ghost" icon={RotateCcw} onClick={clear}>Clear filters</Button>}
    />
  ) : tab === 'pending' ? (
    <EmptyState
      icon={Inbox}
      title="Nothing waiting on you"
      description="Cases arriving at your stage of the workflow will appear here, and you will be notified."
      action={<Button variant="ghost" onClick={() => setTabAndUrl('all')}>View all cases</Button>}
    />
  ) : (
    <EmptyState
      icon={FolderOpen}
      title={user.role === 'student' ? 'No cases against you' : 'No cases yet'}
      description={
        user.role === 'student'
          ? 'You have a clean record. Any UFM case registered against you would appear here with its full progress.'
          : 'Once unfair means are reported they will be listed here with their status and evidence.'
      }
      action={['invigilator', 'admin'].includes(user.role)
        ? <Link to="/cases/new"><Button variant="brand" icon={FilePlus2}>Report UFM</Button></Link>
        : undefined}
    />
  )

  return (
    <>
      <div className="flex flex-wrap items-center gap-3.5 mb-5">
        <h1 className="font-display text-title font-semibold text-fg">UFM Cases</h1>
        <span className="font-mono text-small text-subtle tnum">
          {loading ? 'loading…' : `${rows.length} of ${cases.length} records`}
        </span>
        <div className="flex-1" />
        <Button variant="ghost" icon={Download} onClick={exportCsv} loading={exporting}>Export CSV</Button>
        {['invigilator', 'admin'].includes(user.role) && (
          <Link to="/cases/new"><Button variant="brand" icon={FilePlus2}>Report UFM</Button></Link>
        )}
      </div>

      {canQueue && (
        <Tabs
          className="mb-4"
          value={tab}
          onChange={setTabAndUrl}
          tabs={[
            { value: 'all', label: 'All cases' },
            { value: 'pending', label: 'Needs my action' }
          ]}
        />
      )}

      {/* search + filter bar */}
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <div className="relative flex-1">
          <Search size={15} aria-hidden="true"
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-subtle pointer-events-none" />
          <input
            type="search"
            className="input pl-9"
            placeholder="Search case number, student, registration, hall…"
            aria-label="Search cases"
            value={filters.q}
            onChange={set('q')}
          />
        </div>
        <Button
          variant={showFilters || activeCount ? 'outline' : 'ghost'}
          icon={SlidersHorizontal}
          onClick={() => setShowFilters((s) => !s)}
          aria-expanded={showFilters}
        >
          Filters{activeCount > 0 && ` · ${activeCount}`}
        </Button>
      </div>

      {showFilters && (
        <div className="card mb-4 animate-slide-down">
          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <Select label="Status" value={filters.status} onChange={set('status')}>
              <option value="">Any status</option>
              {ALL_STATUSES.map((s) => <option key={s} value={s}>{statusLabel(s)}</option>)}
            </Select>
            <Select label="Violation" value={filters.violation} onChange={set('violation')}>
              <option value="">Any violation</option>
              {VIOLATION_TYPES.map((v) => <option key={v} value={v}>{titleize(v)}</option>)}
            </Select>
            <Select label="Department" value={filters.department} onChange={set('department')}>
              <option value="">Any department</option>
              {departments.map((d) => <option key={d} value={d}>{d}</option>)}
            </Select>
            <Input label="Reported from" type="date" value={filters.from} onChange={set('from')} />
            <Input label="Reported to" type="date" value={filters.to} onChange={set('to')} />
          </div>
          {activeCount > 0 && (
            <div className="flex justify-end mt-3">
              <Button size="sm" variant="subtle" icon={X} onClick={clear}>Clear filters</Button>
            </div>
          )}
        </div>
      )}

      <DataTable
        columns={columns}
        rows={rows}
        loading={loading}
        onRowClick={(c) => nav(`/cases/${c.id}`)}
        rowEdge={(c) => (c.result_hold ? '#FF4D4D' : null)}
        mobileCard={mobileCard}
        empty={emptyState}
        initialSort={{ key: 'created_at', dir: 'desc' }}
      />
    </>
  )
}
