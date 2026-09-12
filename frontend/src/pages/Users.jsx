import { useCallback, useEffect, useMemo, useState } from 'react'
import { UserPlus, Search, Users as UsersIcon, Power, ShieldCheck, ChevronDown } from 'lucide-react'
import api from '../lib/api'
import { useAuth } from '../lib/auth'
import { useToast } from '../lib/toast'
import { ROLE_LABELS, ROLE_SHORT, errorMessage } from '../lib/format'
import {
  PageHeader, Card, Button, Input, Select, DataTable, EmptyState, ConfirmDialog
} from '../components/ui'

const ROLES = ['invigilator', 'hod', 'dec', 'exam_dept', 'ufm_committee', 'student', 'admin']
const BLANK = { email: '', full_name: '', password: '', role: 'invigilator', department: '', reg_no: '' }

export default function Users() {
  const { user: me } = useAuth()
  const toast = useToast()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(BLANK)
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [q, setQ] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [confirm, setConfirm] = useState(null)

  const load = useCallback(() => api.get('/api/admin/users')
    .then((r) => setUsers(r.data))
    .catch((e) => toast.error('Could not load users', errorMessage(e)))
    .finally(() => setLoading(false)), []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load() }, [load])

  const set = (k) => (e) => {
    setForm((f) => ({ ...f, [k]: e.target.value }))
    setErrors((x) => ({ ...x, [k]: undefined, form: undefined }))
  }

  const validate = () => {
    const e = {}
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) e.email = 'Enter a valid email address'
    if (!form.full_name.trim()) e.full_name = 'Full name is required'
    if (form.password.length < 8) e.password = 'Password must be at least 8 characters'
    if (form.role === 'student' && !form.reg_no.trim()) {
      e.reg_no = 'Students need a registration number so their cases can be linked'
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const create = async (ev) => {
    ev.preventDefault()
    if (!validate()) return
    setSaving(true)
    try {
      await api.post('/api/auth/register', { ...form, email: form.email.trim() })
      setForm(BLANK)
      await load()
      toast.success('User created', `${form.full_name} can now sign in.`)
    } catch (e) {
      const msg = errorMessage(e, 'Could not create the user')
      setErrors({ form: msg })
      toast.error('Not created', msg)
    } finally { setSaving(false) }
  }

  const toggle = async () => {
    const u = confirm
    try {
      const { data } = await api.post(`/api/admin/users/${u.id}/toggle`)
      setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, is_active: data.is_active } : x)))
      toast.success(data.is_active ? 'Account enabled' : 'Account disabled', u.full_name)
    } catch (e) {
      toast.error('Could not update the account', errorMessage(e))
    } finally { setConfirm(null) }
  }

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return users.filter((u) => {
      if (roleFilter && u.role !== roleFilter) return false
      if (!needle) return true
      return `${u.full_name} ${u.email} ${u.department} ${u.reg_no}`.toLowerCase().includes(needle)
    })
  }, [users, q, roleFilter])

  const columns = [
    {
      key: 'full_name', header: 'Name', sortable: true,
      render: (u) => (
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="truncate">{u.full_name}</span>
            {u.id === me.id && <span className="badge-brand">You</span>}
          </div>
          <div className="text-small text-subtle truncate">{u.email}</div>
        </div>
      )
    },
    {
      key: 'role', header: 'Role', sortable: true, className: 'whitespace-nowrap',
      render: (u) => <span className="badge-neutral">{ROLE_SHORT[u.role] || u.role}</span>
    },
    { key: 'department', header: 'Department', sortable: true, render: (u) => u.department || '—' },
    {
      key: 'reg_no', header: 'Registration', sortable: true,
      render: (u) => <span className="tnum">{u.reg_no || '—'}</span>
    },
    {
      key: 'is_active', header: 'Status', sortable: true, className: 'whitespace-nowrap',
      render: (u) => (
        <span className={u.is_active ? 'badge-ok' : 'badge-neutral'}>
          {u.is_active ? 'Active' : 'Disabled'}
        </span>
      )
    },
    {
      key: 'actions', header: '', className: 'text-right whitespace-nowrap',
      render: (u) => (
        <Button
          size="sm"
          variant={u.is_active ? 'subtle' : 'ghost'}
          icon={Power}
          disabled={u.id === me.id}
          title={u.id === me.id ? 'You cannot disable your own account' : undefined}
          onClick={(e) => { e.stopPropagation(); setConfirm(u) }}
        >
          {u.is_active ? 'Disable' : 'Enable'}
        </Button>
      )
    }
  ]

  const mobileCard = (u) => (
    <div className="card-tight">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="font-semibold truncate">{u.full_name}</div>
          <div className="text-small text-subtle truncate">{u.email}</div>
        </div>
        <span className={u.is_active ? 'badge-ok' : 'badge-neutral'}>
          {u.is_active ? 'Active' : 'Disabled'}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-1.5 mt-2">
        <span className="badge-neutral">{ROLE_SHORT[u.role] || u.role}</span>
        {u.department && <span className="badge-neutral">{u.department}</span>}
        {u.reg_no && <span className="badge-neutral tnum">{u.reg_no}</span>}
      </div>
      <Button size="sm" variant="ghost" icon={Power} className="mt-3 w-full"
              disabled={u.id === me.id} onClick={() => setConfirm(u)}>
        {u.is_active ? 'Disable account' : 'Enable account'}
      </Button>
    </div>
  )

  return (
    <>
      <PageHeader
        title="Users"
        subtitle={`${users.length} account${users.length === 1 ? '' : 's'} across all roles`}
      />

      <Card title="Create an account" icon={UserPlus} className="mb-4"
            subtitle="The new user signs in with the password you set here">
        <form onSubmit={create} noValidate>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Input label="Email" type="email" required autoComplete="off" placeholder="name@au.edu.pk"
                   value={form.email} onChange={set('email')} error={errors.email} />
            <Input label="Full name" required value={form.full_name}
                   onChange={set('full_name')} error={errors.full_name} maxLength={120} />
            <Input label="Password" type="password" required autoComplete="new-password"
                   value={form.password} onChange={set('password')} error={errors.password}
                   hint={!errors.password ? 'At least 8 characters' : undefined} />
            <Select label="Role" value={form.role} onChange={set('role')}>
              {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r] || r}</option>)}
            </Select>
            <Input label="Department" placeholder="CS" value={form.department}
                   onChange={set('department')} maxLength={60} />
            <Input label="Registration number" placeholder="232430" value={form.reg_no}
                   onChange={set('reg_no')} error={errors.reg_no}
                   hint={form.role === 'student' && !errors.reg_no ? 'Required for students' : undefined}
                   maxLength={40} />
          </div>
          {errors.form && <p className="error-text" role="alert">{errors.form}</p>}
          <Button type="submit" variant="brand" icon={UserPlus} className="mt-4" loading={saving}>
            Create user
          </Button>
        </form>
      </Card>

      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <div className="relative flex-1">
          <Search size={15} aria-hidden="true"
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-subtle pointer-events-none" />
          <input type="search" className="input pl-9" aria-label="Search users"
                 placeholder="Search name, email, department or registration…"
                 value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="relative sm:w-56">
          <select className="input appearance-none pr-9" aria-label="Filter by role"
                  value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
            <option value="">All roles</option>
            {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r] || r}</option>)}
          </select>
          <ChevronDown size={15} aria-hidden="true"
                       className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-subtle" />
        </div>
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        loading={loading}
        mobileCard={mobileCard}
        initialSort={{ key: 'role', dir: 'asc' }}
        empty={
          <EmptyState
            icon={q || roleFilter ? Search : UsersIcon}
            title={q || roleFilter ? 'No users match' : 'No users yet'}
            description={q || roleFilter
              ? 'Try a different search term or role filter.'
              : 'Create the first account using the form above.'}
          />
        }
      />

      <div className="flex items-center gap-2.5 text-small text-subtle mt-4">
        <ShieldCheck size={15} className="text-brand shrink-0" aria-hidden="true" />
        Disabling an account blocks sign-in immediately but preserves every case and audit
        entry that account created.
      </div>

      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={toggle}
        title={confirm ? (confirm.is_active ? `Disable ${confirm.full_name}?` : `Enable ${confirm.full_name}?`) : ''}
        description={confirm?.is_active
          ? 'They will be signed out and unable to log in until re-enabled. Their case history is kept.'
          : 'They will be able to sign in again with their existing password.'}
        confirmLabel={confirm?.is_active ? 'Disable account' : 'Enable account'}
        tone={confirm?.is_active ? 'danger' : 'brand'}
      />
    </>
  )
}
