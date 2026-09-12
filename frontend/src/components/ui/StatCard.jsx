import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import Skeleton from './Skeleton'

/** Stat tile with an optional period-over-period delta. */
export default function StatCard({
  label, value, delta, deltaLabel = 'vs last month', icon: Icon,
  tone = 'default', loading = false, hint, onClick
}) {
  const tones = {
    default: 'text-fg', brand: 'text-brand', warn: 'text-warn',
    danger: 'text-danger', ok: 'text-ok', info: 'text-info'
  }

  // A rise in UFM cases is not "good" — colour the delta neutrally by direction only.
  const dir = delta == null ? null : delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat'
  const DeltaIcon = dir === 'up' ? TrendingUp : dir === 'down' ? TrendingDown : Minus
  const deltaCls = dir === 'up' ? 'text-warn' : dir === 'down' ? 'text-ok' : 'text-subtle'

  const Wrapper = onClick ? 'button' : 'div'

  return (
    <Wrapper
      onClick={onClick}
      className={`card card-hover text-left w-full ${onClick ? 'cursor-pointer' : ''}`}
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <span className="text-micro uppercase text-subtle font-medium">{label}</span>
        {Icon && (
          <span className="w-7 h-7 rounded-lg bg-surface-2 border border-line flex items-center justify-center shrink-0">
            <Icon size={14} className={tones[tone] || tones.default} aria-hidden="true" />
          </span>
        )}
      </div>

      {/* height is reserved so the skeleton → value swap causes no layout shift */}
      <div className="h-9 flex items-center">
        {loading
          ? <Skeleton className="h-7 w-16" />
          : <span className={`text-[1.75rem] leading-none font-bold tnum ${tones[tone] || tones.default}`}>
              {value ?? '—'}
            </span>}
      </div>

      <div className="h-5 flex items-center gap-1.5 mt-1">
        {loading ? <Skeleton className="h-3 w-24" /> : dir ? (
          <>
            <DeltaIcon size={13} className={deltaCls} aria-hidden="true" />
            <span className={`text-small font-medium tnum ${deltaCls}`}>
              {delta > 0 ? '+' : ''}{delta}
            </span>
            <span className="text-small text-subtle">{deltaLabel}</span>
          </>
        ) : hint ? <span className="text-small text-subtle">{hint}</span> : null}
      </div>
    </Wrapper>
  )
}
