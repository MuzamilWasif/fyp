import { NavLink } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import { navFor } from '../lib/nav'
import Tooltip from './ui/Tooltip'

/** The VigilantEye mark, reduced to the rail. */
function Mark() {
  return (
    <svg width="28" height="28" viewBox="0 0 34 34" aria-hidden="true" className="shrink-0">
      <path d="M9 10 L17 25 L25 10" stroke="#2DE3A7" strokeWidth="2.4" fill="none" />
      <circle cx="17" cy="14" r="3.4" fill="#06090F" stroke="#2DE3A7" strokeWidth="1.4" />
    </svg>
  )
}

/**
 * Icon rail. Compact by design — 72px on desktop; the mobile drawer reuses
 * the same component with labels shown.
 */
export default function Sidebar({ user, expanded = false, onNavigate, onSignOut }) {
  const items = navFor(user.role)

  return (
    <div className={`h-full flex flex-col bg-chrome border-r border-line py-5
                     ${expanded ? 'px-3 w-[268px]' : 'items-center'}`}>
      <div className={`flex items-center gap-2.5 mb-[18px] ${expanded ? 'px-2' : ''}`}>
        <Mark />
        {expanded && (
          <div className="min-w-0">
            <div className="font-display text-body font-semibold text-fg leading-tight">VigilantEye</div>
            <div className="font-mono text-micro text-faint leading-tight">Air University</div>
          </div>
        )}
      </div>

      <nav aria-label="Main navigation" className={`flex-1 flex flex-col gap-2 ${expanded ? 'w-full' : ''}`}>
        {items.map(({ to, label, icon: Icon, end }) => {
          const link = (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={onNavigate}
              className={({ isActive }) =>
                `relative flex items-center rounded-xl transition-colors duration-fast ease-out
                 ${expanded ? 'gap-3 px-3 h-11 w-full text-body font-medium' : 'w-11 h-11 justify-center'}
                 ${isActive
                   ? 'bg-brand-soft text-brand'
                   : 'text-faint hover:bg-surface-2 hover:text-muted'}`
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <span aria-hidden="true"
                          className={`absolute top-1/2 -translate-y-1/2 w-0.5 h-7 rounded-sm bg-brand
                                      ${expanded ? '-left-3' : '-left-[9px]'}`} />
                  )}
                  <Icon size={19} strokeWidth={1.8} className="shrink-0" aria-hidden="true" />
                  {expanded && <span className="truncate">{label}</span>}
                </>
              )}
            </NavLink>
          )
          return expanded ? link : <Tooltip key={to} label={label} side="right">{link}</Tooltip>
        })}
      </nav>

      <Tooltip label="Sign out" side="right">
        <button
          onClick={onSignOut}
          aria-label="Sign out"
          className={`flex items-center rounded-xl text-faint hover:bg-surface-2 hover:text-danger
                      transition-colors duration-fast ease-out
                      ${expanded ? 'gap-3 px-3 h-11 w-full text-body' : 'w-11 h-11 justify-center'}`}
        >
          <LogOut size={18} strokeWidth={1.8} aria-hidden="true" />
          {expanded && <span>Sign out</span>}
        </button>
      </Tooltip>
    </div>
  )
}
