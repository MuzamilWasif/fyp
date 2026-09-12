import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './lib/auth'
import AppShell from './components/AppShell'
import ErrorBoundary from './components/ErrorBoundary'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Cases from './pages/Cases'
import CaseDetail from './pages/CaseDetail'
import NewCase from './pages/NewCase'
import Alerts from './pages/Alerts'
import Audit from './pages/Audit'
import Analytics from './pages/Analytics'
import LiveMonitoring from './pages/LiveMonitoring'
import Setup from './pages/Setup'
import Users from './pages/Users'
import Profile from './pages/Profile'
import NotFound from './pages/NotFound'

/** Authenticated routes render inside the app shell; the boundary is keyed by
 *  path so recovering from an error on one page does not stick to the next. */
function Protected({ roles, children }) {
  const { user } = useAuth()
  const loc = useLocation()
  if (!user) return <Navigate to="/login" replace state={{ from: loc.pathname }} />
  if (roles && !roles.includes(user.role)) {
    return <AppShell><NotFound /></AppShell>
  }
  return (
    <AppShell>
      <ErrorBoundary key={loc.pathname}>{children}</ErrorBoundary>
    </AppShell>
  )
}

const STAFF = ['invigilator', 'hod', 'exam_dept', 'admin']

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route path="/" element={<Protected><Dashboard /></Protected>} />
      <Route path="/cases" element={<Protected><Cases /></Protected>} />
      <Route path="/cases/new" element={<Protected roles={['invigilator', 'admin']}><NewCase /></Protected>} />
      <Route path="/cases/:id" element={<Protected><CaseDetail /></Protected>} />
      <Route path="/alerts" element={<Protected roles={STAFF}><Alerts /></Protected>} />
      <Route path="/monitoring" element={<Protected roles={STAFF}><LiveMonitoring /></Protected>} />
      <Route path="/analytics" element={<Protected roles={['exam_dept', 'ufm_committee', 'admin']}><Analytics /></Protected>} />
      <Route path="/setup" element={<Protected roles={['exam_dept', 'admin']}><Setup /></Protected>} />
      <Route path="/audit" element={<Protected roles={['exam_dept', 'ufm_committee', 'admin']}><Audit /></Protected>} />
      <Route path="/users" element={<Protected roles={['admin']}><Users /></Protected>} />
      <Route path="/profile" element={<Protected><Profile /></Protected>} />

      <Route path="*" element={<Protected><NotFound /></Protected>} />
    </Routes>
  )
}
