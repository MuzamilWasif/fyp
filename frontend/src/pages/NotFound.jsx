import { Link, useNavigate } from 'react-router-dom'
import { Compass, ArrowLeft, Home } from 'lucide-react'
import Button from '../components/ui/Button'

export default function NotFound() {
  const nav = useNavigate()
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="card max-w-md w-full text-center">
        <div className="w-12 h-12 rounded-2xl bg-surface-2 border border-line flex items-center justify-center mx-auto mb-4">
          <Compass size={20} className="text-brand" aria-hidden="true" />
        </div>
        <div className="text-display font-bold">404</div>
        <h1 className="text-subtitle font-semibold mt-1">Page not found</h1>
        <p className="text-body text-muted mt-2">
          The page you are looking for does not exist, or your role does not have access to it.
        </p>
        <div className="flex items-center justify-center gap-2 mt-6">
          <Button variant="ghost" icon={ArrowLeft} onClick={() => nav(-1)}>Go back</Button>
          <Link to="/"><Button variant="brand" icon={Home}>Dashboard</Button></Link>
        </div>
      </div>
    </div>
  )
}
