import { useState } from 'react'
import type { ShareRole } from '../../core/types/trip'
import { GhostButton, PrimaryButton } from './Buttons'
import { Field, Select, TextInput } from './Form'
import { Modal } from './Feedback'

const ROLE_LABELS: Record<string, ShareRole> = {
  'Can edit': 'writer',
  'Can view': 'reader',
}

/**
 * Sharing is just a Drive permission on the trip's spreadsheet — there are no
 * Trallo accounts to invite anyone to.
 */
export function ShareDialog({
  tripName,
  onShare,
  onClose,
}: {
  tripName: string
  onShare: (email: string, role: ShareRole) => Promise<void>
  onClose: () => void
}) {
  const [email, setEmail] = useState('')
  const [roleLabel, setRoleLabel] = useState('Can edit')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>()
  const [done, setDone] = useState(false)

  const submit = async () => {
    setBusy(true)
    setError(undefined)
    try {
      await onShare(email, ROLE_LABELS[roleLabel] ?? 'writer')
      setDone(true)
    } catch {
      setError('Could not share the sheet. Check the address and try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal title={`Share ${tripName}`} onClose={onClose}>
      {done ? (
        <>
          <p className="modal__text">
            Invited <strong>{email}</strong>. They will get an email from Google Drive with a link
            to the trip sheet.
          </p>
          <div className="modal__actions">
            <PrimaryButton small onClick={onClose}>
              Done
            </PrimaryButton>
          </div>
        </>
      ) : (
        <>
          <p className="modal__text">
            Trallo shares the trip’s Google Sheet directly. Whoever you invite can open it in
            Sheets, and their edits show up here within about 30 seconds.
          </p>
          <Field label="Email address" htmlFor="share-email" error={error}>
            <TextInput
              id="share-email"
              type="email"
              value={email}
              onChange={setEmail}
              placeholder="name@example.com"
              invalid={!!error}
              autoFocus
            />
          </Field>
          <Field label="Access" htmlFor="share-role">
            <Select
              id="share-role"
              value={roleLabel}
              onChange={setRoleLabel}
              options={Object.keys(ROLE_LABELS)}
              placeholder="Can edit"
            />
          </Field>
          <div className="modal__actions">
            <GhostButton small onClick={onClose} disabled={busy}>
              Cancel
            </GhostButton>
            <PrimaryButton small onClick={() => void submit()} disabled={busy || !email.trim()}>
              {busy ? 'Sharing…' : 'Share'}
            </PrimaryButton>
          </div>
        </>
      )}
    </Modal>
  )
}
