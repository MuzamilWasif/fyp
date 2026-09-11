import { useEffect, useRef, useState } from 'react'
import { API_BASE } from './api'

export default function useAlertsSocket() {
  const [lastEvent, setLastEvent] = useState(null)
  const wsRef = useRef(null)

  useEffect(() => {
    let base
    if (API_BASE) {
      base = API_BASE.replace(/^http/, 'ws')
    } else {
      const proto = window.location.protocol === 'https:' ? 'wss' : 'ws'
      base = `${proto}://${window.location.host}`
    }
    const ws = new WebSocket(`${base}/api/alerts/ws`)
    wsRef.current = ws
    ws.onmessage = (e) => {
      try { setLastEvent(JSON.parse(e.data)) } catch {}
    }
    return () => ws.close()
  }, [])

  return lastEvent
}
