import { useId } from 'react'
import { AlertCircle, ChevronDown } from 'lucide-react'

export function Field({ label, error, hint, required, children, className = '', htmlFor }) {
  return (
    <div className={className}>
      {label && (
        <label className="label" htmlFor={htmlFor}>
          {label}{required && <span className="text-danger ml-0.5" aria-hidden="true">*</span>}
        </label>
      )}
      {children}
      {error
        ? <p className="error-text" role="alert"><AlertCircle size={13} aria-hidden="true" />{error}</p>
        : hint && <p className="hint">{hint}</p>}
    </div>
  )
}

export function Input({ label, error, hint, required, className = '', wrapperClassName = '', id, ...props }) {
  const auto = useId()
  const fieldId = id || auto
  return (
    <Field label={label} error={error} hint={hint} required={required} className={wrapperClassName} htmlFor={fieldId}>
      <input
        id={fieldId}
        aria-invalid={error ? 'true' : undefined}
        className={`input ${error ? 'input-error' : ''} ${className}`}
        {...props}
      />
    </Field>
  )
}

export function Textarea({ label, error, hint, required, className = '', wrapperClassName = '', id, ...props }) {
  const auto = useId()
  const fieldId = id || auto
  return (
    <Field label={label} error={error} hint={hint} required={required} className={wrapperClassName} htmlFor={fieldId}>
      <textarea
        id={fieldId}
        aria-invalid={error ? 'true' : undefined}
        className={`input resize-y ${error ? 'input-error' : ''} ${className}`}
        {...props}
      />
    </Field>
  )
}

export function Select({ label, error, hint, required, className = '', wrapperClassName = '', id, children, ...props }) {
  const auto = useId()
  const fieldId = id || auto
  return (
    <Field label={label} error={error} hint={hint} required={required} className={wrapperClassName} htmlFor={fieldId}>
      <div className="relative">
        <select
          id={fieldId}
          aria-invalid={error ? 'true' : undefined}
          className={`input appearance-none pr-9 ${error ? 'input-error' : ''} ${className}`}
          {...props}
        >
          {children}
        </select>
        <ChevronDown size={15} aria-hidden="true"
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-subtle" />
      </div>
    </Field>
  )
}

export default Field
