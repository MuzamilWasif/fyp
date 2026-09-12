import { formatDateTime, formatDate, titleize, statusLabel, roleLabel, actionLabel } from '../lib/format'

/**
 * The official printed document. Hidden on screen, and the only thing that
 * reaches the page when the user prints: an A4 university report with case
 * number, full proceedings, the decision and a signatures block.
 */
const SIGNATORIES = [
  ['Invigilator on duty', 'invigilator'],
  ['Head of Department', 'hod'],
  ['Departmental Examination Committee', 'dec'],
  ['Controller of Examinations', 'exam_dept'],
  ['Chairman, UFM Committee', 'ufm_committee']
]

function Row({ label, value }) {
  return (
    <tr>
      <th scope="row" className="report-key">{label}</th>
      <td className="report-val">{value || '—'}</td>
    </tr>
  )
}

export default function CasePrintReport({ case: c }) {
  const signedBy = new Set((c.actions || []).map((a) => a.actor_role))

  return (
    <div className="print-only report">
      <header className="report-head">
        <h1>Air University, Islamabad</h1>
        <h2>Examination Department</h2>
        <h3>Unfair Means (UFM) Case Report</h3>
        <div className="report-meta">
          <span><strong>Case No:</strong> {c.case_no}</span>
          <span><strong>Status:</strong> {statusLabel(c.status)}</span>
          <span><strong>Printed:</strong> {formatDateTime(new Date())}</span>
        </div>
      </header>

      <section>
        <h4>1. Particulars of the student</h4>
        <table className="report-table">
          <tbody>
            <Row label="Name" value={c.student_name} />
            <Row label="Registration No." value={c.student_reg_no} />
            <Row label="Department" value={c.student_department} />
          </tbody>
        </table>
      </section>

      <section>
        <h4>2. Particulars of the examination</h4>
        <table className="report-table">
          <tbody>
            <Row label="Examination" value={c.exam_name} />
            <Row label="Date / Time" value={[c.exam_date, c.exam_time].filter(Boolean).join(' · ')} />
            <Row label="Hall / Seat" value={[c.room, c.seat].filter(Boolean).join(' / ')} />
            <Row label="Camera" value={c.camera_id} />
          </tbody>
        </table>
      </section>

      <section>
        <h4>3. Nature of the violation</h4>
        <table className="report-table">
          <tbody>
            <Row label="Violation" value={titleize(c.violation_type)} />
            <Row label="Detected by" value={c.source === 'ai' ? 'AI detection engine, confirmed by invigilator' : 'Invigilator on duty'} />
            <Row label="Description" value={c.description} />
            <Row label="Remarks" value={c.remarks} />
            <Row label="Result status" value={c.result_hold ? 'ON HOLD' : 'Released'} />
            <Row label="Transcript" value={c.transcript_blocked ? 'BLOCKED' : 'Not blocked'} />
          </tbody>
        </table>
      </section>

      <section>
        <h4>4. Evidence on record</h4>
        {c.evidence?.length ? (
          <table className="report-table">
            <thead>
              <tr><th>#</th><th>Type</th><th>Source</th><th>Camera</th><th>Captured</th></tr>
            </thead>
            <tbody>
              {c.evidence.map((e, i) => (
                <tr key={e.id}>
                  <td>{i + 1}</td>
                  <td>{e.file_type}</td>
                  <td>{e.source === 'ai' ? `AI (confidence ${(e.confidence ?? 0).toFixed(2)})` : 'Manual upload'}</td>
                  <td>{e.camera_id || '—'}</td>
                  <td>{formatDateTime(e.captured_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <p className="report-note">No evidence items attached to this case.</p>}
      </section>

      <section>
        <h4>5. Proceedings</h4>
        <table className="report-table">
          <thead>
            <tr><th>#</th><th>Stage</th><th>Action</th><th>Remarks</th><th>Date</th></tr>
          </thead>
          <tbody>
            {(c.actions || []).map((a, i) => (
              <tr key={a.id}>
                <td>{i + 1}</td>
                <td>{roleLabel(a.actor_role)}</td>
                <td>{actionLabel(a.action)}</td>
                <td>{a.comment || '—'}</td>
                <td>{formatDate(a.created_at)}</td>
              </tr>
            ))}
            {!(c.actions || []).length && (
              <tr><td colSpan={5}>No proceedings recorded.</td></tr>
            )}
          </tbody>
        </table>
      </section>

      <section>
        <h4>6. Decision of the UFM Committee</h4>
        {c.final_decision ? (
          <table className="report-table">
            <tbody>
              <Row label="Decision" value={c.final_decision} />
              <Row label="Penalty awarded" value={c.penalty} />
            </tbody>
          </table>
        ) : (
          <p className="report-note">
            No final decision has been recorded. This case is currently at the
            “{statusLabel(c.status)}” stage.
          </p>
        )}
      </section>

      <section className="report-signatures">
        <h4>7. Certification</h4>
        <p className="report-note">
          The particulars recorded above are certified to be correct and the case has been
          processed in accordance with the university’s unfair means policy.
        </p>
        <div className="report-sign-grid">
          {SIGNATORIES.map(([title, role]) => (
            <div key={role} className="report-sign">
              <div className="report-sign-line" />
              <div className="report-sign-title">{title}</div>
              <div className="report-sign-note">
                {signedBy.has(role) ? 'Digitally signed in VigilantEye' : 'Signature / Date'}
              </div>
            </div>
          ))}
        </div>
      </section>

      <footer className="report-foot">
        VigilantEye · AI-Driven UFM Detection and Case Management · {c.case_no} ·
        This document is generated from a tamper-proof audit trail.
      </footer>
    </div>
  )
}
