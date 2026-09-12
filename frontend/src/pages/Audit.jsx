import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ScrollText, Download, SlidersHorizontal, RotateCcw, Search, ShieldCheck, X
} from 'lucide-react'
import api from '../lib/api'
import { useToast } from '../lib/toast'
import { humanize, titleize, roleLabel, formatDateTime, timeAgo, errorMessage } from '../lib/format'
import {
  PageHeader, Button, Input, Select, DataTable, EmptyState, Pagination, Card
} from '../components/ui'

const PAGE_SIZE = 50
const EMPTY = { action: '', role: '', entity: '', date_from: '', date_to: '' }

/** Colour-code the verbs so a long log stays scannable. */
function actionTone(action = '') {
  if (action.includes('deleted') || action.includes('return') || action.includes('dismiss')) return 'badge-danger'
  if (action.includes('created') || action.includes('approve') || action.includes('decide')) return 'badge-ok'
  if (action.includes('exported') || action.includes('login')) return 'badge-info'
  if (action.startsWith('ai_') || action.includes('alert')) return 'badge-brand'
  return 'badge-neutral'
}

export default function Audit() {
  const toast = useToast()
  const [rows, setRows] = useState([])
  const [total, setTotal] = useState(0)
  const [offset, setOffset] = useState(0)
  const [loading, setLoading] = useState(true)
  const [options, setOptions] = useState({ actions: [], roles: [], entities: [] })
  const [filters, setFilters] = useState({ ...EMPTY })
  const [showFilters, setShowFilters] = useState(false)
  const [q, setQ] = useState('')

  const activeCount = Object.values(filters).filter(Boolean).length

  const load = useCallback(() => {
    setLoading(true)
    const params = { limit: PAGE_SIZE, offset }
    Object.entries(filters).forEach(([k, v]) => { if (v) params[k] = v })
    return api.get('/api/audit', { params })
      .then((r) => {
        setRows(r.data)
        setTotal(Number(r.headers['x-total-count'] ?? r.data.length))
      })
      .catch((e) => toast.error('Could not load the audit trail', errorMessage(e)))
      .finally(() => setLoading(false))
  }, [filters, offset]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load() }, [load])
  useEffect(() => {
    api.get('/api/audit/filters').then((r) => setOptions(r.data)).catch(() => {})
  }, [])

  const set = (k) => (e) => {
    setOffset(0)
    setFilters((f) => ({ ...f, [k]: e.target.value }))
  }
  const clear = () => { setOffset(0); setFilters({ ...EMPTY }); setQ('') }

  /* free-text search refines the current page client-side; the structured
     filters above are what actually query the server */
  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase()
    if (!needle) return rows
    return rows.filter((r) =>
      `${r.action} ${r.entity} ${r.entity_id} ${r.detail} ${r.user_role} ${r.ip}`
        .toLowerCase().includes(needle))
  }, [rows, q])

  const download = async () => {
    try {
      const params = {}
      Object.entries(filters).forEach(([k, v]) => { if (v) params[k] = v })
      const res = await api.get('/api/audit/export.csv', { params, responseType: 'blob' })
      const url = URL.createObjectURL(new Blob([res.data], { type: 'text/csv' }))
      const a = document.createElement('a')
      a.href = url
      a.download = `vigilanteye-audit-${new Date().toISOString().slice(0, 10)}.csv`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      toast.success('Audit trail exported', 'The CSV has been downloaded.')
    } catch (e) {
      toast.error('Export failed', errorMessage(e))
    }
  }

  const columns = [
    {
      key: 'created_at', header: 'When', sortable: true, className: 'whitespace-nowrap',
      sortValue: (r) => new Date(r.created_at).getTime(),
      render: (r) => (
        <div className="text-small">
          <div>{formatDateTime(r.created_at)}</div>
          <div className="text-subtle">{timeAgo(r.created_at)}</div>
        </div>
      )
    },
    {
      key: 'action', header: 'Action', sortable: true, className: 'whitespace-nowrap',
      render: (r) => <span className={actionTone(r.action)}>{humanize(r.action)}</span>
    },
    {
      key: 'user_role', header: 'Actor', sortable: true,
      render: (r) => (
        <div className="text-small">
          <div>{roleLabel(r.user_role)}</div>
          <div className="text-subtle tnum">{r.user_id ? `User #${r.user_id}` : 'system'}</div>
        </div>
      )
    },
    {
      key: 'entity', header: 'Entity', sortable: true,
      render: (r) => (
        <span className="text-small">
          {r.entity ? `${titleize(r.entity)}${r.entity_id ? ` #${r.entity_id}` : ''}` : '—'}
        </span>
      )
    },
    {
      key: 'detail', header: 'Detail',
      render: (r) => <span className="text-small text-muted break-words">{r.detail || '—'}</span>
    },
    {
      key: 'ip', header: 'IP', className: 'whitespace-nowrap',
      render: (r) => <span className="text-small text-subtle tnum">{r.ip || '—'}</span>
    }
  ]

  const mobileCard = (r) => (
    <div className="card-tight">
      <div className="flex items-center justify-between gap-2">
        <span className={actionTone(r.action)}>{humanize(r.action)}</span>
        <span className="text-small text-subtle">{timeAgo(r.created_at)}</span>
      </div>
      <div className="text-small text-muted mt-2">
        {roleLabel(r.user_role)}
        {r.entity && ` · ${titleize(r.entity)}${r.entity_id ? ` #${r.entity_id}` : ''}`}
      </div>
      {r.detail && <div className="text-small text-subtle mt-1 break-words">{r.detail}</div>}
      <div className="text-micro text-subtle mt-1.5">{formatDateTime(r.created_at)}</div>
    </div>
  )

  return (
    <>
      <PageHeader
        title="Audit Trail"
        subtitle="Every action on every case, attributed and immutable"
        actions={<Button variant="ghost" icon={Download} onClick={download}>Export CSV</Button>}
      />

      <div className="flex items-center gap-2.5 text-small text-subtle bg-surface border border-line
                      rounded-xl px-4 py-2.5 mb-4">
        <ShieldCheck size={15} className="text-brand shrink-0" aria-hidden="true" />
        Entries are append-only — the system never edits or deletes an audit record.
      </div>

      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <div className="relative flex-1">
          <Search size={15} aria-hidden="true"
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-subtle pointer-events-none" />
          <input type="search" className="input pl-9" aria-label="Search this page of the audit trail"
                 placeholder="Search this page…" value={q} onChange={(e) => setQ(e.target.value)} />
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
            <Select label="Action type" value={filters.action} onChange={set('action')}>
              <option value="">Any action</option>
              {options.actions.map((a) => <option key={a} value={a}>{humanize(a)}</option>)}
            </Select>
            <Select label="Role" value={filters.role} onChange={set('role')}>
              <option value="">Any role</option>
              {options.roles.map((r) => <option key={r} value={r}>{roleLabel(r)}</option>)}
            </Select>
            <Select label="Entity" value={filters.entity} onChange={set('entity')}>
              <option value="">Any entity</option>
              {options.entities.map((e) => <option key={e} value={e}>{titleize(e)}</option>)}
            </Select>
            <Input label="From" type="date" value={filters.date_from} onChange={set('date_from')} />
            <Input label="To" type="date" value={filters.date_to} onChange={set('date_to')} />
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
        rows={visible}
        loading={loading}
        mobileCard={mobileCard}
        initialSort={{ key: 'created_at', dir: 'desc' }}
        empty={
          <EmptyState
            icon={activeCount || q ? Search : ScrollText}
            title={activeCount || q ? 'No entries match your filters' : 'The audit trail is empty'}
            description={
              activeCount || q
                ? 'Try widening the date range or clearing the filters.'
                : 'Actions are recorded here as soon as users start working with cases.'
            }
            action={(activeCount || q)
              ? <Button variant="ghost" icon={RotateCcw} onClick={clear}>Clear filters</Button>
              : undefined}
          />
        }
      />

      <Pagination total={total} limit={PAGE_SIZE} offset={offset} onChange={setOffset} />
    </>
  )
}
