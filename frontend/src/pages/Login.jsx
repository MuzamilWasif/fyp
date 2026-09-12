import { useEffect, useState } from 'react'
import { useNavigate, useLocation, Navigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { errorMessage } from '../lib/format'
import HallScene from '../components/HallScene'

const DEMO = [
  ['Invigilator', 'invigilator@au.edu.pk'],
  ['HOD', 'hod@au.edu.pk'],
  ['DEC', 'dec@au.edu.pk'],
  ['Exam Dept', 'examdept@au.edu.pk'],
  ['Committee', 'committee@au.edu.pk'],
  ['Student', 'student@au.edu.pk']
]

/** The VigilantEye mark: a chevron V with the iris sitting in its notch. */
function Logo({ size = 38 }) {
  return (
    <svg width={size * (30 / 38)} height={size} viewBox="0 0 30 38" fill="none" className="block" aria-hidden="true">
      <path d="M2.5 8 L15 33.5 L27.5 8" stroke="#F5F7FA" strokeWidth="3" strokeLinejoin="miter" />
      <circle cx="15" cy="19.5" r="5.6" fill="#06090F" />
      <circle cx="15" cy="19.5" r="5.6" stroke="#2DE3A7" strokeWidth="1.4" strokeDasharray="5.2 2.6" />
      <circle cx="15" cy="19.5" r="1.3" fill="#2DE3A7" />
    </svg>
  )
}

function MailIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"
         className="absolute left-[14px] pointer-events-none">
      <rect x="1.5" y="3.5" width="13" height="9" rx="2" stroke="#8A94A6" strokeWidth="1.3" />
      <path d="M2.4 4.6 L8 8.8 L13.6 4.6" stroke="#8A94A6" strokeWidth="1.3" strokeLinejoin="round" />
    </svg>
  )
}

function LockIcon({ stroke = '#8A94A6', size = 16, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true" className={className}>
      <rect x="2.5" y="7" width="11" height="7.2" rx="2" stroke={stroke} strokeWidth="1.3" />
      <path d="M5.2 7 V5.2 a2.8 2.8 0 0 1 5.6 0 V7" stroke={stroke} strokeWidth="1.3" />
    </svg>
  )
}

function AlertIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="shrink-0 mt-px">
      <circle cx="8" cy="8" r="6.5" stroke="#FF4D4D" strokeWidth="1.3" />
      <path d="M8 4.8 V9" stroke="#FF4D4D" strokeWidth="1.4" />
      <circle cx="8" cy="11.2" r=".9" fill="#FF4D4D" />
    </svg>
  )
}

/** Camera timestamp, in the hall's own timezone. */
function useHallClock() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  const opts = { timeZone: 'Asia/Karachi' }
  const date = now.toLocaleDateString('en-GB', { ...opts, day: '2-digit', month: 'short', year: 'numeric' })
  const time = now.toLocaleTimeString('en-GB', { ...opts, hour12: false })
  return `${date.toUpperCase()} · ${time} PKT`
}

