import { useEffect, type ReactNode } from 'react'
import type { AppError, HeaderValidationResult } from '../../core/types/errors'
import { TAB_DISPLAY } from '../../core/types/tabs'
import { DangerButton, GhostButton, LinkButton, PrimaryButton } from './Buttons'
import { AlertIcon } from './icons'

export function Banner({
  tone = 'error',
  children,
  actions,
}: {
  tone?: 'error' | 'info'
  children: ReactNode
  actions?: ReactNode
}) {
  return (
    <div className={tone === 'info' ? 'banner banner--info' : 'banner'} role="status">
      <AlertIcon size={15} />
      <div className="banner__body">
        {children}
        {actions ? <div className="banner__actions">{actions}</div> : null}
      </div>
    </div>
  )
}

export function ErrorBanner({
  error,
  onDismiss,
  onRetry,
  onSignIn,
}: {
  error: AppError
  onDismiss: () => void
  onRetry?: () => void
  onSignIn?: () => void
}) {
  const needsAuth = error.code === 'AUTH_EXPIRED' || error.code === 'AUTH_REQUIRED'
  return (
    <Banner
      actions={
        <>
          {needsAuth && onSignIn ? (
            <LinkButton onClick={onSignIn}>Sign in again</LinkButton>
          ) : error.retryable && onRetry ? (
            <LinkButton onClick={onRetry}>Try again</LinkButton>
          ) : null}
          <LinkButton onClick={onDismiss}>Dismiss</LinkButton>
        </>
      }
    >
      {error.friendlyMessage}
    </Banner>
  )
}

/** Shown when a hand edit in Sheets removed a column Trallo reads. */
export function StructureBanner({
  problems,
  onOpenSheet,
  onRetry,
}: {
  problems: HeaderValidationResult[]
  onOpenSheet: () => void
  onRetry: () => void
}) {
  if (problems.length === 0) return null
  return (
    <Banner
      actions={
        <>
          <LinkButton onClick={onOpenSheet}>Open the sheet</LinkButton>
          <LinkButton onClick={onRetry}>Re-check</LinkButton>
        </>
      }
    >
      This trip’s sheet is missing columns Trallo needs:{' '}
      {problems
        .map((p) => `${TAB_DISPLAY[p.tab]} (${p.missingColumns.join(', ')})`)
        .join('; ')}
      . Restore those header names and refresh.
    </Banner>
  )
}

export function Modal({
  title,
  children,
  onClose,
}: {
  title: string
  children: ReactNode
  onClose: () => void
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="modal__scrim" onMouseDown={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <h2 className="modal__title">{title}</h2>
        {children}
      </div>
    </div>
  )
}

export function ConfirmDialog({
  title,
  message,
  confirmLabel,
  destructive,
  busy,
  onConfirm,
  onCancel,
}: {
  title: string
  message: string
  confirmLabel: string
  destructive?: boolean
  busy?: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <Modal title={title} onClose={onCancel}>
      <p className="modal__text">{message}</p>
      <div className="modal__actions">
        <GhostButton small onClick={onCancel} disabled={busy}>
          Cancel
        </GhostButton>
        {destructive ? (
          <DangerButton small onClick={onConfirm} disabled={busy}>
            {confirmLabel}
          </DangerButton>
        ) : (
          <PrimaryButton small onClick={onConfirm} disabled={busy}>
            {confirmLabel}
          </PrimaryButton>
        )}
      </div>
    </Modal>
  )
}
