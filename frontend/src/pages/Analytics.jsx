import { useEffect, useState } from 'react'
import { BarChart3, Building2, ShieldAlert, Layers } from 'lucide-react'
import api from '../lib/api'
import { PageHeader, Card, SkeletonCard } from '../components/ui'
import { MonthlyCasesChart, BreakdownChart, DonutChart } from '../components/charts'

export default function Analytics() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/api/dashboard/stats')
      .then((r) => setStats(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <>
        <PageHeader title="Analytics" subtitle="Institution-wide UFM statistics" />
        <div className="grid lg:grid-cols-2 gap-4">
          <SkeletonCard className="h-72" /><SkeletonCard className="h-72" />
        </div>
      </>
    )
  }

  return (
    <>
      <PageHeader title="Analytics" subtitle="Institution-wide UFM statistics" />

      <div className="grid gap-4">
        <Card title="Cases per month" subtitle="Rolling 12 months" icon={BarChart3}>
          <MonthlyCasesChart trend={stats?.monthly_trend} />
        </Card>

        <div className="grid lg:grid-cols-2 gap-4">
          <Card title="Cases by department" icon={Building2}>
            <BreakdownChart data={stats?.by_department} />
          </Card>
          <Card title="Cases by violation type" icon={ShieldAlert}>
            <BreakdownChart data={stats?.by_violation} color="#60a5fa" />
          </Card>
        </div>

        <Card title="Workflow distribution" subtitle="Where cases currently sit" icon={Layers}>
          <DonutChart data={stats?.by_status} kind="status" />
        </Card>
      </div>
    </>
  )
}
