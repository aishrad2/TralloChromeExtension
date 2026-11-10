import { useCallback, useEffect, useMemo, useReducer, useRef, type ReactNode } from 'react'
import { nowISO } from '../core/dates'
import { computeSummary } from '../core/summary'
import { toAppError, type AppError, type HeaderValidationResult } from '../core/types/errors'
import { emptyItemsByTab, type ItemsByTab, type NewItem, type TripItem } from '../core/types/items'
import type { TabName } from '../core/types/tabs'
import type { NewTripInput, ShareRole, Trip, TripDetailsPatch } from '../core/types/trip'
import { openUrl } from '../platform/browser'
import { AuthService } from '../services/AuthService'
import { DraftStore } from '../services/DraftStore'
import { GoogleApiClient } from '../services/GoogleApiClient'
import { SheetsTripRepository } from '../services/SheetsTripRepository'
import { TripCache } from '../services/TripCache'
import { TripManager } from '../services/TripManager'
import { TripContext, type TripActions } from './context'
import type { AppState, Screen, SyncState } from './types'
import { useSync } from './useSync'

const EMPTY_ITEMS = emptyItemsByTab()

const initialState: AppState = {
  authState: 'unknown',
  trips: [],
  itemsByTrip: {},
  structureProblems: [],
  booting: true,
  busy: false,
  syncState: { status: 'idle' },
  screen: { kind: 'trips' },
}

type Action =
  | { type: 'auth'; authState: AppState['authState']; email?: string }
  | { type: 'trips'; trips: Trip[] }
  | { type: 'active'; tripId?: string }
  | {
      type: 'tripData'
      tripId: string
      items: ItemsByTab
      structureProblems: HeaderValidationResult[]
    }
  | { type: 'items'; tripId: string; items: ItemsByTab }
  | { type: 'itemsByTrip'; itemsByTrip: Record<string, ItemsByTab> }
  | { type: 'screen'; screen: Screen }
  | { type: 'booting'; booting: boolean }
  | { type: 'busy'; busy: boolean }
  | { type: 'sync'; syncState: SyncState }
  | { type: 'error'; error?: AppError }

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'auth':
      return { ...state, authState: action.authState, email: action.email ?? state.email }
    case 'trips':
      return { ...state, trips: action.trips }
    case 'active':
      return { ...state, activeTripId: action.tripId }
    case 'tripData':
      return {
        ...state,
        itemsByTrip: { ...state.itemsByTrip, [action.tripId]: action.items },
        structureProblems: action.structureProblems,
      }
    case 'items':
      return { ...state, itemsByTrip: { ...state.itemsByTrip, [action.tripId]: action.items } }
    case 'itemsByTrip':
      return { ...state, itemsByTrip: { ...state.itemsByTrip, ...action.itemsByTrip } }
    case 'screen':
      return { ...state, screen: action.screen, error: undefined }
    case 'booting':
      return { ...state, booting: action.booting }
    case 'busy':
      return { ...state, busy: action.busy }
    case 'sync':
      return { ...state, syncState: action.syncState }
    case 'error':
      return { ...state, error: action.error }
  }
}

