import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Menu, ChevronRight, UserRound, LogOut, KeyRound } from 'lucide-react'
import { breadcrumbs } from '../lib/nav'
import { ROLE_SHORT } from '../lib/format'
import NotificationBell from './NotificationBell'

const initials = (name = '') =>
  name.split(' ').filter(Boolean).slice(0, 2).map((n) => n[0]).join('').toUpperCase() || '?'

export default function Topbar({ user, onOpenSidebar, onSignOut }) {
  const loc = useLocation()
  const nav = useNavigate()
  const crumbs = breadcrumbs(loc.pathname)
  const [menu, setMenu] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    if (!menu) return undefined
    const onDown = (e) => { if (!menuRef.current?.contains(e.target)) setMenu(false) }
    const onKey = (e) => { if (e.key === 'Escape') setMenu(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey) }
  }, [menu])

  return (
    <header className="app-topbar sticky top-0 z-40 h-[60px] shrink-0 bg-bg/85 backdrop-blur-md
                       border-b border-line flex items-center gap-3 px-4 md:px-6 no-print">
      <button onClick={onOpenSidebar} aria-label="Open navigation"
              className="btn-subtle btn-icon lg:hidden text-muted hover:text-fg">
        <Menu size={20} aria-hidden="true" />
      </button>

      <nav aria-label="Breadcrumb" className="min-w-0 flex-1">
        <ol className="flex items-center gap-1 text-body min-w-0">
          {crumbs.map((c, i) => {
            const last = i === crumbs.length - 1
            return (
              <li key={c.to}
                  className={`items-center gap-1 min-w-0 ${last ? 'flex' : 'hidden sm:flex'}`}>
                {i > 0 && <ChevronRight size={14} className="text-subtle shrink-0" aria-hidden="true" />}
                {last
                  ? <span className="font-semibold text-fg truncate" aria-current="page">{c.label}</span>
                  : <Link to={c.to} className="text-subtle hover:text-fg transition-colors duration-fast truncate">
                      {c.label}
                    </Link>}
              </li>
            )
          })}
        </ol>
      </nav>

      <NotificationBell />

      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setMenu((m) => !m)}
          aria-label="Account menu"
          aria-expanded={menu}
          aria-haspopup="true"
          className="flex items-center gap-2 rounded-xl px-1.5 py-1.5 hover:bg-surface-2
                     transition-colors duration-fast"
        >
          <span className="w-7 h-7 rounded-full bg-surface-3 border border-line flex items-center justify-center
                           text-micro font-bold text-brand" aria-hidden="true">
            {initials(user.full_name)}
          </span>
          <span className="hidden md:block text-left leading-tight">
            <span className="block text-small font-medium text-fg max-w-[140px] truncate">{user.full_name}</span>
            <span className="block text-micro text-subtle">{ROLE_SHORT[user.role] || user.role}</span>
          </span>
        </button>

        {menu && (
          <div role="menu"
               className="absolute right-0 mt-2 w-56 bg-surface-3 border border-line rounded-2xl shadow-e3
                          z-50 p-1.5 animate-slide-down">
            <div className="px-3 py-2 border-b border-line mb-1.5">
              <div className="text-body font-semibold truncate">{user.full_name}</div>
              <div className="text-small text-subtle truncate">{user.email}</div>
            </div>
            <button role="menuitem" onClick={() => { setMenu(false); nav('/profile') }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-body text-muted
                               hover:bg-surface-2 hover:text-fg transition-colors duration-fast">
              <UserRound size={15} aria-hidden="true" /> My profile
            </button>
            <button role="menuitem" onClick={() => { setMenu(false); nav('/profile#password') }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-body text-muted
                               hover:bg-surface-2 hover:text-fg transition-colors duration-fast">
              <KeyRound size={15} aria-hidden="true" /> Change password
            </button>
            <button role="menuitem" onClick={onSignOut}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-body text-danger
                               hover:bg-danger-soft transition-colors duration-fast">
              <LogOut size={15} aria-hidden="true" /> Sign out
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
