import { useEffect, useRef, useState, type ReactNode } from 'react'
import { formatRelative } from '../../core/dates'
import { useTrip } from '../../state/useTrip'
import { IconButton, LinkButton, OutlineButton } from './Buttons'
import { ArrowLeftIcon, ExternalLinkIcon, MoreIcon, RefreshIcon, SheetIcon } from './icons'

/** Fixed top bar, scrolling body, fixed footer — the shape every screen uses. */
export function Panel({
  top,
  footer,
  children,
}: {
  top?: ReactNode
  footer?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="app">
      {top}
      <div className="app__body">{children}</div>
      {footer}
    </div>
  )
}

export function TopBar({ left, right }: { left?: ReactNode; right?: ReactNode }) {
  return (
    <header className="topbar">
      {left ?? <span />}
      {right ?? <span />}
    </header>
  )
}

export function BrandBar({ right }: { right?: ReactNode }) {
  return (
    <TopBar
      left={<img className="topbar__logo" src="images/trallo-logo.png" alt="Trallo" />}
      right={right}
    />
  )
}

export function BackLink({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" className="backlink" onClick={onClick}>
      <ArrowLeftIcon size={16} />
      {label}
    </button>
  )
}

export function ScreenHead({
  eyebrow,
  title,
  subtitle,
  right,
  plain,
}: {
  eyebrow?: string
  title: string
  subtitle?: string
  right?: ReactNode
  plain?: boolean
}) {
  return (
    <div className={plain ? 'screenhead screenhead--plain' : 'screenhead'}>
      <div>
        {eyebrow ? <p className="screenhead__eyebrow">{eyebrow}</p> : null}
        <h1 className="screenhead__title">{title}</h1>
        {subtitle ? <p className="screenhead__subtitle">{subtitle}</p> : null}
      </div>
      {right}
    </div>
  )
}

export function Section({ label, children }: { label?: string; children: ReactNode }) {
  return (
    <div className="section">
      {label ? <p className="section__label">{label}</p> : null}
      {children}
    </div>
  )
}

/** My Trips footer: no sheet is open yet, so it only states the sync promise. */
export function TripsFooter() {
  return (
    <footer className="syncfooter">
      <span className="syncfooter__status">
        <SheetIcon size={14} />
        Auto-syncing to Google Sheets
      </span>
    </footer>
  )
}

/** Trip footer: live sheet name, sync state, manual refresh, open in Sheets. */
export function SyncFooter() {
  const { state, actions, activeTrip } = useTrip()
  const syncing = state.syncState.status === 'syncing'

  return (
    <footer className="syncfooter">
      <span className="syncfooter__status">
        <RefreshIcon size={14} className={syncing ? 'syncfooter__spin' : undefined} />
        <span>
          Live Sheet:{' '}
          <span className="syncfooter__sheet">{activeTrip?.sheetName ?? 'not connected'}</span>
        </span>
      </span>
      <span className="syncfooter__status">
        <LinkButton onClick={() => void actions.refresh()} disabled={syncing}>
          {syncing ? 'Syncing…' : `Synced ${formatRelative(state.syncState.lastSyncedAt)}`}
        </LinkButton>
        <OutlineButton small icon={<ExternalLinkIcon size={13} />} onClick={() => void actions.openSheet()}>
          Open Sheet
        </OutlineButton>
      </span>
    </footer>
  )
}

export function AccountMenu() {
  const { state, actions } = useTrip()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <IconButton label="Account" onClick={() => setOpen((v) => !v)}>
        <MoreIcon size={16} />
      </IconButton>
      {open ? (
        <div
          className="card"
          style={{
            position: 'absolute',
            right: 0,
            top: 32,
            zIndex: 5,
            minWidth: 190,
            padding: 12,
            boxShadow: 'var(--shadow-pop)',
          }}
        >
          <p className="field__hint" style={{ marginBottom: 8, overflowWrap: 'anywhere' }}>
            {state.email ?? 'Signed in with Google'}
          </p>
          <OutlineButton
            small
            block
            onClick={() => {
              setOpen(false)
              void actions.signOut()
            }}
          >
            Sign out
          </OutlineButton>
        </div>
      ) : null}
    </div>
  )
}
