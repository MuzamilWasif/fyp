import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './lib/auth'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Cases from './pages/Cases'
import CaseDetail from './pages/CaseDetail'
import NewCase from './pages/NewCase'
import Alerts from './pages/Alerts'
import Audit from './pages/Audit'
import LiveMonitoring from './pages/LiveMonitoring'
import Setup from './pages/Setup'
import Users from './pages/Users'

function Protected({ children }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  return <Layout>{children}</Layout>
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<Protected><Dashboard /></Protected>} />
      <Route path="/cases" element={<Protected><Cases /></Protected>} />
      <Route path="/cases/new" element={<Protected><NewCase /></Protected>} />
      <Route path="/cases/:id" element={<Protected><CaseDetail /></Protected>} />
      <Route path="/alerts" element={<Protected><Alerts /></Protected>} />
      <Route path="/audit" element={<Protected><Audit /></Protected>} />
      <Route path="/monitoring" element={<Protected><LiveMonitoring /></Protected>} />
      <Route path="/setup" element={<Protected><Setup /></Protected>} />
      <Route path="/users" element={<Protected><Users /></Protected>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
