import { useEffect, useState } from 'react'
import api from '../lib/api'
import { useAuth } from '../lib/auth'

function Stat({ label, value, accent }) {
  return (
    <div className="card">
      <div className={`text-3xl font-bold ${accent || 'text-white'}`}>{value ?? '—'}</div>
      <div className="text-sm text-neutral-400">{label}</div>
    </div>
  )
}

function TrendChart({ data }) {
  const entries = Object.entries(data || {})
  if (entries.length === 0) return null
  const max = Math.max(...entries.map(e => e[1]), 1)
  const W = 640, H = 140, pad = 8
  const step = (W - pad * 2) / (entries.length - 1 || 1)
  const pts = entries.map(([, v], i) => [pad + i * step, H - pad - (v / max) * (H - pad * 2)])
  const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0]},${p[1]}`).join(' ')
  return (
    <div className="card md:col-span-3">
      <div className="font-semibold mb-2">Cases per month</div>
      <svg viewBox={`0 0 ${W} ${H + 20}`} className="w-full">
        <path d={`${path} L${pts[pts.length - 1][0]},${H - pad} L${pad},${H - pad} Z`} fill="rgba(163,230,53,0.08)" />
        <path d={path} fill="none" stroke="#a3e635" strokeWidth="2" />
        {pts.map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r="3" fill="#a3e635" />)}
        {entries.map(([k], i) => (i % 2 === 0 &&
          <text key={k} x={pad + i * step} y={H + 14} fontSize="9" fill="#737373" textAnchor="middle">{k.slice(2)}</text>))}
      </svg>
    </div>
  )
}

function Breakdown({ title, data }) {
  const entries = Object.entries(data || {}).sort((a, b) => b[1] - a[1])
  const max = Math.max(...entries.map(e => e[1]), 1)
  return (
    <div className="card">
      <div className="font-semibold mb-3">{title}</div>
      {entries.length === 0 && <div className="text-sm text-neutral-500">No data yet</div>}
      {entries.map(([k, v]) => (
        <div key={k} className="mb-2">
          <div className="flex justify-between text-xs mb-1"><span>{k || 'unspecified'}</span><span>{v}</span></div>
          <div className="h-2 bg-neutral-800 rounded"><div className="h-2 bg-brand rounded" style={{ width: `${(v / max) * 100}%` }} /></div>
        </div>
      ))}
    </div>
  )
}

export default function Dashboard() {
  const { user } = useAuth()
  const [stats, setStats] = useState(null)

  useEffect(() => { api.get('/api/dashboard/stats').then(r => setStats(r.data)).catch(() => {}) }, [])

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Hello, {user.full_name.split(' ')[0]}</h1>
      <p className="text-neutral-400 text-sm mb-6">Maintain integrity, ensure fairness.</p>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <Stat label="Total cases" value={stats?.total_cases} />
        <Stat label="Open cases" value={stats?.open_cases} accent="text-amber-400" />
        <Stat label="Decided" value={stats?.decided_cases} accent="text-emerald-400" />
        <Stat label="Result holds" value={stats?.result_holds} accent="text-red-400" />
        <Stat label="New AI alerts" value={stats?.new_alerts} accent="text-brand" />
      </div>
      <div className="grid md:grid-cols-3 gap-4">
        <TrendChart data={stats?.monthly_trend} />
        <Breakdown title="Cases by status" data={stats?.by_status} />
        <Breakdown title="Cases by department" data={stats?.by_department} />
        <Breakdown title="Cases by violation type" data={stats?.by_violation} />
      </div>
    </div>
  )
}
