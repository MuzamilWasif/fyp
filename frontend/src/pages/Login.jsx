import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'

export default function Login() {
  const { login } = useAuth()
  const nav = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const submit = async () => {
    setError('')
    try {
      await login(email, password)
      nav('/')
    } catch {
      setError('Incorrect email or password')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="card w-full max-w-sm">
        <div className="text-brand font-bold text-2xl mb-1">VigilantEye</div>
        <div className="text-sm text-neutral-400 mb-6">AI-Driven UFM Detection and Automated UFM Portal</div>
        <label className="text-xs text-neutral-400">Email</label>
        <input className="input mb-3" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@au.edu.pk" />
        <label className="text-xs text-neutral-400">Password</label>
        <input className="input mb-4" type="password" value={password} onChange={e => setPassword(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && submit()} />
        {error && <div className="text-red-400 text-sm mb-3">{error}</div>}
        <button className="btn-brand w-full" onClick={submit}>Sign in</button>
        <div className="text-xs text-neutral-500 mt-4">Seed accounts: invigilator@au.edu.pk / hod@ / dec@ / examdept@ / committee@ / student@au.edu.pk — password123</div>
      </div>
    </div>
  )
}
