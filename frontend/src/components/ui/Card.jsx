export default function Card({ title, subtitle, action, icon: Icon, padded = true, className = '', bodyClassName = '', children, ...rest }) {
  return (
    <section className={`bg-surface border border-line rounded-2xl ${padded ? 'p-5' : ''} ${className}`} {...rest}>
      {(title || action) && (
        <header className={`flex flex-wrap items-start justify-between gap-x-3 gap-y-2 ${padded ? 'mb-4' : 'p-5 pb-4'}`}>
          <div className="min-w-0">
            <h2 className="text-subtitle font-semibold text-fg flex items-center gap-2">
              {Icon && <Icon size={16} className="text-brand shrink-0" aria-hidden="true" />}
              {title}
            </h2>
            {subtitle && <p className="text-small text-subtle mt-0.5">{subtitle}</p>}
          </div>
          {action && <div className="shrink-0 no-print">{action}</div>}
        </header>
      )}
      <div className={bodyClassName}>{children}</div>
    </section>
  )
}
