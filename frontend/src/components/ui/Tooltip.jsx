/** CSS-only tooltip; no portal, no layout shift. */
export default function Tooltip({ label, side = 'right', children, className = '' }) {
  const pos = {
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2'
  }
  return (
    <span className={`relative group/tt inline-flex ${className}`}>
      {children}
      <span
        role="tooltip"
        className={`pointer-events-none absolute z-50 whitespace-nowrap rounded-lg bg-surface-3 border border-line
                    px-2 py-1 text-small text-fg shadow-e2 opacity-0 group-hover/tt:opacity-100
                    group-focus-within/tt:opacity-100 transition-opacity duration-fast ${pos[side]}`}
      >
        {label}
      </span>
    </span>
  )
}
