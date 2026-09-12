import { Inbox } from 'lucide-react'

/** Empty states always tell the user what to do next. */
export default function EmptyState({ icon: Icon = Inbox, title, description, action, className = '' }) {
  return (
    <div className={`flex flex-col items-center justify-center text-center py-12 px-6 ${className}`}>
      <div className="w-12 h-12 rounded-2xl bg-surface-2 border border-line flex items-center justify-center mb-4">
        <Icon size={20} className="text-subtle" aria-hidden="true" />
      </div>
      <h3 className="font-display text-subtitle font-semibold text-fg">{title}</h3>
      {description && <p className="text-body text-muted mt-1.5 max-w-sm">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
