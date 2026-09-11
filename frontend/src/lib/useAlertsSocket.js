import { useEffect, useRef, useState } from 'react'

export default function useAlertsSocket() {
  const [lastEvent, setLastEvent] = useState(null)
  const wsRef = useRef(null)

  useEffect(() => {
    const proto = window.location.protocol === 'https:' ? 'wss' : 'ws'
    const ws = new WebSocket(`${proto}://${window.location.host}/api/alerts/ws`)
    wsRef.current = ws
    ws.onmessage = (e) => {
      try { setLastEvent(JSON.parse(e.data)) } catch {}
    }
    return () => ws.close()
  }, [])

  return lastEvent
}
