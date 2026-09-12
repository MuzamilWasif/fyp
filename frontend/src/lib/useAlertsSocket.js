import { useEffect, useState } from 'react'
import { API_BASE } from './api'

/**
 * Live alert stream for ON-PREMISES deployments.
 *
 * Vercel's serverless runtime has no WebSocket support, so every consumer of
 * this hook must also work without it — the bell and alert pages poll on an
 * interval and simply refresh sooner when an event arrives. Any connection
 * failure here is swallowed on purpose: in production the socket never opens
 * and that must stay completely silent for the user.
 */
export default function useAlertsSocket() {
  const [lastEvent, setLastEvent] = useState(null)

  useEffect(() => {
    let ws
    try {
      let base
      if (API_BASE) {
        base = API_BASE.replace(/^http/, 'ws')
      } else {
        const proto = window.location.protocol === 'https:' ? 'wss' : 'ws'
        base = `${proto}://${window.location.host}`
      }
      ws = new WebSocket(`${base}/api/alerts/ws`)
      ws.onmessage = (e) => {
        try { setLastEvent(JSON.parse(e.data)) } catch { /* malformed frame */ }
      }
      ws.onerror = () => { /* serverless: expected, stay silent */ }
      ws.onclose = () => { /* no reconnect storm in production */ }
    } catch {
      /* WebSocket unavailable — polling fallbacks cover this */
    }

    return () => {
      try { ws?.close() } catch { /* already closed */ }
    }
  }, [])

  return lastEvent
}
