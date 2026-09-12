import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import {
  Printer, ArrowLeft, UserRound, ShieldAlert, Images, Upload, Gavel, MessageSquare,
  History, CheckCircle2, CornerUpLeft, Send, PauseCircle, PlayCircle, BookLock,
  BookOpen, Archive, StickyNote, FileText, Play, PenLine, AlertTriangle
} from 'lucide-react'
import api, { API_BASE } from '../lib/api'
import { useAuth } from '../lib/auth'
import { useToast } from '../lib/toast'
import {
  humanize, formatDate, formatDateTime, roleLabel, errorMessage, PENALTY_OPTIONS,
  LIFECYCLE_STAGES, currentStage, ROLE_LABELS, actionLabel
} from '../lib/format'
import {
  Card, Button, StatusBadge, Timeline, Lightbox, EmptyState, Skeleton,
  Textarea, Select, Input, ConfirmDialog
} from '../components/ui'
import CaseProgress from '../components/CaseProgress'
import CasePrintReport from '../components/CasePrintReport'

/* Role → the actions it may take, in the order it would normally take them. */
const ROLE_ACTIONS = {
  hod: [
    ['approve', 'Approve & forward to DEC', CheckCircle2, 'brand'],
    ['return', 'Return to invigilator', CornerUpLeft, 'danger'],
    ['note', 'Add note', StickyNote, 'ghost']
  ],
  dec: [
    ['forward', 'Forward to Examination Dept', Send, 'brand'],
    ['return', 'Return', CornerUpLeft, 'danger'],
    ['note', 'Add note', StickyNote, 'ghost']
  ],
  exam_dept: [
    ['forward', 'Forward to UFM Committee', Send, 'brand'],
    ['hold', 'Hold result', PauseCircle, 'ghost'],
    ['release_result', 'Release result', PlayCircle, 'ghost'],
    ['block_transcript', 'Block transcript', BookLock, 'ghost'],
    ['unblock_transcript', 'Unblock transcript', BookOpen, 'ghost'],
    ['close', 'Close case', Archive, 'ghost'],
    ['note', 'Add note', StickyNote, 'ghost']
  ],
  ufm_committee: [
    ['decide', 'Record final decision', Gavel, 'brand'],
    ['note', 'Add note', StickyNote, 'ghost']
  ],
  invigilator: [['note', 'Add note', StickyNote, 'ghost']],
  admin: [
    ['approve', 'Approve', CheckCircle2, 'ghost'],
    ['return', 'Return', CornerUpLeft, 'ghost'],
    ['forward', 'Forward', Send, 'ghost'],
    ['decide', 'Decide', Gavel, 'ghost'],
    ['hold', 'Hold result', PauseCircle, 'ghost'],
    ['release_result', 'Release result', PlayCircle, 'ghost'],
    ['close', 'Close case', Archive, 'ghost'],
    ['note', 'Add note', StickyNote, 'ghost']
  ]
}

const DESTRUCTIVE = new Set(['return', 'close', 'block_transcript', 'release_result'])
const CAN_UPLOAD = ['invigilator', 'hod', 'exam_dept', 'admin']
const CAN_SEE_HISTORY = ['hod', 'dec', 'exam_dept', 'ufm_committee', 'admin']

/* ------------------------------------------------------------------ pieces */
function Detail({ label, value, mono }) {
  return (
    <div className="py-2 border-b border-line last:border-0">
      <dt className="text-micro uppercase text-subtle">{label}</dt>
      <dd className={`text-body text-fg mt-0.5 break-words ${mono ? 'tnum' : ''}`}>{value || '—'}</dd>
    </div>
  )
}

