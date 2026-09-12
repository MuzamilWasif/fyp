import { STATUS_TONE, statusLabel, severityTone, pct } from '../../lib/format'

export default function Badge({ tone = 'neutral', icon: Icon, children, className = '' }) {
  return (
    <span className={`badge-${tone} ${className}`}>
      {Icon && <Icon size={11} aria-hidden="true" />}
      {children}
    </span>
  )
}

export function StatusBadge({ status, className = '' }) {
  return (
    <span className={`${STATUS_TONE[status] || 'badge-neutral'} ${className}`}>
      {statusLabel(status)}
    </span>
  )
}

export function SeverityBadge({ severity, showValue = true, className = '' }) {
  const tone = severityTone(severity)
  return (
    <span className={`${tone.badge} ${className}`}>
      {tone.label}{showValue && ` · ${pct(severity)}`}
    </span>
  )
}
