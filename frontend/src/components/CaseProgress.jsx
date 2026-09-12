import { Check, RotateCcw } from 'lucide-react'
import { LIFECYCLE_STAGES, currentStage, isReturned } from '../lib/format'

/** Compact horizontal tracker of the official UFM case lifecycle. */
export default function CaseProgress({ status, className = '' }) {
  const stage = currentStage(status)
  const returned = isReturned(status)

  return (
    <div className={className}>
      <ol className="flex items-start gap-0 overflow-x-auto pb-1">
        {LIFECYCLE_STAGES.map((s, i) => {
          const done = i < stage
          const active = i === stage && !returned
          const needsRework = returned && i === 0

          const dot = needsRework
            ? 'bg-danger-soft border-danger text-danger'
            : done
              ? 'bg-brand border-brand text-brand-fg'
              : active
                ? 'bg-brand-soft border-brand text-brand'
                : 'bg-surface-2 border-line text-subtle'

          return (
            <li key={s.key} className="flex-1 min-w-[56px] sm:min-w-[92px] flex flex-col items-center text-center relative">
              {i > 0 && (
                <span
                  aria-hidden="true"
                  className={`absolute top-[11px] right-1/2 w-full h-px ${done || active ? 'bg-brand/40' : 'bg-line'}`}
                />
              )}
              <span className={`relative z-10 w-[23px] h-[23px] rounded-full border flex items-center
                                justify-center text-[10px] font-bold ${dot}`}>
                {needsRework ? <RotateCcw size={11} /> : done ? <Check size={12} /> : i + 1}
              </span>
              <span className={`mt-1.5 text-[10px] sm:text-[11px] leading-tight px-0.5 sm:px-1
                                ${done || active ? 'text-fg font-medium' : 'text-subtle'}`}>
                {s.label}
              </span>
            </li>
          )
        })}
      </ol>
      {returned && (
        <p className="text-small text-danger mt-3 text-center">
          Returned to the invigilator for correction before it can proceed.
        </p>
      )}
    </div>
  )
}
