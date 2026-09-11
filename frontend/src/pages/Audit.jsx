import { useEffect, useState } from 'react'
import api from '../lib/api'

export default function Audit() {
  const [rows, setRows] = useState([])
  useEffect(() => { api.get('/api/audit').then(r => setRows(r.data)).catch(() => {}) }, [])

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Audit Trail</h1>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-neutral-400 text-xs">
            <tr><th className="py-2">Time</th><th>Role</th><th>Action</th><th>Entity</th><th>Detail</th><th>IP</th></tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id} className="border-t border-neutral-800">
                <td className="py-2 whitespace-nowrap">{new Date(r.created_at).toLocaleString()}</td>
                <td>{r.user_role}</td>
                <td>{r.action}</td>
                <td>{r.entity}{r.entity_id && ` #${r.entity_id}`}</td>
                <td className="text-neutral-400">{r.detail}</td>
                <td className="text-neutral-500">{r.ip}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <div className="text-neutral-500 text-sm py-2">No audit entries.</div>}
      </div>
    </div>
  )
}
