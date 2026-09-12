import { NavLink } from 'react-router-dom'
import { Eye, PanelLeftClose, PanelLeftOpen, LogOut } from 'lucide-react'
import { navFor } from '../lib/nav'
import { ROLE_SHORT } from '../lib/format'
import Tooltip from './ui/Tooltip'

const initials = (name = '') =>
  name.split(' ').filter(Boolean).slice(0, 2).map((n) => n[0]).join('').toUpperCase() || '?'

export default function Sidebar({ user, collapsed, onToggle, onNavigate, onSignOut }) {
  const items = navFor(user.role)

  return (
    <div className="h-full flex flex-col bg-surface border-r border-line">
      {/* brand */}
      <div className={`flex items-center gap-2.5 h-[60px] px-4 border-b border-line ${collapsed ? 'justify-center px-0' : ''}`}>
        <span className="w-8 h-8 rounded-xl bg-brand flex items-center justify-center shrink-0">
          <Eye size={17} className="text-brand-fg" aria-hidden="true" />
        </span>
        {!collapsed && (
          <div className="min-w-0">
            <div className="text-body font-bold leading-tight tracking-tight">VigilantEye</div>
            <div className="text-micro text-subtle leading-tight">Air University</div>
          </div>
        )}
      </div>

      {/* nav */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-1" aria-label="Main navigation">
        {items.map(({ to, label, icon: Icon, end }) => {
          const link = (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={onNavigate}
              className={({ isActive }) =>
                `relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-body font-medium
                 transition-colors duration-fast ease-smooth
                 ${collapsed ? 'justify-center px-0' : ''}
                 ${isActive
                   ? 'bg-brand-soft text-brand'
                   : 'text-muted hover:bg-surface-2 hover:text-fg'}`
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && !collapsed && (
                    <span aria-hidden="true"
                          className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-r-full bg-brand" />
                  )}
                  <Icon size={18} className="shrink-0" aria-hidden="true" />
                  {!collapsed && <span className="truncate">{label}</span>}
                </>
              )}
            </NavLink>
          )
          return collapsed
            ? <Tooltip key={to} label={label} side="right" className="w-full">{link}</Tooltip>
            : link
        })}
      </nav>

      {/* user + collapse */}
      <div className="border-t border-line p-3">
        <div className={`flex items-center gap-2.5 mb-2 ${collapsed ? 'justify-center' : ''}`}>
          <span className="w-8 h-8 rounded-full bg-surface-3 border border-line flex items-center justify-center
                           text-micro font-bold text-brand shrink-0" aria-hidden="true">
            {initials(user.full_name)}
          </span>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <div className="text-small font-semibold truncate">{user.full_name}</div>
              <div className="text-micro text-subtle truncate">{ROLE_SHORT[user.role] || user.role}</div>
            </div>
          )}
        </div>

        <div className={`flex gap-1 ${collapsed ? 'flex-col items-center' : ''}`}>
          <Tooltip label="Sign out" side={collapsed ? 'right' : 'top'}>
            <button onClick={onSignOut} aria-label="Sign out"
                    className="btn-subtle btn-sm text-muted hover:text-danger">
              <LogOut size={15} aria-hidden="true" />
              {!collapsed && <span>Sign out</span>}
            </button>
          </Tooltip>
          <Tooltip label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} side={collapsed ? 'right' : 'top'}>
            <button onClick={onToggle} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                    aria-expanded={!collapsed}
                    className="btn-subtle btn-sm ml-auto">
              {collapsed ? <PanelLeftOpen size={15} /> : <PanelLeftClose size={15} />}
            </button>
          </Tooltip>
        </div>
      </div>
    </div>
  )
}
