import Skeleton from './Skeleton'

/** Inline sparkline; scales to the series' own range. */
function Sparkline({ points = [], color = '#2DE3A7', width = 88, height = 30 }) {
  if (points.length < 2) return <span style={{ width, height }} aria-hidden="true" />
  const max = Math.max(...points)
  const min = Math.min(...points)
  const span = max - min || 1
  const step = width / (points.length - 1)
  const d = points
    .map((v, i) => `${(i * step).toFixed(1)},${(height - 3 - ((v - min) / span) * (height - 6)).toFixed(1)}`)
    .join(' ')
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} fill="none" aria-hidden="true">
      <polyline points={d} stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

const TONES = {
  default: { text: 'text-fg', hex: '#4D9FFF' },
  brand: { text: 'text-brand', hex: '#2DE3A7' },
  ok: { text: 'text-ok', hex: '#2DE3A7' },
  info: { text: 'text-info', hex: '#4D9FFF' },
  warn: { text: 'text-warn', hex: '#FFB020' },
  danger: { text: 'text-danger', hex: '#FF4D4D' }
}

const CHIP = {
  default: 'bg-info-soft text-info',
  brand: 'bg-brand-soft text-brand',
  ok: 'bg-ok-soft text-ok',
  info: 'bg-info-soft text-info',
  warn: 'bg-warn-soft text-warn',
  danger: 'bg-danger-soft text-danger'
}

/**
 * Stat tile: mono label, oversized display figure, sparkline, and a delta
 * chip. Heights are reserved so the skeleton-to-value swap never shifts
 * anything on the page.
 */
export default function StatCard({
  label, value, delta, deltaLabel = 'vs last month', spark, tone = 'default',
  pulse = false, loading = false, hint, onClick
}) {
  const t = TONES[tone] || TONES.default
  const dir = delta == null ? null : delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat'
  const Wrapper = onClick ? 'button' : 'div'

  return (
    <Wrapper
      onClick={onClick}
      className={`card card-hover text-left w-full ${onClick ? 'cursor-pointer' : ''}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 min-w-0">
          {pulse && (
            <span className={`w-1.5 h-1.5 rounded-full shrink-0
                              ${tone === 'danger' ? 'bg-danger animate-ve-dot-red' : 'bg-brand animate-ve-dot'}`}
                  aria-hidden="true" />
          )}
          <span className="font-mono text-micro uppercase text-subtle truncate">{label}</span>
        </span>
      </div>

      <div className="flex items-end justify-between gap-3 mt-4 h-10">
        {loading
          ? <Skeleton className="h-9 w-16" />
          : <span className={`font-display text-stat font-semibold tnum ${t.text}`}>{value ?? '—'}</span>}
        {!loading && spark?.length > 1 && <Sparkline points={spark} color={t.hex} />}
      </div>

      <div className="flex items-center gap-2 mt-3.5 h-5">
        {loading ? <Skeleton className="h-3.5 w-28" /> : dir ? (
          <>
            <span className={`font-mono text-micro px-1.5 py-[3px] rounded-[5px] tnum ${CHIP[tone] || CHIP.default}`}>
              {delta > 0 ? '+' : delta < 0 ? '−' : ''}{Math.abs(delta)}
            </span>
            <span className="text-small text-faint">{deltaLabel}</span>
          </>
        ) : hint ? <span className="text-small text-faint">{hint}</span> : null}
      </div>
    </Wrapper>
  )
}