export default function Login() {
  const { user, login } = useAuth()
  const nav = useNavigate()
  const loc = useLocation()
  const clock = useHallClock()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const [attempts, setAttempts] = useState(0)

  if (user) return <Navigate to={loc.state?.from || '/'} replace />

  const submit = async (e) => {
    e.preventDefault()
    const next = {}
    if (!email.trim()) next.email = 'Enter your institutional email'
    if (!password) next.password = 'Enter your password'
    setErrors(next)
    if (Object.keys(next).length) return

    setBusy(true)
    try {
      await login(email.trim(), password)
      nav(loc.state?.from || '/', { replace: true })
    } catch (err) {
      setAttempts((a) => a + 1)
      setErrors({ password: errorMessage(err, 'Incorrect email or password'), failed: true })
    } finally {
      setBusy(false)
    }
  }

  const fillDemo = (address) => {
    setEmail(address)
    setPassword('password123')
    setErrors({})
  }

  return (
    <div className="ve-login min-h-screen lg:h-screen flex flex-col lg:flex-row lg:overflow-hidden">
      {/* ------------------------------------------------ camera view */}
      <div className="relative hidden lg:block lg:flex-[835] lg:h-full overflow-hidden border-r border-[--ve-line]">
        <div className="absolute inset-0 ve-grid-lg" aria-hidden="true" />
        <div className="absolute inset-0 ve-grid-sm" aria-hidden="true" />
        <div className="absolute inset-0 ve-noise opacity-[.025]" aria-hidden="true" />

        <HallScene className="absolute inset-0 w-full h-full" />

        {/* camera chrome */}
        <div className="absolute left-10 top-7 flex items-center gap-3.5 whitespace-nowrap">
          <div className="flex items-center gap-2 px-2.5 py-[5px] rounded-xl border border-[--ve-line] bg-[#0D131C]/80">
            <span className="relative flex w-1.5 h-1.5">
              <span className="absolute inset-0 rounded-full bg-[--ve-accent] ve-pulse" />
              <span className="absolute -inset-[3px] rounded-full border border-[--ve-accent] ve-ring" />
            </span>
            <span className="ve-mono text-[--ve-accent] tracking-[.12em]">live</span>
          </div>
          <div className="ve-mono text-[--ve-text-3] tracking-[.12em]">cam 04 · hall b · ceiling</div>
        </div>

        <div className="absolute right-10 top-7 ve-mono normal-case tracking-[.1em] text-[--ve-text-4] tabular-nums">
          {clock}
        </div>

        {/* identity */}
        <div className="absolute left-10 bottom-14 flex flex-col gap-[18px] max-w-[560px]">
          <div className="flex items-end gap-[3px]">
            <Logo />
            <div className="ve-display font-semibold text-[34px] tracking-[-.03em] text-[--ve-text] leading-none pb-px">
              igilantEye
            </div>
          </div>
          <p className="ve-display font-medium text-[19px] tracking-[-.01em] text-[--ve-text-2] leading-[1.4]">
            AI-Driven UFM Detection &amp; Automated UFM Portal
          </p>
          <div className="w-14 h-px bg-[--ve-line]" aria-hidden="true" />
          <div className="ve-mono text-[--ve-text-4]">
            air university islamabad · dept of computer science
          </div>
        </div>
      </div>

      {/* ------------------------------------------------ sign-in card */}
      <div className="relative flex-1 lg:flex-[604] lg:h-full bg-[--ve-panel] flex lg:overflow-y-auto p-5 sm:p-8">
        <div className="absolute inset-0 ve-noise opacity-[.02]" aria-hidden="true" />

        <div className="relative w-full max-w-[436px] m-auto">
          {/* compact identity for phones, where the camera view is hidden */}
          <div className="lg:hidden flex items-center gap-[3px] mb-7">
            <Logo size={30} />
            <span className="ve-display font-semibold text-[26px] tracking-[-.03em] leading-none pb-px">
              igilantEye
            </span>
          </div>

          <div className="bg-[--ve-card] border border-[--ve-line] rounded-[18px] p-6 sm:p-8
                          shadow-[0_24px_64px_-24px_rgba(0,0,0,.8)]">
            <div className="flex flex-col gap-2 mb-7">
              <div className="ve-mono text-[--ve-text-3]">secure access</div>
              <h1 className="ve-display m-0 font-semibold text-[26px] tracking-[-.025em] text-[--ve-text] leading-[1.2] text-balance">
                Sign in to the control room
              </h1>
            </div>

            <form onSubmit={submit} noValidate className="flex flex-col gap-5">
              <label className="flex flex-col gap-2">
                <span className="text-[13px] font-medium text-[--ve-text-2]">Institutional email</span>
                <span className="relative flex items-center">
                  <MailIcon />
                  <input
                    type="email"
                    autoComplete="username"
                    placeholder="invigilator@au.edu.pk"
                    className="ve-input"
                    aria-invalid={errors.email ? 'true' : undefined}
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setErrors({}) }}
                  />
                </span>
                {errors.email && (
                  <span className="flex items-start gap-2 text-[12.5px] leading-[1.5] text-[--ve-danger]" role="alert">
                    <AlertIcon />{errors.email}
                  </span>
                )}
              </label>

              <label className="flex flex-col gap-2">
                <span className="flex items-baseline justify-between">
                  <span className="text-[13px] font-medium text-[--ve-text-2]">Password</span>
                  <button
                    type="button"
                    className="ve-link text-[12px]"
                    onClick={() => setErrors({ notice: true })}
                  >
                    Forgot access?
                  </button>
                </span>
                <span className="relative flex items-center">
                  <LockIcon stroke={errors.password ? '#FF4D4D' : '#8A94A6'}
                            className="absolute left-[14px] pointer-events-none" />
                  <input
                    type="password"
                    autoComplete="current-password"
                    placeholder="••••••••••••"
                    className="ve-input ve-password"
                    aria-invalid={errors.password ? 'true' : undefined}
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setErrors({}) }}
                  />
                </span>
                {errors.password && (
                  <span className="flex items-start gap-2 text-[12.5px] leading-[1.5] text-[--ve-danger]" role="alert">
                    <AlertIcon />
                    <span>
                      {errors.password}
                      {attempts > 1 && ' Check the address and try again.'}
                    </span>
                  </span>
                )}
              </label>

              <button type="submit" className="ve-submit mt-1" disabled={busy}>
                {busy ? 'Verifying…' : 'Access Portal'}
              </button>
            </form>

            {/* a failed attempt is written to the audit trail, so say so */}
            {errors.failed && (
              <div className="flex gap-2.5 p-3.5 mt-5 rounded-xl border border-[--ve-line]
                              border-l-2 border-l-[--ve-danger] bg-[#FF4D4D]/[.12]">
                <div className="flex flex-col gap-1">
                  <div className="ve-mono text-[--ve-danger]">failed attempt logged</div>
                  <div className="text-[12.5px] leading-[1.5] text-[--ve-text-3]">
                    This sign-in attempt has been recorded on the audit trail with a timestamp.
                  </div>
                </div>
              </div>
            )}

            {errors.notice && (
              <div className="flex gap-2.5 p-3.5 mt-5 rounded-xl border border-[--ve-line]
                              border-l-2 border-l-[--ve-accent] bg-[#2DE3A7]/[.10]">
                <div className="flex flex-col gap-1">
                  <div className="ve-mono text-[--ve-accent]">account recovery</div>
                  <div className="text-[12.5px] leading-[1.5] text-[--ve-text-3]">
                    Credentials are reset by the Examinations Office — there is no self-service
                    reset. Contact your department administrator.
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center gap-3.5 my-[26px]">
              <div className="flex-1 h-px bg-[--ve-line]" />
              <div className="ve-mono text-[--ve-text-4]">sso pending</div>
              <div className="flex-1 h-px bg-[--ve-line]" />
            </div>

            <p className="m-0 text-[13px] leading-[1.6] text-[--ve-text-3]">
              Accounts are provisioned by the Examinations Office. Contact the department
              administrator if your credentials have expired.
            </p>

            <div className="flex items-start sm:items-center gap-2 mt-6 pt-5 border-t border-[--ve-line]">
              <LockIcon stroke="#5A6472" size={13} className="shrink-0 mt-0.5 sm:mt-0" />
              <span className="font-['JetBrains_Mono',monospace] text-[10.5px] leading-[1.5]
                               tracking-[.02em] text-[--ve-text-4]">
                Authorized personnel only · All activity is audit-logged
              </span>
            </div>
          </div>

          {/* demo accounts — kept for the project demonstration */}
          <div className="mt-5">
            <div className="ve-mono text-[--ve-text-4] mb-2.5">demo accounts · password123</div>
            <div className="flex flex-wrap gap-1.5">
              {DEMO.map(([label, address]) => (
                <button
                  key={address}
                  type="button"
                  onClick={() => fillDemo(address)}
                  className="px-2.5 py-1 rounded-lg border border-[--ve-line] bg-[--ve-card]
                             font-['JetBrains_Mono',monospace] text-[10.5px] tracking-[.06em] uppercase
                             text-[--ve-text-3] transition-colors duration-150
                             hover:border-[--ve-accent] hover:text-[--ve-accent]"
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
