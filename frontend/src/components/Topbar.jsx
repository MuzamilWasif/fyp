import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Menu, Search, UserRound, LogOut, KeyRound, ChevronDown } from 'lucide-react'
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
  const [query, setQuery] = useState('')
  const menuRef = useRef(null)
  const searchRef = useRef(null)

  useEffect(() => {
    if (!menu) return undefined
    const onDown = (e) => { if (!menuRef.current?.contains(e.target)) setMenu(false) }
    const onKey = (e) => { if (e.key === 'Escape') setMenu(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey) }
  }, [menu])

  // ⌘K / Ctrl+K focuses search, as the shortcut hint promises
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        searchRef.current?.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  const runSearch = (e) => {
    e.preventDefault()
    const q = query.trim()
    if (!q) return
    nav(`/cases?q=${encodeURIComponent(q)}`)
    setQuery('')
    searchRef.current?.blur()
  }

  return (
    <header className="app-topbar sticky top-0 z-40 h-16 shrink-0 bg-chrome/90 backdrop-blur-md
                       border-b border-line flex items-center gap-4 px-4 md:px-6 no-print">
      <button onClick={onOpenSidebar} aria-label="Open navigation"
              className="btn-subtle btn-icon lg:hidden">
        <Menu size={20} aria-hidden="true" />
      </button>

      <nav aria-label="Breadcrumb" className="min-w-0">
        <ol className="flex items-center gap-2 text-body min-w-0">
          <li className="hidden sm:block text-faint">VigilantEye</li>
          {crumbs.slice(loc.pathname === '/' ? 0 : 1).map((c, i, arr) => {
            const last = i === arr.length - 1
            return (
              <li key={c.to} className={`items-center gap-2 min-w-0 ${last ? 'flex' : 'hidden sm:flex'}`}>
                <span className="text-line-strong hidden sm:inline" aria-hidden="true">/</span>
                {last
                  ? <span className="text-fg font-medium truncate" aria-current="page">{c.label}</span>
                  : <Link to={c.to} className="text-subtle hover:text-fg transition-colors duration-fast truncate">
                      {c.label}
                    </Link>}
              </li>
            )
          })}
        </ol>
      </nav>

      <div className="flex-1" />

      <form onSubmit={runSearch} className="relative hidden md:flex items-center w-[260px] xl:w-[320px]">
        <Search size={15} strokeWidth={1.9} aria-hidden="true"
                className="absolute left-3 text-faint pointer-events-none" />
        <input
          ref={searchRef}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search cases, students, cameras"
          aria-label="Search cases"
          className="input h-[38px] pl-9 pr-14"
        />
        <span className="kbd absolute right-2.5 pointer-events-none">⌘K</span>
      </form>

      <NotificationBell />

      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setMenu((m) => !m)}
          aria-label="Account menu"
          aria-expanded={menu}
          aria-haspopup="true"
          className="flex items-center gap-2.5 py-1 pl-1 pr-2.5 rounded-xl hover:bg-surface-2
                     transition-colors duration-fast"
        >
          <span className="w-[30px] h-[30px] rounded-[9px] bg-surface-2 border border-line flex items-center
                           justify-center font-display text-small font-semibold text-brand" aria-hidden="true">
            {initials(user.full_name)}
          </span>
          <span className="hidden md:block text-left leading-[1.25]">
            <span className="block text-small font-medium text-fg max-w-[120px] truncate">{user.full_name}</span>
            <span className="block font-mono text-micro text-faint uppercase">
              {ROLE_SHORT[user.role] || user.role}
            </span>
          </span>
          <ChevronDown size={13} strokeWidth={2} className="text-faint hidden md:block" aria-hidden="true" />
        </button>

        {menu && (
          <div role="menu"
               className="absolute right-0 mt-2 w-56 bg-surface-2 border border-line rounded-2xl shadow-e3
                          z-50 p-1.5 animate-slide-down">
            <div className="px-3 py-2 border-b border-line mb-1.5">
              <div className="text-body font-medium text-fg truncate">{user.full_name}</div>
              <div className="text-small text-faint truncate">{user.email}</div>
            </div>
            <button role="menuitem" onClick={() => { setMenu(false); nav('/profile') }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-body text-muted
                               hover:bg-surface-3 hover:text-fg transition-colors duration-fast">
              <UserRound size={15} aria-hidden="true" /> My profile
            </button>
            <button role="menuitem" onClick={() => { setMenu(false); nav('/profile#password') }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-body text-muted
                               hover:bg-surface-3 hover:text-fg transition-colors duration-fast">
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
