import { useMemo } from 'react'
import { Monitor, LayoutGrid } from 'lucide-react'
import { EmptyState, Skeleton } from './ui'

/**
 * Clickable hall seat plan. Seats are labelled like "A12" — the letter is the
 * row, the number the position — so the grid reconstructs the physical layout
 * from the uploaded seat plan without needing coordinates.
 */
export default function SeatMap({ seats = [], selected, onSelect, loading = false, highlightRegNo }) {
  const { rows, unplaced } = useMemo(() => {
    const map = new Map()
    const odd = []
    for (const s of seats) {
      const m = /^([A-Za-z]+)\s*(\d+)$/.exec((s.seat || '').trim())
      if (!m) { odd.push(s); continue }
      const row = m[1].toUpperCase()
      if (!map.has(row)) map.set(row, [])
      map.get(row).push({ ...s, row, col: Number(m[2]) })
    }
    const ordered = [...map.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([row, list]) => [row, list.sort((a, b) => a.col - b.col)])
    return { rows: ordered, unplaced: odd }
  }, [seats])

  if (loading) {
    return (
      <div className="space-y-2" aria-hidden="true">
        {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-9" />)}
      </div>
    )
  }

  if (!seats.length) {
    return (
      <EmptyState
        icon={LayoutGrid}
        title="No seat plan for this exam"
        description="Upload a seat plan CSV under Exams & Halls to click a seat instead of typing the student's details."
        className="py-8"
      />
    )
  }

  const seatButton = (s) => {
    const isSelected = selected && s.seat.toUpperCase() === String(selected).toUpperCase()
    const isFlagged = highlightRegNo && s.student_reg_no === highlightRegNo
    return (
      <button
        key={s.seat}
        type="button"
        onClick={() => onSelect?.(s)}
        aria-pressed={isSelected}
        title={`${s.seat} · ${s.student_name || 'Unassigned'} (${s.student_reg_no})`}
        className={`w-9 h-9 shrink-0 rounded-lg border text-[11px] font-semibold tnum
                    transition-colors duration-fast ease-smooth
                    ${isSelected
                      ? 'bg-brand text-brand-fg border-brand'
                      : isFlagged
                        ? 'bg-warn-soft text-warn border-warn/40 hover:border-warn'
                        : 'bg-surface-2 text-muted border-line hover:border-brand hover:text-fg'}`}
      >
        {s.seat}
      </button>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-center gap-2 mb-4 text-micro uppercase text-subtle">
        <Monitor size={13} aria-hidden="true" /> Front of hall / invigilator desk
      </div>

      <div className="overflow-x-auto pb-1">
        <div className="space-y-2 min-w-max mx-auto">
          {rows.map(([row, list]) => (
            <div key={row} className="flex items-center gap-2">
              <span className="w-5 text-small text-subtle font-medium shrink-0">{row}</span>
              <div className="flex gap-1.5">{list.map(seatButton)}</div>
            </div>
          ))}
          {unplaced.length > 0 && (
            <div className="flex items-center gap-2 pt-2 border-t border-line">
              <span className="w-5 text-small text-subtle shrink-0">·</span>
              <div className="flex flex-wrap gap-1.5">{unplaced.map(seatButton)}</div>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 mt-4 text-small text-subtle">
        <span className="inline-flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-brand" aria-hidden="true" /> Selected
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-surface-2 border border-line" aria-hidden="true" /> Occupied
        </span>
        <span className="tnum">{seats.length} seats</span>
      </div>
    </div>
  )
}
