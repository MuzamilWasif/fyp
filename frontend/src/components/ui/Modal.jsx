import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

/** Accessible dialog: Esc to close, focus trapped, backdrop click closes. */
export default function Modal({ open, onClose, title, description, size = 'md', footer, children }) {
  const panelRef = useRef(null)
  const restoreRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    restoreRef.current = document.activeElement
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const onKey = (e) => {
      if (e.key === 'Escape') { e.stopPropagation(); onClose?.() }
      if (e.key === 'Tab') {
        const nodes = panelRef.current?.querySelectorAll(
          'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
        )
        if (!nodes?.length) return
        const first = nodes[0]
        const last = nodes[nodes.length - 1]
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
      }
    }
    document.addEventListener('keydown', onKey)
    const t = setTimeout(() => {
      const focusable = panelRef.current?.querySelector(
        'input, textarea, select, button:not([data-close])'
      )
      ;(focusable || panelRef.current)?.focus()
    }, 20)

    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
      clearTimeout(t)
      restoreRef.current?.focus?.()
    }
  }, [open, onClose])

  if (!open) return null

  const widths = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' }

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-4 no-print">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-[2px] animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === 'string' ? title : 'Dialog'}
        tabIndex={-1}
        className={`relative w-full ${widths[size] || widths.md} bg-surface border border-line
                    rounded-t-2xl sm:rounded-2xl shadow-e3 animate-slide-up sm:animate-scale-in
                    max-h-[92vh] flex flex-col`}
      >
        <header className="flex items-start justify-between gap-4 p-5 pb-3">
          <div className="min-w-0">
            <h2 className="font-display text-subtitle font-semibold text-fg">{title}</h2>
            {description && <p className="text-small text-muted mt-1">{description}</p>}
          </div>
          <button
            data-close
            onClick={onClose}
            aria-label="Close dialog"
            className="text-subtle hover:text-fg transition-colors duration-fast shrink-0"
          >
            <X size={18} />
          </button>
        </header>
        <div className="px-5 pb-5 overflow-y-auto">{children}</div>
        {footer && <footer className="flex justify-end gap-2 p-5 pt-4 border-t border-line">{footer}</footer>}
      </div>
    </div>,
    document.body
  )
}
