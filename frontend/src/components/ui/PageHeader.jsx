export default function PageHeader({ title, subtitle, actions, className = '' }) {
  return (
    <div className={`flex flex-wrap items-start justify-between gap-3 mb-6 ${className}`}>
      <div className="min-w-0">
        <h1 className="font-display text-display font-semibold text-fg">{title}</h1>
        {subtitle && <p className="text-body text-muted mt-1">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 no-print">{actions}</div>}
    </div>
  )
}
