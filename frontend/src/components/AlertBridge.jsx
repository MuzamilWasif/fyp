import { useEffect } from 'react'
import useAlertsSocket from '../lib/useAlertsSocket'
import { useToast } from '../lib/toast'
import { humanize, pct, severityTone } from '../lib/format'

/**
 * Turns live detection-engine events into toasts.
 * On serverless the socket never opens, so this component simply stays idle —
 * the Alerts and Monitoring pages poll instead.
 */
export default function AlertBridge() {
  const event = useAlertsSocket()
  const toast = useToast()

  useEffect(() => {
    if (!event) return
    if (event.type === 'alert') {
      const tone = severityTone(event.severity)
      toast.push({
        tone: tone.key === 'critical' ? 'error' : 'alert',
        title: `AI alert · ${humanize(event.label)}`,
        body: `${event.camera_id}${event.room ? ` (${event.room})` : ''} · ${tone.label} ${pct(event.severity)}`,
        to: '/alerts',
        duration: 8000
      })
    } else if (event.type === 'notification') {
      toast.push({
        tone: 'info',
        title: event.title,
        body: event.body,
        to: event.case_id ? `/cases/${event.case_id}` : null
      })
    }
  }, [event]) // eslint-disable-line react-hooks/exhaustive-deps

  return null
}
