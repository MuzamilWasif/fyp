import { forwardRef } from 'react'
import { Loader2 } from 'lucide-react'

const VARIANTS = {
  brand: 'btn-brand',
  ghost: 'btn-ghost',
  subtle: 'btn-subtle',
  outline: 'btn-outline',
  danger: 'btn-danger'
}

const Button = forwardRef(function Button(
  { variant = 'ghost', size = 'md', icon: Icon, iconRight: IconRight, loading = false,
    disabled, className = '', children, ...props }, ref
) {
  const base = VARIANTS[variant] || VARIANTS.ghost
  const sizeCls = size === 'sm' ? 'btn-sm' : ''
  const iconOnly = !children
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`${base} ${sizeCls} ${iconOnly ? 'btn-icon' : ''} ${className}`}
      {...props}
    >
      {loading
        ? <Loader2 size={size === 'sm' ? 14 : 16} className="animate-spin" aria-hidden="true" />
        : Icon && <Icon size={size === 'sm' ? 14 : 16} aria-hidden="true" />}
      {children}
      {IconRight && !loading && <IconRight size={size === 'sm' ? 14 : 16} aria-hidden="true" />}
    </button>
  )
})

export default Button
