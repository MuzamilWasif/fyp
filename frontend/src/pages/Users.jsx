import { useEffect, useState } from 'react'
import api from '../lib/api'

const ROLES = ['invigilator', 'hod', 'dec', 'exam_dept', 'ufm_committee', 'student', 'admin']

export default function Users() {
  const [users, setUsers] = useState([])
  const [form, setForm] = useState({ email: '', full_name: '', password: '', role: 'invigilator', department: '', reg_no: '' })
  const [error, setError] = useState('')

  const load = () => api.get('/api/admin/users').then(r => setUsers(r.data)).catch(() => {})
  useEffect(() => { load() }, [])

  const create = async () => {
    setError('')
    try {
      await api.post('/api/auth/register', form)
      setForm({ email: '', full_name: '', password: '', role: 'invigilator', department: '', reg_no: '' })
      load()
    } catch (e) { setError(e.response?.data?.detail || 'Failed') }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Users</h1>
      <div className="card mb-4">
        <div className="grid md:grid-cols-3 gap-2">
          <input className="input" placeholder="Email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
          <input className="input" placeholder="Full name" value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} />
          <input className="input" type="password" placeholder="Password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
          <select className="input" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
            {ROLES.map(r => <option key={r} value={r}>{r.replaceAll('_', ' ')}</option>)}
          </select>
          <input className="input" placeholder="Department" value={form.department} onChange={e => setForm({ ...form, department: e.target.value })} />
          <input className="input" placeholder="Reg no (students)" value={form.reg_no} onChange={e => setForm({ ...form, reg_no: e.target.value })} />
        </div>
        {error && <div className="text-red-400 text-sm mt-2">{error}</div>}
        <button className="btn-brand mt-3" onClick={create} disabled={!form.email || !form.password}>Create user</button>
      </div>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr><th className="th">Name</th><th className="th">Email</th><th className="th">Role</th><th className="th">Dept</th><th className="th">Reg</th><th className="th">Status</th><th className="th"></th></tr></thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} className="border-t border-neutral-800">
                <td className="py-2">{u.full_name}</td>
                <td className="text-neutral-400">{u.email}</td>
                <td>{u.role.replaceAll('_', ' ')}</td>
                <td>{u.department}</td>
                <td>{u.reg_no}</td>
                <td>{u.is_active ? <span className="badge bg-emerald-500/20 text-emerald-400">active</span> : <span className="badge bg-neutral-700 text-neutral-400">disabled</span>}</td>
                <td><button className="text-xs text-neutral-400 hover:text-white" onClick={() => api.post(`/api/admin/users/${u.id}/toggle`).then(load)}>{u.is_active ? 'disable' : 'enable'}</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
