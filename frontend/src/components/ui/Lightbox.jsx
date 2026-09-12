import { useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'

/** Full-screen evidence viewer with keyboard navigation. */
export default function Lightbox({ items = [], index, onClose, onNavigate }) {
  const open = index != null && index >= 0 && index < items.length

  const go = useCallback((delta) => {
    if (!items.length) return
    onNavigate?.((index + delta + items.length) % items.length)
  }, [index, items.length, onNavigate])

  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.()
      if (e.key === 'ArrowRight') go(1)
      if (e.key === 'ArrowLeft') go(-1)
    }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev }
  }, [open, go, onClose])

  if (!open) return null
  const item = items[index]

  return createPortal(
    <div className="fixed inset-0 z-[90] bg-black/92 flex flex-col animate-fade-in no-print"
         role="dialog" aria-modal="true" aria-label="Evidence viewer">
      <div className="flex items-center justify-between p-4 text-body">
        <span className="text-muted tnum">{index + 1} / {items.length}</span>
        <button onClick={onClose} aria-label="Close viewer"
                className="text-muted hover:text-fg transition-colors duration-fast">
          <X size={22} />
        </button>
      </div>

      <div className="flex-1 flex items-center justify-center px-4 pb-4 min-h-0">
        {items.length > 1 && (
          <button onClick={() => go(-1)} aria-label="Previous evidence"
                  className="p-3 text-muted hover:text-fg transition-colors duration-fast shrink-0">
            <ChevronLeft size={28} />
          </button>
        )}
        <div className="flex-1 h-full flex items-center justify-center min-w-0">
          {item.file_type === 'image'
            ? <img src={item.url} alt={item.caption || 'Evidence'} className="max-h-full max-w-full object-contain rounded-xl" />
            : <video src={item.url} controls autoPlay className="max-h-full max-w-full rounded-xl" />}
        </div>
        {items.length > 1 && (
          <button onClick={() => go(1)} aria-label="Next evidence"
                  className="p-3 text-muted hover:text-fg transition-colors duration-fast shrink-0">
            <ChevronRight size={28} />
          </button>
        )}
      </div>

      {item.caption && (
        <div className="px-6 pb-6 text-center text-small text-muted">{item.caption}</div>
      )}
    </div>,
    document.body
  )
}
