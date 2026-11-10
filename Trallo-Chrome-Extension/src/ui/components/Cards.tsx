import type { ReactNode } from 'react'
import { formatDateRange } from '../../core/dates'
import { plural } from '../../core/format'
import type { TabName } from '../../core/types/tabs'
import type { Trip, TripSummary } from '../../core/types/trip'
import { IconButton, LinkButton } from './Buttons'
import {
  BagIcon,
  CalendarIcon,
  ChevronRightIcon,
  ClockIcon,
  CompassIcon,
  HotelIcon,
  MapPinIcon,
  NoteIcon,
  PlaneIcon,
  TrashIcon,
  WalletIcon,
  PencilIcon,
} from './icons'

export function Badge({
  children,
  tone = 'neutral',
}: {
  children: ReactNode
  tone?: 'neutral' | 'green' | 'active' | 'soft'
}) {
  return <span className={`badge badge--${tone}`}>{children}</span>
}

export function StatCard({
  icon,
  label,
  value,
  sub,
  extra,
}: {
  icon: ReactNode
  label: string
  value: string
  sub?: string
  extra?: ReactNode
}) {
  return (
    <div className="statcard">
      <span className="statcard__label">
        {icon}
        {label}
      </span>
      <span className="statcard__value">{value}</span>
      {sub ? <span className="statcard__sub">{sub}</span> : null}
      {extra}
    </div>
  )
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <div className="empty">{children}</div>
}

const STATUS_TONE = {
  ACTIVE: 'active',
  UPCOMING: 'neutral',
  PAST: 'neutral',
} as const

export function TripCard({
  trip,
  summary,
  onOpen,
  onEdit,
  onDelete,
}: {
  trip: Trip
  summary: TripSummary
  onOpen: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  const countdown =
    summary.status === 'PAST'
      ? { value: 'Completed', sub: 'Trip finished' }
      : summary.status === 'ACTIVE'
        ? { value: '0 Days', sub: 'Trip in progress' }
        : { value: plural(summary.countdownDays, 'Day'), sub: 'Until departure' }

  return (
    <article className="card tripcard">
      <div className="tripcard__banner">
        <img className="tripcard__plane" src="images/plane-logo.png" alt="" />
      </div>
      <div className="tripcard__body">
        <div className="tripcard__top">
          <Badge tone={STATUS_TONE[summary.status]}>{summary.status}</Badge>
          <span className="savedrow__actions">
            <IconButton label={`Edit ${trip.name}`} onClick={onEdit}>
              <PencilIcon size={15} />
            </IconButton>
            <IconButton label={`Delete ${trip.name}`} danger onClick={onDelete}>
              <TrashIcon size={15} />
            </IconButton>
          </span>
        </div>

        <div>
          <h2 className="tripcard__name">{trip.name}</h2>
          {trip.cities.length > 0 ? (
            <p className="tripcard__meta">
              <MapPinIcon size={13} />
              {trip.cities.join(' · ')}
            </p>
          ) : null}
          <p className="tripcard__meta">
            <CalendarIcon size={13} />
            {formatDateRange(trip.startDate, trip.endDate)}
            {summary.daysCount > 0 ? ` • ${plural(summary.daysCount, 'day')}` : ''}
          </p>
        </div>

        <div className="tripcard__stats">
          <StatCard
            icon={<PlaneIcon size={12} />}
            label="What's next"
            value={summary.whatsNext}
            extra={
              summary.whatsNext === 'Book Flights' && summary.counts.Flights === 0 ? (
                <span style={{ marginTop: 4 }}>
                  <Badge tone="soft">Not started</Badge>
                </span>
              ) : null
            }
          />
          <StatCard
            icon={<ClockIcon size={12} />}
            label="Countdown"
            value={countdown.value}
            sub={countdown.sub}
          />
        </div>

        <div className="tripcard__foot">
          <LinkButton onClick={onOpen}>Open Trip Hub →</LinkButton>
        </div>
      </div>
    </article>
  )
}

const MODULE_ICONS: Record<TabName, ReactNode> = {
  Flights: <PlaneIcon size={18} />,
  'Hotels & Housing': <HotelIcon size={18} />,
  'Bucket List': <CompassIcon size={18} />,
  'Packing List': <BagIcon size={18} />,
  'Budgeting & Expenses': <WalletIcon size={18} />,
  'Notes & Brainstorming': <NoteIcon size={18} />,
}

export function ModuleRow({
  tab,
  title,
  subtitle,
  badge,
  tone,
  onClick,
}: {
  tab: TabName
  title: string
  subtitle: string
  badge: string
  tone: 'green' | 'neutral'
  onClick: () => void
}) {
  return (
    <button type="button" className="modulerow" onClick={onClick}>
      <span className="modulerow__icon">{MODULE_ICONS[tab]}</span>
      <span className="modulerow__main">
        <span className="modulerow__title">
          {title}
          <Badge tone={tone === 'green' ? 'green' : 'soft'}>{badge}</Badge>
        </span>
        <span className="modulerow__sub">{subtitle}</span>
      </span>
      <ChevronRightIcon size={18} className="modulerow__chevron" />
    </button>
  )
}

export function QuickView({
  icon,
  title,
  sub,
  onClick,
}: {
  icon: ReactNode
  title: string
  sub: string
  onClick: () => void
}) {
  return (
    <button type="button" className="quickview" onClick={onClick}>
      <span className="modulerow__icon" style={{ width: 30, height: 30 }}>
        {icon}
      </span>
      <span>
        <span className="quickview__title" style={{ display: 'block' }}>
          {title}
        </span>
        <span className="quickview__sub">{sub}</span>
      </span>
    </button>
  )
}
