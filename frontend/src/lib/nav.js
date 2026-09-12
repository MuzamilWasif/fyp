import {
  LayoutDashboard, FolderOpen, FilePlus2, Siren, Video, CalendarCog,
  ScrollText, Users, BarChart3, UserRound
} from 'lucide-react'

/** Single source of truth for navigation and breadcrumbs. */
const ITEMS = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, roles: '*', end: true, mobile: true },
  { to: '/cases', label: 'Cases', icon: FolderOpen, roles: '*', mobile: true },
  { to: '/cases/new', label: 'Report UFM', icon: FilePlus2, roles: ['invigilator', 'admin'], mobile: true },
  { to: '/alerts', label: 'Live Alerts', icon: Siren, roles: ['invigilator', 'hod', 'exam_dept', 'admin'], mobile: true },
  { to: '/monitoring', label: 'Live Monitoring', icon: Video, roles: ['invigilator', 'hod', 'exam_dept', 'admin'] },
  { to: '/analytics', label: 'Analytics', icon: BarChart3, roles: ['exam_dept', 'ufm_committee', 'admin'], mobile: true },
  { to: '/setup', label: 'Exams & Halls', icon: CalendarCog, roles: ['exam_dept', 'admin'] },
  { to: '/audit', label: 'Audit Trail', icon: ScrollText, roles: ['exam_dept', 'ufm_committee', 'admin'] },
  { to: '/users', label: 'Users', icon: Users, roles: ['admin'] },
  { to: '/profile', label: 'Profile', icon: UserRound, roles: '*', mobile: true }
]

export function navFor(role) {
  return ITEMS.filter((i) => i.roles === '*' || i.roles.includes(role))
}

/** Up to 5 destinations for the mobile bottom bar. */
export function mobileNavFor(role) {
  return navFor(role).filter((i) => i.mobile).slice(0, 5)
}

const STATIC_CRUMBS = {
  '': 'Dashboard',
  cases: 'Cases',
  new: 'Report UFM',
  alerts: 'Live Alerts',
  monitoring: 'Live Monitoring',
  analytics: 'Analytics',
  setup: 'Exams & Halls',
  audit: 'Audit Trail',
  users: 'Users',
  profile: 'Profile'
}

/** ['/cases', 'Cases'] pairs for the topbar breadcrumb. */
export function breadcrumbs(pathname) {
  const parts = pathname.split('/').filter(Boolean)
  if (parts.length === 0) return [{ to: '/', label: 'Dashboard' }]
  const crumbs = [{ to: '/', label: 'Dashboard' }]
  let acc = ''
  parts.forEach((part) => {
    acc += `/${part}`
    const label = STATIC_CRUMBS[part] || (/^\d+$/.test(part) ? `Case #${part}` : part)
    crumbs.push({ to: acc, label })
  })
  return crumbs
}

export default ITEMS