function EvidenceGallery({ items, onOpen }) {
  if (!items.length) {
    return (
      <EmptyState
        icon={Images}
        title="No evidence attached"
        description="AI captures are attached automatically when a case is raised from an alert. You can also upload photos or clips."
        className="py-8"
      />
    )
  }
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {items.map((ev, i) => (
        <button
          key={ev.id}
          onClick={() => onOpen(i)}
          aria-label={`Open evidence ${i + 1}`}
          className="group relative aspect-video rounded-xl overflow-hidden bg-surface-2 border border-line
                     hover:border-brand transition-colors duration-fast text-left"
        >
          {ev.file_type === 'image' ? (
            <img src={ev.url} alt="" loading="lazy" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Play size={22} className="text-subtle group-hover:text-brand transition-colors duration-fast" />
            </div>
          )}
          <span className="absolute top-1.5 left-1.5">
            {ev.source === 'ai'
              ? <span className="badge-brand">AI {ev.confidence != null && `${Math.round(ev.confidence * 100)}%`}</span>
              : <span className="badge-neutral">Manual</span>}
          </span>
          <span className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/85 to-transparent
                           px-2 py-1.5 text-[10px] text-neutral-200 truncate">
            {ev.camera_id || ev.file_type} · {formatDate(ev.captured_at)}
          </span>
        </button>
      ))}
    </div>
  )
}

