import { Component } from 'react'
import { AlertTriangle, RotateCcw } from 'lucide-react'

/** Catches render errors so a single bad page never blanks the whole app. */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('[VigilantEye] render error', error, info)
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="card max-w-md w-full text-center">
          <div className="w-12 h-12 rounded-2xl bg-danger-soft border border-danger/25 flex items-center
                          justify-center mx-auto mb-4">
            <AlertTriangle size={20} className="text-danger" aria-hidden="true" />
          </div>
          <h1 className="text-subtitle font-semibold">Something went wrong</h1>
          <p className="text-body text-muted mt-2">
            This screen failed to load. You can retry, or return to the dashboard.
          </p>
          <pre className="text-small text-subtle bg-surface-2 border border-line rounded-xl p-3 mt-4
                          text-left overflow-x-auto max-h-32">
            {String(this.state.error?.message || this.state.error)}
          </pre>
          <div className="flex items-center justify-center gap-2 mt-5">
            <button className="btn-ghost" onClick={() => this.setState({ error: null })}>
              <RotateCcw size={15} aria-hidden="true" /> Try again
            </button>
            <a className="btn-brand" href="/">Dashboard</a>
          </div>
        </div>
      </div>
    )
  }
}
