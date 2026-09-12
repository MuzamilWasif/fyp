import { useState } from 'react'
import { useNavigate, useLocation, Navigate } from 'react-router-dom'
import { Eye, EyeOff, LogIn, ShieldCheck, Cpu, FileCheck2, Lock } from 'lucide-react'
import { useAuth } from '../lib/auth'
import { errorMessage } from '../lib/format'
import { Input, Button } from '../components/ui'

const DEMO = [
  ['Invigilator', 'invigilator@au.edu.pk'],
  ['HOD', 'hod@au.edu.pk'],
  ['DEC', 'dec@au.edu.pk'],
  ['Exam Dept', 'examdept@au.edu.pk'],
  ['Committee', 'committee@au.edu.pk'],
  ['Student', 'student@au.edu.pk']
]

const HIGHLIGHTS = [
  { icon: Cpu, title: 'AI detection engine', body: 'YOLOv8 and MediaPipe flag suspicious behaviour in the hall, frame by frame.' },
  { icon: FileCheck2, title: 'End-to-end case workflow', body: 'Invigilator to HOD, DEC, Examination Department and the UFM Committee — digitally signed.' },
  { icon: ShieldCheck, title: 'Tamper-proof audit trail', body: 'Every action on every case is recorded, attributed and exportable.' }
]

export default function Login() {
  const { user, login } = useAuth()
  const nav = useNavigate()
  const loc = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)

  if (user) return <Navigate to={loc.state?.from || '/'} replace />

  const submit = async (e) => {
    e.preventDefault()
    const next = {}
    if (!email.trim()) next.email = 'Enter your university email'
    if (!password) next.password = 'Enter your password'
    setErrors(next)
    if (Object.keys(next).length) return

    setBusy(true)
    try {
      await login(email.trim(), password)
      nav(loc.state?.from || '/', { replace: true })
    } catch (err) {
      setErrors({ form: errorMessage(err, 'Incorrect email or password') })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-bg">
      {/* brand panel */}
      <div className="hidden lg:flex flex-col justify-between p-10 border-r border-line bg-surface relative overflow-hidden">
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, #1f1f1f 1px, transparent 0)',
            backgroundSize: '22px 22px'
          }}
        />
        <div className="relative">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-2xl bg-brand flex items-center justify-center">
              <Eye size={20} className="text-brand-fg" aria-hidden="true" />
            </span>
            <div>
              <div className="text-title font-bold tracking-tight">VigilantEye</div>
              <div className="text-small text-subtle">Air University, Islamabad</div>
            </div>
          </div>
        </div>

        <div className="relative max-w-md">
          <h1 className="text-[2rem] leading-tight font-bold tracking-tight">
            Maintain integrity.<br />
            <span className="text-brand">Ensure fairness.</span>
          </h1>
          <p className="text-body text-muted mt-3">
            AI-driven unfair means detection and case management for physical examination halls.
          </p>

          <ul className="mt-8 space-y-5">
            {HIGHLIGHTS.map(({ icon: Icon, title, body }) => (
              <li key={title} className="flex gap-3">
                <span className="w-9 h-9 rounded-xl bg-surface-2 border border-line flex items-center
                                 justify-center shrink-0">
                  <Icon size={16} className="text-brand" aria-hidden="true" />
                </span>
                <div>
                  <div className="text-body font-semibold">{title}</div>
                  <div className="text-small text-muted mt-0.5">{body}</div>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="relative text-small text-subtle">
          Final Year Project · Department of Computer Science
        </div>
      </div>

      {/* form panel */}
      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-2.5 mb-8">
            <span className="w-9 h-9 rounded-xl bg-brand flex items-center justify-center">
              <Eye size={18} className="text-brand-fg" aria-hidden="true" />
            </span>
            <div>
              <div className="text-subtitle font-bold leading-tight">VigilantEye</div>
              <div className="text-micro text-subtle">Air University, Islamabad</div>
            </div>
          </div>

          <h2 className="text-title font-bold">Sign in</h2>
          <p className="text-body text-muted mt-1 mb-6">Use your university account to continue.</p>

          <form onSubmit={submit} className="space-y-4" noValidate>
            <Input
              label="University email"
              type="email"
              autoComplete="username"
              placeholder="you@au.edu.pk"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setErrors((x) => ({ ...x, email: undefined, form: undefined })) }}
              error={errors.email}
            />

            <div className="relative">
              <Input
                label="Password"
                type={show ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setErrors((x) => ({ ...x, password: undefined, form: undefined })) }}
                error={errors.password}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShow((s) => !s)}
                aria-label={show ? 'Hide password' : 'Show password'}
                className="absolute right-3 top-[34px] text-subtle hover:text-fg transition-colors duration-fast"
              >
                {show ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            {errors.form && (
              <div role="alert" className="flex items-center gap-2 text-small text-danger bg-danger-soft
                                           border border-danger/25 rounded-xl px-3 py-2">
                <Lock size={14} aria-hidden="true" /> {errors.form}
              </div>
            )}

            <Button type="submit" variant="brand" icon={LogIn} loading={busy} className="w-full">
              Sign in
            </Button>
          </form>

          <div className="mt-8 pt-5 border-t border-line">
            <div className="text-micro uppercase text-subtle mb-2">Demo accounts · password123</div>
            <div className="flex flex-wrap gap-1.5">
              {DEMO.map(([label, addr]) => (
                <button
                  key={addr}
                  type="button"
                  onClick={() => { setEmail(addr); setPassword('password123'); setErrors({}) }}
                  className="badge-neutral hover:border-brand/40 hover:text-brand transition-colors duration-fast"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
