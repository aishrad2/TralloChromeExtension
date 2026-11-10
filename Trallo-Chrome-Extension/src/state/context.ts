import { createContext } from 'react'
import type { ItemsByTab, NewItem, TripItem } from '../core/types/items'
import type { TabName } from '../core/types/tabs'
import type { NewTripInput, ShareRole, Trip, TripDetailsPatch, TripSummary } from '../core/types/trip'
import type { AppState } from './types'

export type TripActions = {
  signIn: () => Promise<void>
  signOut: () => Promise<void>

  goTrips: () => void
  goNewTrip: () => void
  goEditTrip: (tripId: string) => void
  openTrip: (tripId: string) => Promise<void>
  goHub: () => void
  openModule: (tab: TabName) => void

  createTrip: (input: NewTripInput) => Promise<void>
  updateTrip: (tripId: string, patch: TripDetailsPatch) => Promise<void>
  deleteTrip: (tripId: string) => Promise<void>

  addItem: (item: NewItem) => Promise<void>
  updateItem: (tab: TabName, rowId: string, patch: Partial<TripItem>) => Promise<void>
  deleteItem: (tab: TabName, rowId: string) => Promise<void>

  share: (email: string, role: ShareRole) => Promise<void>
  openSheet: (tab?: TabName) => Promise<void>
  refresh: () => Promise<void>
  /** Tells sync to leave a tab alone while its form has unsaved input. */
  setTabDirty: (tab: TabName, dirty: boolean) => void
  dismissError: () => void
}

export type TripContextValue = {
  state: AppState
  actions: TripActions
  activeTrip?: Trip
  /** Rows of the trip currently open. */
  items: ItemsByTab
  summary?: TripSummary
  summaryFor: (tripId: string) => TripSummary | undefined
}

export const TripContext = createContext<TripContextValue | null>(null)
