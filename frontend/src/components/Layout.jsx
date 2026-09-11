import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import NotificationBell from './NotificationBell'

const ROLE_LABELS = {
  admin: 'Admin', invigilator: 'Invigilator', hod: 'HOD', dec: 'DEC',
  exam_dept: 'Examination Dept', ufm_committee: 'UFM Committee', student: 'Student'
}

export default function Layout({ children }) {
  const { user, logout } = useAuth()
  const loc = useLocation()

  const links = [
    { to: '/', label: 'Dashboard' },
    { to: '/cases', label: 'Cases' },
  ]
  if (['invigilator', 'admin'].includes(user.role)) links.push({ to: '/cases/new', label: 'Report UFM' })
  if (['invigilator', 'hod', 'exam_dept', 'admin'].includes(user.role)) links.push({ to: '/alerts', label: 'Live Alerts' })
  if (['exam_dept', 'ufm_committee', 'admin'].includes(user.role)) links.push({ to: '/audit', label: 'Audit Trail' })

  return (
    <div className="min-h-screen flex">
      <aside className="w-56 border-r border-neutral-800 p-4 flex flex-col gap-1">
        <div className="text-brand font-bold text-lg mb-4">VigilantEye</div>
        {links.map(l => (
          <Link key={l.to} to={l.to}
            className={`px-3 py-2 rounded-lg text-sm ${loc.pathname === l.to ? 'bg-brand text-black font-semibold' : 'hover:bg-neutral-800'}`}>
            {l.label}
          </Link>
        ))}
        <div className="mt-auto text-xs text-neutral-400">
          <div className="font-medium text-neutral-200">{user.full_name}</div>
          <div>{ROLE_LABELS[user.role]}</div>
          <button onClick={logout} className="mt-2 text-red-400 hover:underline">Sign out</button>
        </div>
      </aside>
      <main className="flex-1 p-6 overflow-y-auto">
        <div className="flex justify-end mb-4"><NotificationBell /></div>
        {children}
      </main>
    </div>
  )
}
