import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  BarChart3, Building2, ShieldAlert, Layers, Download, GraduationCap,
  Gavel, Cpu, FolderOpen, PauseCircle, BookLock, FileCheck2
} from 'lucide-react'
import api from '../lib/api'
import { useToast } from '../lib/toast'
import { errorMessage } from '../lib/format'
import {
  PageHeader, Card, Select, Button, StatCard, EmptyState, Skeleton
} from '../components/ui'
import { MonthlyCasesChart, BreakdownChart, DonutChart } from '../components/charts'

/** Cross-tab of semester (rows) against department (columns). */
function Matrix({ matrix }) {
  const semesters = Object.keys(matrix || {})
  const departments = useMemo(() => {
    const set = new Set()
    Object.values(matrix || {}).forEach((row) => Object.keys(row).forEach((d) => set.add(d)))
    return [...set].sort()
  }, [matrix])

  if (!semesters.length) {
    return <EmptyState icon={BarChart3} title="Nothing to cross-tabulate"
                       description="Cases appear here once they are recorded." className="py-8" />
  }

  const rowTotal = (s) => Object.values(matrix[s]).reduce((a, b) => a + b, 0)
  const colTotal = (d) => semesters.reduce((a, s) => a + (matrix[s][d] || 0), 0)
  const grand = semesters.reduce((a, s) => a + rowTotal(s), 0)

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse min-w-[420px]">
        <thead>
          <tr className="border-b border-line">
            <th scope="col" className="th">Semester</th>
            {departments.map((d) => <th key={d} scope="col" className="th text-right">{d}</th>)}
            <th scope="col" className="th text-right">Total</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {semesters.map((s) => (
            <tr key={s} className="row-hover">
              <th scope="row" className="td text-left font-medium whitespace-nowrap">{s}</th>
              {departments.map((d) => (
                <td key={d} className="td text-right tnum">
                  {matrix[s][d] ? <span className="text-fg">{matrix[s][d]}</span>
                                : <span className="text-subtle">—</span>}
                </td>
              ))}
              <td className="td text-right tnum font-semibold text-brand">{rowTotal(s)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t border-line">
            <th scope="row" className="td text-left text-micro uppercase text-subtle">Total</th>
            {departments.map((d) => (
              <td key={d} className="td text-right tnum text-muted">{colTotal(d)}</td>
            ))}
            <td className="td text-right tnum font-bold text-brand">{grand}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}

export default function Analytics() {
  const toast = useToast()
  const [data, setData] = useState(null)
  const [trend, setTrend] = useState(null)
  const [loading, setLoading] = useState(true)
  const [semester, setSemester] = useState('')
  const [department, setDepartment] = useState('')
  const [exporting, setExporting] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    const params = {}
    if (semester) params.semester = semester
    if (department) params.department = department
    return api.get('/api/dashboard/analytics', { params })
      .then((r) => setData(r.data))
      .catch((e) => toast.error('Could not load analytics', errorMessage(e)))
      .finally(() => setLoading(false))
  }, [semester, department]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load() }, [load])
  useEffect(() => {
    api.get('/api/dashboard/stats').then((r) => setTrend(r.data.monthly_trend)).catch(() => {})
  }, [])

  const download = async () => {
    setExporting(true)
    try {
      const res = await api.get('/api/cases/export.csv', { responseType: 'blob' })
      const url = URL.createObjectURL(new Blob([res.data], { type: 'text/csv' }))
      const a = document.createElement('a')
      a.href = url
      a.download = `vigilanteye-cases-${new Date().toISOString().slice(0, 10)}.csv`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      toast.success('Cases exported', 'The CSV covers every case you have access to.')
    } catch (e) {
      toast.error('Export failed', errorMessage(e))
    } finally { setExporting(false) }
  }

  const t = data?.totals || {}
  const filters = data?.filters || { semesters: [], departments: [] }
  const filtered = !!(semester || department)

  return (
    <>
      <PageHeader
        title="Analytics"
        subtitle="Semester- and department-wise view of unfair means across the institution"
        actions={
          <Button variant="brand" icon={Download} loading={exporting} onClick={download}>
            Export cases CSV
          </Button>
        }
      />

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <Select label="Semester" value={semester} onChange={(e) => setSemester(e.target.value)}>
          <option value="">All semesters</option>
          {filters.semesters.map((s) => <option key={s} value={s}>{s}</option>)}
        </Select>
        <Select label="Department" value={department} onChange={(e) => setDepartment(e.target.value)}>
          <option value="">All departments</option>
          {filters.departments.map((d) => <option key={d} value={d}>{d}</option>)}
        </Select>
        {filtered && (
          <div className="flex items-end">
            <Button variant="subtle" onClick={() => { setSemester(''); setDepartment('') }}>
              Clear filters
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-5 gap-4 mb-4">
        <StatCard label="Cases" value={t.cases} icon={FolderOpen} loading={loading} />
        <StatCard label="Decided" value={t.decided} icon={FileCheck2} tone="ok" loading={loading} />
        <StatCard label="Results on hold" value={t.result_holds} icon={PauseCircle} tone="danger" loading={loading} />
        <StatCard label="Transcripts blocked" value={t.transcript_blocks} icon={BookLock} tone="danger" loading={loading} />
        <StatCard label="AI detected" value={t.ai_detected} icon={Cpu} tone="brand" loading={loading}
                  hint={t.cases ? `${Math.round((t.ai_detected / t.cases) * 100)}% of all cases` : undefined} />
      </div>

      <div className="grid gap-4">
        <Card title="Semester × department" icon={GraduationCap}
              subtitle="Where unfair means is concentrated">
          {loading ? <Skeleton className="h-48" /> : <Matrix matrix={data?.matrix} />}
        </Card>

        <div className="grid lg:grid-cols-2 gap-4">
          <Card title="Cases by semester" icon={GraduationCap}>
            {loading ? <Skeleton className="h-[220px]" /> : <BreakdownChart data={data?.by_semester} />}
          </Card>
          <Card title="Cases by department" icon={Building2}>
            {loading ? <Skeleton className="h-[220px]" /> : <BreakdownChart data={data?.by_department} color="#60a5fa" />}
          </Card>
        </div>

        <div className="grid lg:grid-cols-2 gap-4">
          <Card title="Violation types" icon={ShieldAlert}>
            {loading ? <Skeleton className="h-[240px]" /> : <BreakdownChart data={data?.by_violation} color="#fbbf24" />}
          </Card>
          <Card title="Penalties awarded" icon={Gavel}>
            {loading ? <Skeleton className="h-[220px]" /> : <BreakdownChart data={data?.by_penalty} color="#f87171" />}
          </Card>
        </div>

        <div className="grid lg:grid-cols-2 gap-4">
          <Card title="Workflow distribution" icon={Layers} subtitle="Where cases currently sit">
            {loading ? <Skeleton className="h-[240px]" /> : <DonutChart data={data?.by_status} kind="status" />}
          </Card>
          <Card title="Detection source" icon={Cpu} subtitle="AI engine versus manual reporting">
            {loading ? <Skeleton className="h-[240px]" /> : <DonutChart data={data?.by_source} kind="source" />}
          </Card>
        </div>

        {!filtered && (
          <Card title="Cases per month" subtitle="Rolling 12 months" icon={BarChart3}>
            {trend ? <MonthlyCasesChart trend={trend} /> : <Skeleton className="h-[240px]" />}
          </Card>
        )}
      </div>

      <p className="text-small text-subtle mt-4">
        Semesters are derived from each case's examination date: January–June is Spring, July–December is Fall.
      </p>
    </>
  )
}
