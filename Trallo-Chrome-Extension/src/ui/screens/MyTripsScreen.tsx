import { useState } from 'react'
import { compareTrips } from '../../core/summary'
import { useTrip } from '../../state/useTrip'
import { PrimaryButton } from '../components/Buttons'
import { EmptyState, TripCard } from '../components/Cards'
import { ConfirmDialog, ErrorBanner } from '../components/Feedback'
import { AccountMenu, BrandBar, Panel, ScreenHead, Section, TripsFooter } from '../components/Layout'
import { PlusIcon } from '../components/icons'

export function MyTripsScreen() {
  const { state, actions, summaryFor } = useTrip()
  const [pendingDelete, setPendingDelete] = useState<string>()

  const trips = [...state.trips].sort((a, b) => compareTrips(a, b))
  const deleting = trips.find((t) => t.id === pendingDelete)

  return (
    <Panel top={<BrandBar right={<AccountMenu />} />} footer={<TripsFooter />}>
      <ScreenHead
        plain
        title="My Trips"
        subtitle="Select a trip or create a new plan"
        right={
          <PrimaryButton small icon={<PlusIcon size={14} />} onClick={actions.goNewTrip}>
            New Trip
          </PrimaryButton>
        }
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

        {trips.length === 0 ? (
          <EmptyState>
            {state.booting
              ? 'Looking for your trips…'
              : 'No trips yet. Create one and Trallo will set up its Google Sheet for you.'}
          </EmptyState>
        ) : (
          trips.map((trip) => {
            const summary = summaryFor(trip.id)
            if (!summary) return null
            return (
              <TripCard
                key={trip.id}
                trip={trip}
                summary={summary}
                onOpen={() => void actions.openTrip(trip.id)}
                onEdit={() => actions.goEditTrip(trip.id)}
                onDelete={() => setPendingDelete(trip.id)}
              />
            )
          })
        )}
      </Section>

      {deleting ? (
        <ConfirmDialog
          title={`Delete ${deleting.name}?`}
          message={`Trallo will remove this trip and move “${deleting.sheetName}” to your Google Drive trash, where you can still restore it.`}
          confirmLabel="Delete trip"
          destructive
          busy={state.busy}
          onCancel={() => setPendingDelete(undefined)}
          onConfirm={() => {
            const id = deleting.id
            setPendingDelete(undefined)
            void actions.deleteTrip(id)
          }}
        />
      ) : null}
    </Panel>
  )
}
