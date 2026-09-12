import { useMemo, useState } from 'react'
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'
import { SkeletonRows } from './Skeleton'

/**
 * Sortable table on desktop, card list on mobile.
 * columns: [{ key, header, render?, sortable?, sortValue?, className?, thClassName? }]
 */
export default function DataTable({
  columns, rows, rowKey = (r) => r.id, onRowClick, loading = false,
  empty = null, mobileCard, initialSort = null, className = ''
}) {
  const [sort, setSort] = useState(initialSort) // { key, dir }

  const sorted = useMemo(() => {
    if (!sort) return rows
    const col = columns.find((c) => c.key === sort.key)
    if (!col) return rows
    const val = col.sortValue || ((r) => r[col.key])
    return [...rows].sort((a, b) => {
      const av = val(a), bv = val(b)
      if (av == null) return 1
      if (bv == null) return -1
      const cmp = typeof av === 'number' && typeof bv === 'number'
        ? av - bv
        : String(av).localeCompare(String(bv), undefined, { numeric: true })
      return sort.dir === 'asc' ? cmp : -cmp
    })
  }, [rows, sort, columns])

  const toggleSort = (key) =>
    setSort((s) => (s?.key === key
      ? (s.dir === 'asc' ? { key, dir: 'desc' } : null)
      : { key, dir: 'asc' }))

  if (loading) {
    return (
      <>
        <div className={`hidden md:block bg-surface border border-line rounded-2xl overflow-hidden ${className}`}>
          <SkeletonRows rows={6} cols={Math.min(columns.length, 6)} />
        </div>
        <div className="md:hidden grid gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton h-32" aria-hidden="true" />
          ))}
        </div>
      </>
    )
  }

  if (!rows.length) {
    return <div className={`bg-surface border border-line rounded-2xl ${className}`}>{empty}</div>
  }

  return (
    <>
      {/* desktop */}
      <div className={`hidden md:block bg-surface border border-line rounded-2xl overflow-hidden ${className}`}>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-line bg-surface-2/50">
                {columns.map((c) => (
                  <th key={c.key} scope="col" className={`th ${c.thClassName || ''}`}
                      aria-sort={sort?.key === c.key ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}>
                    {c.sortable ? (
                      <button
                        onClick={() => toggleSort(c.key)}
                        className="inline-flex items-center gap-1 hover:text-fg transition-colors duration-fast uppercase"
                      >
                        {c.header}
                        {sort?.key === c.key
                          ? (sort.dir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)
                          : <ChevronsUpDown size={12} className="opacity-40" />}
                      </button>
                    ) : c.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {sorted.map((row) => (
                <tr
                  key={rowKey(row)}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  onKeyDown={onRowClick ? (e) => { if (e.key === 'Enter') onRowClick(row) } : undefined}
                  tabIndex={onRowClick ? 0 : undefined}
                  role={onRowClick ? 'button' : undefined}
                  className={`row-hover ${onRowClick ? 'cursor-pointer' : ''}`}
                >
                  {columns.map((c) => (
                    <td key={c.key} className={`td ${c.className || ''}`}>
                      {c.render ? c.render(row) : row[c.key]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* mobile */}
      <div className="md:hidden grid gap-3">
        {sorted.map((row) => (
          <div key={rowKey(row)}>
            {mobileCard
              ? mobileCard(row)
              : (
                <div className="card-tight" onClick={onRowClick ? () => onRowClick(row) : undefined}>
                  {columns.map((c) => (
                    <div key={c.key} className="flex justify-between gap-3 py-1 text-body">
                      <span className="text-subtle text-small">{c.header}</span>
                      <span className="text-right">{c.render ? c.render(row) : row[c.key]}</span>
                    </div>
                  ))}
                </div>
              )}
          </div>
        ))}
      </div>
    </>
  )
}
