import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import MobileNav from './MobileNav'
import AlertBridge from './AlertBridge'

export default function AppShell({ children }) {
  const { user, logout } = useAuth()
  const loc = useLocation()
  const [drawer, setDrawer] = useState(false)

  // close the mobile drawer whenever the route changes
  useEffect(() => { setDrawer(false) }, [loc.pathname])

  useEffect(() => {
    if (!drawer) return undefined
    const onKey = (e) => { if (e.key === 'Escape') setDrawer(false) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [drawer])

  return (
    <div className="min-h-screen flex bg-bg">
      <a href="#main-content"
         className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100]
                    focus:btn-brand focus:px-4 focus:py-2">
        Skip to content
      </a>

      {/* desktop sidebar */}
      <aside className="hidden lg:block shrink-0 w-[72px] no-print">
        <div className="fixed top-0 bottom-0 left-0 w-[72px]">
          <Sidebar user={user} onSignOut={logout} />
        </div>
      </aside>

      {/* mobile drawer */}
      {drawer && (
        <div className="lg:hidden fixed inset-0 z-[60] no-print">
          <div className="absolute inset-0 bg-black/70 animate-fade-in" onClick={() => setDrawer(false)} aria-hidden="true" />
          <div className="absolute inset-y-0 left-0 shadow-e3 animate-slide-down">
            <Sidebar
              user={user}
              expanded
              onNavigate={() => setDrawer(false)}
              onSignOut={logout}
            />
          </div>
        </div>
      )}

      <div className="flex-1 min-w-0 flex flex-col">
        <Topbar user={user} onOpenSidebar={() => setDrawer(true)} onSignOut={logout} />
        <main id="main-content" className="app-main flex-1 px-4 py-6 md:px-8 md:py-7 pb-24 lg:pb-12 min-w-0">
          {children}
        </main>
      </div>

      <MobileNav role={user.role} />
      <AlertBridge />
    </div>
  )
}
