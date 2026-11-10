import type { AppError, HeaderValidationResult } from '../core/types/errors'
import type { ItemsByTab } from '../core/types/items'
import type { TabName } from '../core/types/tabs'
import type { Trip } from '../core/types/trip'

export type Screen =
  | { kind: 'signin' }
  | { kind: 'trips' }
  | { kind: 'new' }
  | { kind: 'edit'; tripId: string }
  | { kind: 'hub'; tripId: string }
  | { kind: 'module'; tripId: string; tab: TabName }

export type AuthState = 'unknown' | 'signed-out' | 'signing-in' | 'signed-in'

export type SyncState = {
  status: 'idle' | 'syncing' | 'error'
  lastSyncedAt?: string
  message?: string
}

export type AppState = {
  authState: AuthState
  email?: string
  trips: Trip[]
  activeTripId?: string
  /** Rows per trip, so a trip card can say what that trip still needs. */
  itemsByTrip: Record<string, ItemsByTab>
  structureProblems: HeaderValidationResult[]
  /** Set while a screen has nothing useful to show yet. */
  booting: boolean
  busy: boolean
  syncState: SyncState
  error?: AppError
  screen: Screen
}
