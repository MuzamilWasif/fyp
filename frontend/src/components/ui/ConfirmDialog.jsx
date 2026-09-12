import { useState } from 'react'
import Modal from './Modal'
import Button from './Button'

export default function ConfirmDialog({
  open, onClose, onConfirm, title = 'Are you sure?', description,
  confirmLabel = 'Confirm', cancelLabel = 'Cancel', tone = 'brand', children
}) {
  const [busy, setBusy] = useState(false)

  const run = async () => {
    setBusy(true)
    try { await onConfirm?.() } finally { setBusy(false) }
  }

  return (
    <Modal
      open={open}
      onClose={busy ? undefined : onClose}
      title={title}
      description={description}
      size="sm"
      footer={
        <>
          <Button variant="subtle" onClick={onClose} disabled={busy}>{cancelLabel}</Button>
          <Button variant={tone} onClick={run} loading={busy}>{confirmLabel}</Button>
        </>
      }
    >
      {children}
    </Modal>
  )
}
