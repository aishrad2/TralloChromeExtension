import { useState } from 'react'
import { formatDateRange } from '../../core/dates'
import { plural } from '../../core/format'
import { moduleRows } from '../../core/moduleRows'
import { whatsNextTarget } from '../../core/summary'
import type { Trip, TripSummary } from '../../core/types/trip'
import { useTrip } from '../../state/useTrip'
import { LinkButton, OutlineButton } from '../components/Buttons'
import { ModuleRow } from '../components/Cards'
import { ErrorBanner, StructureBanner } from '../components/Feedback'
import { BackLink, Panel, ScreenHead, Section, SyncFooter, TopBar } from '../components/Layout'
import { ShareIcon } from '../components/icons'
import { ShareDialog } from '../components/ShareDialog'

const EYEBROW = {
  ACTIVE: 'ACTIVE TRIP',
  UPCOMING: 'UPCOMING TRIP',
  PAST: 'PAST TRIP',
} as const

export function TripHubScreen({ trip, summary }: { trip: Trip; summary: TripSummary }) {
  const { state, actions, items } = useTrip()
  const [sharing, setSharing] = useState(false)

  const rows = moduleRows(trip, items, summary)
  const nextTab = whatsNextTarget(summary.whatsNext)

  return (
    <Panel
      top={
        <TopBar
          left={<BackLink label="Back to Trips" onClick={actions.goTrips} />}
          right={
            <OutlineButton small icon={<ShareIcon size={14} />} onClick={() => setSharing(true)}>
              Share
            </OutlineButton>
          }
        />
      }
      footer={<SyncFooter />}
    >
      <ScreenHead
        eyebrow={EYEBROW[summary.status]}
        title={trip.name}
        subtitle={`${formatDateRange(trip.startDate, trip.endDate)}${
          summary.daysCount > 0 ? ` • ${plural(summary.daysCount, 'day')}` : ''
        }${trip.cities.length ? ` • ${trip.cities.join(' · ')}` : ''}`}
      />

      <Section>
        {state.error ? (
          <ErrorBanner
            error={state.error}
            onDismiss={actions.dismissError}
            onRetry={() => void actions.refresh()}
            onSignIn={() => void actions.signIn()}
          />
        ) : null}

        <StructureBanner
          problems={state.structureProblems}
          onOpenSheet={() => void actions.openSheet()}
          onRetry={() => void actions.refresh()}
        />

        <div className="summaryrow">
          <div>
            <p className="summaryrow__label" style={{ marginBottom: 2 }}>
              Next step
            </p>
            <span className="summaryrow__value" style={{ fontSize: 15 }}>
              {summary.whatsNext}
            </span>
          </div>
          {nextTab ? (
            <LinkButton onClick={() => actions.openModule(nextTab)}>Go →</LinkButton>
          ) : (
            <span className="statcard__sub">
              {summary.countdownDays > 0 ? `${plural(summary.countdownDays, 'day')} to go` : ''}
            </span>
          )}
        </div>
      </Section>

      <Section label="Trip modules">
        {rows.map((row) => (
          <ModuleRow
            key={row.tab}
            tab={row.tab}
            title={row.title}
            subtitle={row.subtitle}
            badge={row.badge}
            tone={row.tone}
            onClick={() => actions.openModule(row.tab)}
          />
        ))}
      </Section>

      {sharing ? (
        <ShareDialog
          tripName={trip.name}
          onShare={actions.share}
          onClose={() => setSharing(false)}
        />
      ) : null}
    </Panel>
  )
}