/* -------------------------------------------------------------------- page */
export default function CaseDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const toast = useToast()
  const nav = useNavigate()

  const [c, setC] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [history, setHistory] = useState(null)
  const [lightbox, setLightbox] = useState(null)

  const [comment, setComment] = useState('')
  const [decision, setDecision] = useState('')
  const [penalty, setPenalty] = useState('')
  const [penaltyNote, setPenaltyNote] = useState('')
  const [busy, setBusy] = useState('')
  const [confirm, setConfirm] = useState(null)
  const [formError, setFormError] = useState('')

  const [response, setResponse] = useState('')
  const [sending, setSending] = useState(false)

  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)

  const load = useCallback(() => api.get(`/api/cases/${id}`)
    .then((r) => { setC(r.data); setNotFound(false) })
    .catch((e) => {
      if (e.response?.status === 404 || e.response?.status === 403) setNotFound(true)
      else toast.error('Could not load the case', errorMessage(e))
    })
    .finally(() => setLoading(false)), [id]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { setLoading(true); load() }, [load])

  useEffect(() => {
    if (!c || !CAN_SEE_HISTORY.includes(user.role)) return
    api.get(`/api/cases/${id}/student-history`).then((r) => setHistory(r.data)).catch(() => {})
  }, [c, id, user.role])

  const evidence = useMemo(
    () => (c?.evidence || []).map((ev) => ({
      ...ev,
      url: `${API_BASE}/evidence/${ev.file_path.split(/[\\/]/).pop()}`,
      caption: `${ev.source === 'ai' ? 'AI capture' : 'Manual upload'}${ev.camera_id ? ` · ${ev.camera_id}` : ''} · ${formatDateTime(ev.captured_at)}`
    })),
    [c]
  )

  /* timeline: recorded actions, then the stages still to come */
  const timeline = useMemo(() => {
    if (!c) return []
    const done = (c.actions || []).map((a) => ({
      id: `a${a.id}`,
      title: actionLabel(a.action),
      role: a.actor_role,
      comment: a.comment,
      at: a.created_at,
      state: 'done',
      icon: a.action === 'student_response' ? MessageSquare : undefined
    }))
    const stage = currentStage(c.status)
    const upcoming = LIFECYCLE_STAGES.slice(stage).map((s, i) => ({
      id: `s${s.key}`,
      title: s.label,
      role: s.role,
      actor: s.hint,
      state: i === 0 && c.status !== 'closed' ? 'current' : 'pending'
    }))
    return [...done, ...upcoming]
  }, [c])

  const act = async (action) => {
    setFormError('')
    if (action === 'decide') {
      const text = decision.trim()
      if (!text) { setFormError('Enter the committee’s final decision before recording it.'); return }
      if (!penalty) { setFormError('Select a penalty.'); return }
    }
    setBusy(action)
    try {
      const finalPenalty = [penalty, penaltyNote.trim()].filter(Boolean).join(' — ')
      await api.post(`/api/cases/${id}/transition`, {
        action,
        comment: comment.trim(),
        final_decision: decision.trim(),
        penalty: action === 'decide' ? finalPenalty : ''
      })
      setComment(''); setDecision(''); setPenalty(''); setPenaltyNote('')
      await load()
      toast.success('Case updated', `${humanize(action)} recorded on ${c.case_no}.`)
    } catch (e) {
      const msg = errorMessage(e, 'Action failed')
      setFormError(msg)
      toast.error('Action failed', msg)
    } finally {
      setBusy(''); setConfirm(null)
    }
  }

  const submitResponse = async () => {
    const text = response.trim()
    if (!text) { setFormError('Write your explanation before submitting.'); return }
    setSending(true)
    try {
      await api.post(`/api/cases/${id}/student-response`, { text })
      setResponse(''); setFormError('')
      await load()
      toast.success('Response submitted', 'Your explanation has been added to the case record.')
    } catch (e) {
      const msg = errorMessage(e, 'Could not submit your response')
      setFormError(msg)
      toast.error('Not submitted', msg)
    } finally { setSending(false) }
  }

  const uploadEvidence = async () => {
    if (!file) return
    setUploading(true)
    const fd = new FormData()
    fd.append('file', file)
    try {
      await api.post(`/api/cases/${id}/evidence`, fd)
      setFile(null)
      await load()
      toast.success('Evidence uploaded', file.name)
    } catch (e) {
      toast.error('Upload failed', errorMessage(e))
    } finally { setUploading(false) }
  }

  /* ------------------------------------------------------------- rendering */
  if (notFound) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title="Case unavailable"
        description="This case does not exist, or it is outside what your role is allowed to see."
        action={<Link to="/cases"><Button variant="ghost" icon={ArrowLeft}>Back to cases</Button></Link>}
      />
    )
  }

  if (loading || !c) {
    return (
      <>
        <Skeleton className="h-10 w-64 mb-2" />
        <Skeleton className="h-4 w-96 mb-6" />
        <div className="grid lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-4">
            <Skeleton className="h-48" /><Skeleton className="h-64" />
          </div>
          <Skeleton className="h-96" />
        </div>
      </>
    )
  }

  const actions = ROLE_ACTIONS[user.role] || []
  const isStudent = user.role === 'student'
  const isClosed = c.status === 'closed'
  const canAct = actions.length > 0 && !isClosed
  const hasResponded = (c.actions || []).some((a) => a.action === 'student_response')

  return (
    <>
      <CasePrintReport case={c} />

      <div className="app-screen">
        {/* header */}
        <div className="mb-6">
          <Link to="/cases" className="inline-flex items-center gap-1.5 text-small text-subtle hover:text-fg
                                       transition-colors duration-fast mb-3 no-print">
            <ArrowLeft size={14} aria-hidden="true" /> Back to cases
          </Link>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-display font-bold tnum">{c.case_no}</h1>
              <p className="text-body text-muted mt-1">
                {c.exam_name || 'Examination'} · {c.room || 'Hall not set'}
                {c.seat && ` / Seat ${c.seat}`} · {c.exam_date || formatDate(c.created_at)} {c.exam_time}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={c.status} />
              {c.result_hold && <span className="badge-danger"><PauseCircle size={11} />Result on hold</span>}
              {c.transcript_blocked && <span className="badge-danger"><BookLock size={11} />Transcript blocked</span>}
              {c.source === 'ai' && <span className="badge-brand">AI detected</span>}
              <Button variant="ghost" icon={Printer} onClick={() => window.print()} className="no-print">
                Print report
              </Button>
            </div>
          </div>
        </div>

        <Card className="mb-4"><CaseProgress status={c.status} /></Card>

        <div className="grid lg:grid-cols-3 gap-4 items-start">
          {/* ------------------------------------------------------- left */}
          <div className="lg:col-span-2 space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <Card title="Violation" icon={ShieldAlert}>
                <dl>
                  <Detail label="Type" value={<span className="capitalize">{humanize(c.violation_type)}</span>} />
                  <Detail label="Reported via" value={c.source === 'ai' ? 'AI detection engine' : 'Invigilator report'} />
                  <Detail label="Description" value={c.description} />
                  <Detail label="Invigilator remarks" value={c.remarks} />
                  <Detail
                    label="Digital signatures"
                    value={
                      <span className="flex flex-wrap gap-1.5">
                        <span className={c.invigilator_signed ? 'badge-ok' : 'badge-neutral'}>
                          Invigilator {c.invigilator_signed ? '✓' : '—'}
                        </span>
                        <span className={c.hod_signed ? 'badge-ok' : 'badge-neutral'}>
                          HOD {c.hod_signed ? '✓' : '—'}
                        </span>
                      </span>
                    }
                  />
                </dl>
              </Card>

              <Card title="Student" icon={UserRound}>
                <dl>
                  <Detail label="Name" value={c.student_name} />
                  <Detail label="Registration" value={c.student_reg_no} mono />
                  <Detail label="Department" value={c.student_department} />
                  <Detail label="Hall / Seat" value={[c.room, c.seat].filter(Boolean).join(' / ')} />
                  <Detail label="Camera" value={c.camera_id} />
                  <Detail label="Reported" value={formatDateTime(c.created_at)} />
                </dl>
              </Card>
            </div>

            <Card
              title={`Evidence (${evidence.length})`}
              icon={Images}
              subtitle="Click any item to view it full screen"
            >
              <EvidenceGallery items={evidence} onOpen={setLightbox} />

              {CAN_UPLOAD.includes(user.role) && !isClosed && (
                <div className="flex flex-col sm:flex-row gap-2 mt-4 pt-4 border-t border-line no-print">
                  <input
                    type="file"
                    aria-label="Choose evidence file"
                    accept="image/*,video/*"
                    onChange={(e) => setFile(e.target.files[0])}
                    className="input file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0
                               file:bg-surface-3 file:text-fg file:text-small file:cursor-pointer"
                  />
                  <Button variant="ghost" icon={Upload} onClick={uploadEvidence}
                          disabled={!file} loading={uploading}>
                    Upload
                  </Button>
                </div>
              )}
            </Card>

            {/* committee / staff: the student's full UFM record */}
            {CAN_SEE_HISTORY.includes(user.role) && history && (
              <Card
                title="Student UFM history"
                icon={History}
                subtitle={`${history.prior_cases} prior case${history.prior_cases === 1 ? '' : 's'} for ${history.student_reg_no}`}
              >
                {history.prior_cases === 0 ? (
                  <p className="text-body text-muted">
                    This is the first UFM case recorded against this student — no prior record.
                  </p>
                ) : (
                  <>
                    {history.prior_cases >= 2 && (
                      <div className="flex items-start gap-2 text-small text-warn bg-warn-soft border border-warn/25
                                      rounded-xl px-3 py-2 mb-3">
                        <AlertTriangle size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
                        Repeat offender: {history.prior_cases} previous cases are on record.
                      </div>
                    )}
                    <ul className="divide-y divide-line">
                      {history.cases.map((h) => (
                        <li key={h.id} className="py-2.5 flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              {h.is_current
                                ? <span className="text-body font-semibold tnum">{h.case_no}</span>
                                : <Link to={`/cases/${h.id}`} className="link text-body font-semibold tnum">{h.case_no}</Link>}
                              {h.is_current && <span className="badge-brand">This case</span>}
                              <StatusBadge status={h.status} />
                            </div>
                            <div className="text-small text-muted mt-0.5 capitalize">
                              {humanize(h.violation_type)} · {formatDate(h.created_at)}
                            </div>
                            {h.penalty && <div className="text-small text-warn mt-0.5">Penalty: {h.penalty}</div>}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </Card>
            )}
          </div>

          {/* ------------------------------------------------------ right */}
          <div className="space-y-4 lg:sticky lg:top-[76px]">
            {c.final_decision && (
              <Card title="Final decision" icon={Gavel} className="border-ok/30">
                <p className="text-body text-fg whitespace-pre-wrap">{c.final_decision}</p>
                {c.penalty && (
                  <div className="mt-3 pt-3 border-t border-line">
                    <div className="text-micro uppercase text-subtle">Penalty awarded</div>
                    <div className="text-body font-semibold text-warn mt-0.5">{c.penalty}</div>
                  </div>
                )}
              </Card>
            )}

            {/* student: submit an explanation */}
            {isStudent && !isClosed && (
              <Card title="Your explanation" icon={PenLine}
                    subtitle="Submit a written clarification for the committee to consider">
                {hasResponded && (
                  <p className="text-small text-ok bg-ok-soft border border-ok/25 rounded-xl px-3 py-2 mb-3">
                    You have already submitted a response. You may add another if you have more to say.
                  </p>
                )}
                <Textarea
                  rows={5}
                  placeholder="Explain what happened in your own words…"
                  value={response}
                  onChange={(e) => { setResponse(e.target.value); setFormError('') }}
                  maxLength={4000}
                  hint={`${response.length}/4000 characters`}
                />
                {formError && <p className="error-text" role="alert">{formError}</p>}
                <Button variant="brand" icon={Send} className="w-full mt-3"
                        loading={sending} onClick={submitResponse}>
                  Submit response
                </Button>
              </Card>
            )}

            {isStudent && isClosed && (
              <Card title="Case closed" icon={Archive}>
                <p className="text-body text-muted">
                  This case has been closed. Contact the Examination Department if you need to raise a further query.
                </p>
              </Card>
            )}

            {/* staff: action panel */}
            {canAct && (
              <Card title="Actions" icon={FileText}
                    subtitle={`Available to the ${ROLE_LABELS[user.role]}`}>
                <Textarea
                  rows={3}
                  label="Comment / remarks"
                  placeholder="Recorded on the case timeline"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  maxLength={2000}
                />

                {['ufm_committee', 'admin'].includes(user.role) && (
                  <div className="space-y-3 mt-3 pt-3 border-t border-line">
                    <Textarea
                      rows={3}
                      label="Final decision"
                      placeholder="The committee finds the student…"
                      value={decision}
                      onChange={(e) => setDecision(e.target.value)}
                      maxLength={2000}
                    />
                    <Select label="Penalty" value={penalty} onChange={(e) => setPenalty(e.target.value)}>
                      <option value="">Select a penalty…</option>
                      {PENALTY_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
                    </Select>
                    <Input
                      label="Additional conditions (optional)"
                      placeholder="e.g. barred from re-sit for one semester"
                      value={penaltyNote}
                      onChange={(e) => setPenaltyNote(e.target.value)}
                      maxLength={300}
                    />
                  </div>
                )}

                {formError && <p className="error-text" role="alert">{formError}</p>}

                <div className="grid gap-2 mt-4">
                  {actions.map(([action, label, Icon, variant]) => (
                    <Button
                      key={action}
                      variant={variant}
                      icon={Icon}
                      loading={busy === action}
                      disabled={busy !== '' && busy !== action}
                      onClick={() => (DESTRUCTIVE.has(action) ? setConfirm({ action, label }) : act(action))}
                      className="justify-start"
                    >
                      {label}
                    </Button>
                  ))}
                </div>
              </Card>
            )}

            {isClosed && !isStudent && (
              <Card title="Case closed" icon={Archive}>
                <p className="text-body text-muted">
                  No further action is possible. The full record remains available and printable.
                </p>
              </Card>
            )}

            <Card title="Workflow timeline" icon={History}
                  subtitle="Every stage, actor and comment on record">
              <Timeline items={timeline} />
            </Card>
          </div>
        </div>
      </div>

      <Lightbox items={evidence} index={lightbox} onClose={() => setLightbox(null)} onNavigate={setLightbox} />

      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={() => act(confirm.action)}
        title={confirm ? confirm.label : ''}
        description={confirm ? `This will be recorded on ${c.case_no} and cannot be undone from here.` : ''}
        confirmLabel={confirm?.label}
        tone="danger"
      >
        {comment.trim()
          ? <p className="text-body text-muted">Your comment: “{comment.trim()}”</p>
          : <p className="text-small text-subtle">No comment entered — the action will be recorded without remarks.</p>}
      </ConfirmDialog>
    </>
  )
}
