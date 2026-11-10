import { computeSummary } from '../core/summary'
import type { TabName } from '../core/types/tabs'
import { useTrip } from '../state/useTrip'
import { AlertIcon, RefreshIcon } from './components/icons'
import { useOnline } from './hooks'
import { BucketListScreen } from './screens/BucketListScreen'
import { BudgetScreen } from './screens/BudgetScreen'
import { FlightsScreen } from './screens/FlightsScreen'
import { HotelsScreen } from './screens/HotelsScreen'
import { MyTripsScreen } from './screens/MyTripsScreen'
import { NotesScreen } from './screens/NotesScreen'
import { PackingScreen } from './screens/PackingScreen'
import { SignInScreen } from './screens/SignInScreen'
import { TripFormScreen } from './screens/TripFormScreen'
import { TripHubScreen } from './screens/TripHubScreen'

const MODULE_SCREENS: Record<TabName, () => React.JSX.Element> = {
  Flights: FlightsScreen,
  'Hotels & Housing': HotelsScreen,
  'Bucket List': BucketListScreen,
  'Packing List': PackingScreen,
  'Budgeting & Expenses': BudgetScreen,
  'Notes & Brainstorming': NotesScreen,
}

function Boot() {
  return (
    <div className="boot">
      <RefreshIcon size={15} className="syncfooter__spin" />
      Loading your trips…
    </div>
  )
}

/** Screen state machine. Every screen renders its own Panel shell. */
function CurrentScreen() {
  const { state, activeTrip, items } = useTrip()
  const { screen } = state

  if (state.authState === 'unknown') return <Boot />
  if (state.authState !== 'signed-in' || screen.kind === 'signin') return <SignInScreen />

  switch (screen.kind) {
    case 'trips':
      return <MyTripsScreen />
    case 'new':
      return <TripFormScreen />
    case 'edit': {
      const trip = state.trips.find((t) => t.id === screen.tripId)
      return trip ? <TripFormScreen trip={trip} /> : <MyTripsScreen />
    }
    case 'hub': {
      if (!activeTrip) return <MyTripsScreen />
      return <TripHubScreen trip={activeTrip} summary={computeSummary(activeTrip, items)} />
    }
    case 'module': {
      if (!activeTrip) return <MyTripsScreen />
      const Screen = MODULE_SCREENS[screen.tab]
      return <Screen />
    }
  }
}

export function App() {
  const online = useOnline()
  return (
    <div className="shell">
      {!online ? (
        <div className="offlinebar">
          <AlertIcon size={13} />
          Offline — nothing will reach Google until you reconnect
        </div>
      ) : null}
      <div className="shell__screen">
        <CurrentScreen />
      </div>
    </div>
  )
}
