export default function Skeleton({ className = '', style }) {
  return <div className={`skeleton ${className}`} style={style} aria-hidden="true" />
}

/** Text lines that occupy the same height as the final content. */
export function SkeletonText({ lines = 3, className = '' }) {
  return (
    <div className={`space-y-2 ${className}`} aria-hidden="true">
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="skeleton h-3.5" style={{ width: `${100 - i * 12}%` }} />
      ))}
    </div>
  )
}

export function SkeletonCard({ className = '' }) {
  return (
    <div className={`card ${className}`} aria-hidden="true">
      <div className="skeleton h-3 w-24 mb-3" />
      <div className="skeleton h-8 w-20 mb-2" />
      <div className="skeleton h-3 w-16" />
    </div>
  )
}

export function SkeletonRows({ rows = 5, cols = 5 }) {
  return (
    <div className="divide-y divide-line" aria-hidden="true">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex items-center gap-3 py-3.5 px-3">
          {Array.from({ length: cols }).map((_, c) => (
            <div key={c} className="skeleton h-3.5 flex-1" style={{ maxWidth: c === 0 ? 110 : undefined }} />
          ))}
        </div>
      ))}
    </div>
  )
}
