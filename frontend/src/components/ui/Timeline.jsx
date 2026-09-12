import { Check, Clock, CircleDot } from 'lucide-react'
import { roleLabel, humanize, formatDateTime } from '../../lib/format'

/**
 * Vertical workflow stepper.
 * items: [{ id, title, role, actor, comment, at, state: 'done'|'current'|'pending', icon? }]
 */
export default function Timeline({ items = [], className = '' }) {
  if (!items.length) {
    return <p className="text-body text-subtle">No activity recorded yet.</p>
  }

  return (
    <ol className={`relative ${className}`}>
      {items.map((item, i) => {
        const last = i === items.length - 1
        const done = item.state === 'done'
        const current = item.state === 'current'
        const Icon = item.icon || (done ? Check : current ? CircleDot : Clock)

        const dot = done
          ? 'bg-brand text-brand-fg border-brand'
          : current
            ? 'bg-brand-soft text-brand border-brand/50'
            : 'bg-surface-2 text-subtle border-line'

        return (
          <li key={item.id ?? i} className="relative flex gap-3 pb-5 last:pb-0">
            {!last && (
              <span
                aria-hidden="true"
                className={`absolute left-[13px] top-7 bottom-0 w-px ${done ? 'bg-brand/30' : 'bg-line'}`}
              />
            )}
            <span className={`relative z-10 w-[27px] h-[27px] shrink-0 rounded-full border flex items-center justify-center ${dot}`}>
              <Icon size={13} aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1 -mt-0.5">
              <div className="flex flex-wrap items-baseline gap-x-2">
                <span className={`text-body font-semibold ${done || current ? 'text-fg' : 'text-subtle'}`}>
                  {item.title || humanize(item.action)}
                </span>
                {item.role && <span className="badge-neutral">{roleLabel(item.role)}</span>}
              </div>
              {item.actor && <div className="text-small text-muted mt-0.5">{item.actor}</div>}
              {item.comment && (
                <p className="text-body text-muted mt-1.5 bg-surface-2 border border-line rounded-xl px-3 py-2 break-words">
                  {item.comment}
                </p>
              )}
              <time className="block text-small text-subtle mt-1 tnum">
                {item.at ? formatDateTime(item.at) : 'Pending'}
              </time>
            </div>
          </li>
        )
      })}
    </ol>
  )
}
