export default function Tabs({ tabs, value, onChange, className = '' }) {
  return (
    <div role="tablist" aria-label="Sections"
         className={`inline-flex gap-1 p-1 bg-surface-2 border border-line rounded-xl ${className}`}>
      {tabs.map((t) => {
        const active = t.value === value
        return (
          <button
            key={t.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(t.value)}
            className={`px-3 py-1.5 rounded-[10px] text-small font-medium transition-colors duration-fast ease-smooth
              ${active ? 'bg-surface text-fg shadow-e1' : 'text-muted hover:text-fg'}`}
          >
            {t.label}
            {t.count != null && (
              <span className={`ml-1.5 tnum ${active ? 'text-brand' : 'text-subtle'}`}>{t.count}</span>
            )}
          </button>
        )
      })}
    </div>
  )
}
