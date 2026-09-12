import { useState } from 'react'
import { KeyRound, Mail, Building2, IdCard, ShieldCheck, Check } from 'lucide-react'
import api from '../lib/api'
import { useAuth } from '../lib/auth'
import { ROLE_LABELS } from '../lib/format'
import { errorMessage } from '../lib/format'
import { useToast } from '../lib/toast'
import { PageHeader, Card, Input, Button } from '../components/ui'

function Row({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-line last:border-0">
      <span className="w-8 h-8 rounded-lg bg-surface-2 border border-line flex items-center justify-center shrink-0">
        <Icon size={15} className="text-subtle" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <div className="text-micro uppercase text-subtle">{label}</div>
        <div className="text-body text-fg break-words">{value || '—'}</div>
      </div>
    </div>
  )
}

export default function Profile() {
  const { user } = useAuth()
  const toast = useToast()
  const [form, setForm] = useState({ current_password: '', new_password: '', confirm: '' })
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)

  const set = (k) => (e) => {
    setForm((f) => ({ ...f, [k]: e.target.value }))
    setErrors((x) => ({ ...x, [k]: undefined }))
  }

  const validate = () => {
    const e = {}
    if (!form.current_password) e.current_password = 'Enter your current password'
    if (form.new_password.length < 8) e.new_password = 'Must be at least 8 characters'
    if (form.new_password !== form.confirm) e.confirm = 'Passwords do not match'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const submit = async (ev) => {
    ev.preventDefault()
    if (!validate()) return
    setSaving(true)
    try {
      await api.post('/api/auth/change-password', {
        current_password: form.current_password,
        new_password: form.new_password
      })
      setForm({ current_password: '', new_password: '', confirm: '' })
      toast.success('Password changed', 'Use your new password the next time you sign in.')
    } catch (err) {
      const msg = errorMessage(err, 'Could not change password')
      setErrors({ current_password: msg })
      toast.error('Password not changed', msg)
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <PageHeader title="My profile" subtitle="Your account details and security settings" />

      <div className="grid lg:grid-cols-2 gap-4 max-w-4xl">
        <Card title="Account" icon={ShieldCheck}>
          <div className="flex items-center gap-3 pb-4 border-b border-line">
            <span className="w-12 h-12 rounded-2xl bg-brand-soft border border-brand/25 flex items-center
                             justify-center text-subtitle font-bold text-brand" aria-hidden="true">
              {user.full_name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase()}
            </span>
            <div className="min-w-0">
              <div className="text-subtitle font-semibold truncate">{user.full_name}</div>
              <div className="badge-brand mt-1">{ROLE_LABELS[user.role] || user.role}</div>
            </div>
          </div>
          <Row icon={Mail} label="Email" value={user.email} />
          <Row icon={Building2} label="Department" value={user.department} />
          {user.role === 'student' && <Row icon={IdCard} label="Registration number" value={user.reg_no} />}
        </Card>

        <Card title="Change password" icon={KeyRound} subtitle="Minimum 8 characters" id="password">
          <form onSubmit={submit} className="space-y-4" noValidate>
            <Input
              label="Current password" type="password" autoComplete="current-password"
              value={form.current_password} onChange={set('current_password')} error={errors.current_password}
            />
            <Input
              label="New password" type="password" autoComplete="new-password"
              value={form.new_password} onChange={set('new_password')} error={errors.new_password}
            />
            <Input
              label="Confirm new password" type="password" autoComplete="new-password"
              value={form.confirm} onChange={set('confirm')} error={errors.confirm}
            />
            <Button type="submit" variant="brand" icon={Check} loading={saving}>Update password</Button>
          </form>
        </Card>
      </div>
    </>
  )
}
