import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  Search, SlidersHorizontal, X, FolderOpen, FilePlus2, PauseCircle,
  BookLock, Inbox, RotateCcw
} from 'lucide-react'
import api from '../lib/api'
import { useAuth } from '../lib/auth'
import {
  ALL_STATUSES, VIOLATION_TYPES, statusLabel, humanize, formatDate,
  timeAgo, ACTION_STATUSES, errorMessage
} from '../lib/format'
import { useToast } from '../lib/toast'
import {
  PageHeader, Button, Input, Select, DataTable, EmptyState, StatusBadge, Tabs
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
  const [filters, setFilters] = useState({ ...EMPTY_FILTERS, status: params.get('status') || '' })

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
          <span className="font-semibold tnum">{c.case_no}</span>
          {c.source === 'ai' && <span className="badge-brand">AI</span>}
        </div>
      )
    },
    {
      key: 'student_name', header: 'Student', sortable: true,
      render: (c) => (
        <div className="min-w-0">
          <div className="truncate">{c.student_name}</div>
          <div className="text-small text-subtle tnum">{c.student_reg_no}{c.student_department && ` · ${c.student_department}`}</div>
        </div>
      )
    },
    {
      key: 'violation_type', header: 'Violation', sortable: true,
      render: (c) => <span className="capitalize">{humanize(c.violation_type)}</span>
    },
    {
      key: 'room', header: 'Location', sortable: true,
      render: (c) => (
        <div className="text-small">
          <div>{c.room || '—'}{c.seat && <span className="text-subtle"> / {c.seat}</span>}</div>
          <div className="text-subtle truncate max-w-[160px]">{c.exam_name || '—'}</div>
        </div>
      )
    },
    {
      key: 'flags', header: 'Flags', className: 'whitespace-nowrap',
      render: (c) => (
        <div className="flex gap-1">
          {c.result_hold && (
            <span className="badge-danger" title="Result on hold"><PauseCircle size={11} aria-hidden="true" />Hold</span>
          )}
          {c.transcript_blocked && (
            <span className="badge-danger" title="Transcript blocked"><BookLock size={11} aria-hidden="true" />Transcript</span>
          )}
          {!c.result_hold && !c.transcript_blocked && <span className="text-subtle">—</span>}
        </div>
      )
    },
    {
      key: 'status', header: 'Status', sortable: true,
      sortValue: (c) => ALL_STATUSES.indexOf(c.status),
      render: (c) => <StatusBadge status={c.status} />
    },
    {
      key: 'created_at', header: 'Reported', sortable: true, className: 'whitespace-nowrap',
      sortValue: (c) => new Date(c.created_at).getTime(),
      render: (c) => (
        <div className="text-small">
          <div>{formatDate(c.created_at)}</div>
          <div className="text-subtle">{timeAgo(c.created_at)}</div>
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
      <PageHeader
        title="UFM Cases"
        subtitle={loading ? 'Loading…' : `${rows.length} of ${cases.length} case${cases.length === 1 ? '' : 's'}`}
        actions={['invigilator', 'admin'].includes(user.role) && (
          <Link to="/cases/new"><Button variant="brand" icon={FilePlus2}>Report UFM</Button></Link>
        )}
      />

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
              {VIOLATION_TYPES.map((v) => <option key={v} value={v}>{humanize(v)}</option>)}
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
        mobileCard={mobileCard}
        empty={emptyState}
        initialSort={{ key: 'created_at', dir: 'desc' }}
      />
    </>
  )
}
