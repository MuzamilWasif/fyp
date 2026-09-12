import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  BarChart, Bar, Cell, PieChart, Pie, Legend
} from 'recharts'
import { humanize, statusLabel } from '../lib/format'
import EmptyState from './ui/EmptyState'
import { BarChart3 } from 'lucide-react'

export const AXIS = { stroke: '#6f6f6f', fontSize: 11, tickLine: false, axisLine: false }
export const GRID = '#262626'
export const SERIES = ['#a3e635', '#60a5fa', '#fbbf24', '#f87171', '#34d399', '#c084fc', '#f472b6', '#22d3ee']

function ChartTooltip({ active, payload, label, formatter }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-surface-3 border border-line rounded-xl shadow-e3 px-3 py-2">
      <div className="text-small font-semibold text-fg mb-1">{formatter ? formatter(label) : label}</div>
      {payload.map((p) => (
        <div key={p.dataKey || p.name} className="text-small text-muted flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color || p.fill }} aria-hidden="true" />
          {p.name}: <span className="text-fg font-medium tnum">{p.value}</span>
        </div>
      ))}
    </div>
  )
}

const monthLabel = (key) => {
  const [y, m] = String(key).split('-')
  const d = new Date(Number(y), Number(m) - 1, 1)
  return Number.isNaN(d.getTime()) ? key : d.toLocaleDateString(undefined, { month: 'short' })
}

/** Cases per month, last 12 months. */
export function MonthlyCasesChart({ trend, height = 240 }) {
  const data = Object.entries(trend || {}).map(([month, cases]) => ({ month, label: monthLabel(month), cases }))
  if (!data.length) return <EmptyState icon={BarChart3} title="No trend data" description="Cases will plot here once reported." />

  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="caseFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#a3e635" stopOpacity={0.28} />
              <stop offset="100%" stopColor="#a3e635" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis dataKey="label" {...AXIS} />
          <YAxis allowDecimals={false} width={40} {...AXIS} />
          <Tooltip content={<ChartTooltip />} cursor={{ stroke: '#333' }} />
          <Area
            type="monotone" dataKey="cases" name="Cases" stroke="#a3e635" strokeWidth={2}
            fill="url(#caseFill)" dot={{ r: 2.5, fill: '#a3e635', strokeWidth: 0 }}
            activeDot={{ r: 4, fill: '#a3e635', stroke: '#0a0a0a', strokeWidth: 2 }}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

/** Horizontal bars for a {key: count} map. */
export function BreakdownChart({ data, kind = 'plain', height = 220, color = '#a3e635' }) {
  const label = kind === 'status' ? statusLabel : humanize
  const rows = Object.entries(data || {})
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([k, v], i) => ({ name: label(k) || 'Unspecified', value: v, fill: kind === 'status' ? SERIES[i % SERIES.length] : color }))

  if (!rows.length) return <EmptyState icon={BarChart3} title="Nothing to chart yet" description="Data appears once cases are recorded." className="py-8" />

  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }} barCategoryGap={8}>
          <CartesianGrid stroke={GRID} horizontal={false} />
          <XAxis type="number" allowDecimals={false} {...AXIS} />
          <YAxis type="category" dataKey="name" width={124} {...AXIS} />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
          <Bar dataKey="value" name="Cases" radius={[0, 6, 6, 0]} isAnimationActive={false}>
            {rows.map((r, i) => <Cell key={i} fill={r.fill} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

/** Donut for categorical share. */
export function DonutChart({ data, kind = 'plain', height = 240 }) {
  const label = kind === 'status' ? statusLabel : humanize
  const rows = Object.entries(data || {})
    .filter(([, v]) => v > 0)
    .map(([k, v]) => ({ name: label(k) || 'Unspecified', value: v }))

  if (!rows.length) return <EmptyState icon={BarChart3} title="Nothing to chart yet" description="Data appears once cases are recorded." className="py-8" />

  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={rows} dataKey="value" nameKey="name" innerRadius="56%" outerRadius="80%"
            paddingAngle={2} stroke="#0a0a0a" strokeWidth={2} isAnimationActive={false}
          >
            {rows.map((_, i) => <Cell key={i} fill={SERIES[i % SERIES.length]} />)}
          </Pie>
          <Tooltip content={<ChartTooltip />} />
          <Legend
            verticalAlign="bottom" height={36} iconType="circle" iconSize={8}
            formatter={(v) => <span className="text-small text-muted">{v}</span>}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
