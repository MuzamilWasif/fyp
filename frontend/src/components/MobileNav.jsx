import { NavLink } from 'react-router-dom'
import { mobileNavFor } from '../lib/nav'

/** Bottom tab bar for phones, mirroring the scope document mockups. */
export default function MobileNav({ role }) {
  const items = mobileNavFor(role)
  return (
    <nav
      aria-label="Primary"
      className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-surface/95 backdrop-blur-md border-t border-line
                 pb-[env(safe-area-inset-bottom)] no-print"
    >
      <ul className="flex">
        {items.map(({ to, label, icon: Icon, end }) => (
          <li key={to} className="flex-1">
            <NavLink
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-1 py-2.5 text-[10px] font-medium
                 transition-colors duration-fast ${isActive ? 'text-brand' : 'text-subtle hover:text-muted'}`
              }
            >
              <Icon size={19} aria-hidden="true" />
              <span className="truncate max-w-full px-1">{label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