export function TripProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState)

  const { auth, manager } = useMemo(() => {
    const authService = new AuthService()
    const repository = new SheetsTripRepository(new GoogleApiClient(authService))
    return {
      auth: authService,
      manager: new TripManager(repository, new TripCache(), new DraftStore()),
    }
  }, [])

  // Tabs with unsaved input, kept in a ref so typing doesn't re-render the app.
  const dirtyTabs = useRef(new Set<TabName>())
  const activeTripId = useRef<string | undefined>(undefined)
  useEffect(() => {
    activeTripId.current = state.activeTripId
  }, [state.activeTripId])

  const fail = useCallback((err: unknown) => {
    const appErr = toAppError(err)
    dispatch({ type: 'error', error: appErr })
    if (appErr.code === 'AUTH_EXPIRED' || appErr.code === 'AUTH_REQUIRED') {
      dispatch({ type: 'auth', authState: 'signed-out' })
    }
    return appErr
  }, [])

  const run = useCallback(
    async <T,>(work: () => Promise<T>): Promise<T | undefined> => {
      dispatch({ type: 'busy', busy: true })
      dispatch({ type: 'error', error: undefined })
      try {
        return await work()
      } catch (err) {
        fail(err)
        return undefined
      } finally {
        dispatch({ type: 'busy', busy: false })
      }
    },
    [fail],
  )

  const refreshTripList = useCallback(async () => {
    const trips = await manager.listTrips()
    dispatch({ type: 'trips', trips })
    return trips
  }, [manager])

  const loadTrip = useCallback(
    async (tripId: string) => {
      const cached = await manager.cachedData(tripId)
      if (cached) {
        dispatch({ type: 'tripData', tripId, items: cached.items, structureProblems: [] })
      }
      dispatch({ type: 'sync', syncState: { status: 'syncing' } })
      const data = await manager.loadTripData(tripId)
      dispatch({ type: 'tripData', tripId, items: data.items, structureProblems: data.structureProblems })
      dispatch({ type: 'trips', trips: await manager.listTrips() })
      dispatch({ type: 'sync', syncState: { status: 'idle', lastSyncedAt: data.trip.lastSyncedAt } })
    },
    [manager],
  )

  // ------------------------------------------------------------- bootstrap

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const primed = await manager.primeFromCache()
      if (cancelled) return
      dispatch({ type: 'trips', trips: primed.trips })
      dispatch({ type: 'active', tripId: primed.activeTripId })
      dispatch({ type: 'itemsByTrip', itemsByTrip: primed.itemsByTrip })

      const signedIn = await auth.isSignedIn()
      if (cancelled) return
      if (!signedIn) {
        dispatch({ type: 'auth', authState: 'signed-out' })
        dispatch({ type: 'screen', screen: { kind: 'signin' } })
        dispatch({ type: 'booting', booting: false })
        return
      }

      dispatch({ type: 'auth', authState: 'signed-in', email: await auth.getEmail() })
      dispatch({ type: 'screen', screen: { kind: 'trips' } })
      try {
        await refreshTripList()
      } catch (err) {
        fail(err)
      }
      if (!cancelled) dispatch({ type: 'booting', booting: false })
    })()
    return () => {
      cancelled = true
    }
  }, [auth, manager, refreshTripList, fail])

  // ------------------------------------------------------------------ sync

  const poll = useCallback(async () => {
    const tripId = activeTripId.current
    if (!tripId) return
    dispatch({ type: 'sync', syncState: { status: 'syncing', lastSyncedAt: state.syncState.lastSyncedAt } })
    const outcome = await manager.syncIfChanged(tripId, [...dirtyTabs.current])
    if (outcome.error) {
      dispatch({
        type: 'sync',
        syncState: {
          status: 'error',
          lastSyncedAt: outcome.lastSyncedAt,
          message: outcome.error.friendlyMessage,
        },
      })
      return
    }
    if (outcome.changed && outcome.data) {
      dispatch({
        type: 'tripData',
        tripId,
        items: outcome.data.items,
        structureProblems: outcome.data.structureProblems,
      })
      dispatch({ type: 'trips', trips: await manager.listTrips() })
    }
    dispatch({ type: 'sync', syncState: { status: 'idle', lastSyncedAt: outcome.lastSyncedAt } })
  }, [manager, state.syncState.lastSyncedAt])

  useSync({
    enabled:
      state.authState === 'signed-in' &&
      !!state.activeTripId &&
      (state.screen.kind === 'hub' || state.screen.kind === 'module'),
    onPoll: poll,
  })

  // --------------------------------------------------------------- actions

  const actions = useMemo<TripActions>(() => {
    const requireTrip = () => {
      const tripId = activeTripId.current
      if (!tripId) throw new Error('No active trip')
      return tripId
    }

    const applyItems = (tripId: string, items: ItemsByTab) => {
      dispatch({ type: 'items', tripId, items })
      dispatch({ type: 'sync', syncState: { status: 'idle', lastSyncedAt: nowISO() } })
    }

    return {
      signIn: async () => {
        dispatch({ type: 'auth', authState: 'signing-in' })
        try {
          const token = await auth.signIn()
          dispatch({ type: 'auth', authState: 'signed-in', email: token.email })
          dispatch({ type: 'screen', screen: { kind: 'trips' } })
          await refreshTripList()
        } catch (err) {
          dispatch({ type: 'auth', authState: 'signed-out' })
          fail(err)
        }
      },

      signOut: async () => {
        await auth.signOut()
        dispatch({ type: 'auth', authState: 'signed-out' })
        dispatch({ type: 'screen', screen: { kind: 'signin' } })
      },

      goTrips: () => {
        dirtyTabs.current.clear()
        dispatch({ type: 'screen', screen: { kind: 'trips' } })
        void run(refreshTripList)
      },
      goNewTrip: () => dispatch({ type: 'screen', screen: { kind: 'new' } }),
      goEditTrip: (tripId) => dispatch({ type: 'screen', screen: { kind: 'edit', tripId } }),

      openTrip: async (tripId) => {
        dirtyTabs.current.clear()
        await manager.setActiveTrip(tripId)
        dispatch({ type: 'active', tripId })
        dispatch({ type: 'screen', screen: { kind: 'hub', tripId } })
        await run(() => loadTrip(tripId))
      },

      goHub: () => {
        const tripId = requireTrip()
        dispatch({ type: 'screen', screen: { kind: 'hub', tripId } })
      },

      openModule: (tab) => {
        const tripId = requireTrip()
        dispatch({ type: 'screen', screen: { kind: 'module', tripId, tab } })
      },

      createTrip: async (input: NewTripInput) => {
        await run(async () => {
          const trip = await manager.createTrip(input)
          dispatch({ type: 'active', tripId: trip.id })
          dispatch({ type: 'trips', trips: await manager.listTrips() })
          dispatch({ type: 'screen', screen: { kind: 'hub', tripId: trip.id } })
          await loadTrip(trip.id)
        })
      },

      updateTrip: async (tripId: string, patch: TripDetailsPatch) => {
        await run(async () => {
          await manager.updateTrip(tripId, patch)
          dispatch({ type: 'trips', trips: await manager.listTrips() })
          dispatch({ type: 'screen', screen: { kind: 'trips' } })
        })
      },

      deleteTrip: async (tripId: string) => {
        await run(async () => {
          await manager.deleteTrip(tripId)
          const trips = await manager.listTrips()
          dispatch({ type: 'trips', trips })
          dispatch({ type: 'active', tripId: manager.getActiveTripId() })
          dispatch({ type: 'screen', screen: { kind: 'trips' } })
        })
      },

      addItem: async (item: NewItem) => {
        const tripId = requireTrip()
        await run(async () => {
          const { items } = await manager.addItem(tripId, item)
          applyItems(tripId, items)
        })
      },

      updateItem: async (tab: TabName, rowId: string, patch: Partial<TripItem>) => {
        const tripId = requireTrip()
        await run(async () => {
          const { items } = await manager.updateItem(tripId, tab, rowId, patch)
          applyItems(tripId, items)
        })
      },

      deleteItem: async (tab: TabName, rowId: string) => {
        const tripId = requireTrip()
        await run(async () => applyItems(tripId, await manager.deleteItem(tripId, tab, rowId)))
      },

      share: async (email: string, role: ShareRole) => {
        const tripId = requireTrip()
        const result = await run(async () => {
          await manager.share(tripId, email, role)
          return true
        })
        if (!result) throw new Error('share failed')
      },

      openSheet: async (tab?: TabName) => {
        const tripId = requireTrip()
        await run(async () => openUrl(await manager.getSheetUrl(tripId, tab)))
      },

      refresh: async () => {
        const tripId = activeTripId.current
        if (!tripId) {
          await run(refreshTripList)
          return
        }
        dispatch({ type: 'sync', syncState: { status: 'syncing' } })
        const outcome = await manager.forceRefresh(tripId, [...dirtyTabs.current])
        if (outcome.error) {
          dispatch({
            type: 'sync',
            syncState: {
              status: 'error',
              lastSyncedAt: outcome.lastSyncedAt,
              message: outcome.error.friendlyMessage,
            },
          })
          return
        }
        if (outcome.data) {
          dispatch({
            type: 'tripData',
            tripId,
            items: outcome.data.items,
            structureProblems: outcome.data.structureProblems,
          })
        }
        dispatch({ type: 'trips', trips: await manager.listTrips() })
        dispatch({ type: 'sync', syncState: { status: 'idle', lastSyncedAt: outcome.lastSyncedAt } })
      },

      setTabDirty: (tab: TabName, dirty: boolean) => {
        if (dirty) dirtyTabs.current.add(tab)
        else dirtyTabs.current.delete(tab)
      },

      dismissError: () => dispatch({ type: 'error', error: undefined }),
    }
  }, [auth, manager, run, refreshTripList, loadTrip, fail])

  const activeTrip = state.trips.find((t) => t.id === state.activeTripId)
  const items = (state.activeTripId && state.itemsByTrip[state.activeTripId]) || EMPTY_ITEMS
  const summary = activeTrip ? computeSummary(activeTrip, items) : undefined

  const summaryFor = useCallback(
    (tripId: string) => {
      const trip = state.trips.find((t) => t.id === tripId)
      if (!trip) return undefined
      return computeSummary(trip, state.itemsByTrip[tripId] ?? EMPTY_ITEMS)
    },
    [state.trips, state.itemsByTrip],
  )

  const value = useMemo(
    () => ({ state, actions, activeTrip, items, summary, summaryFor }),
    [state, actions, activeTrip, items, summary, summaryFor],
  )

  return <TripContext.Provider value={value}>{children}</TripContext.Provider>
}
