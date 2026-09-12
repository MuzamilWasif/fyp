import { ChevronLeft, ChevronRight } from 'lucide-react'
import Button from './Button'

/** Offset pager driven by the API's {total, limit, offset} envelope. */
export default function Pagination({ total = 0, limit = 25, offset = 0, onChange, className = '' }) {
  if (total <= limit) return null
  const page = Math.floor(offset / limit) + 1
  const pages = Math.max(1, Math.ceil(total / limit))
  const from = total === 0 ? 0 : offset + 1
  const to = Math.min(offset + limit, total)

  return (
    <nav aria-label="Pagination"
         className={`flex items-center justify-between gap-3 mt-4 no-print ${className}`}>
      <span className="text-small text-subtle tnum">
        Showing {from}–{to} of {total}
      </span>
      <div className="flex items-center gap-2">
        <Button size="sm" variant="ghost" icon={ChevronLeft} disabled={page <= 1}
                aria-label="Previous page" onClick={() => onChange(Math.max(0, offset - limit))}>
          Prev
        </Button>
        <span className="text-small text-muted tnum px-1">{page} / {pages}</span>
        <Button size="sm" variant="ghost" iconRight={ChevronRight} disabled={page >= pages}
                aria-label="Next page" onClick={() => onChange(offset + limit)}>
          Next
        </Button>
      </div>
    </nav>
  )
}
