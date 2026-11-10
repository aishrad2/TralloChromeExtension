import type { TabName } from './tabs'

export type TripStatus = 'ACTIVE' | 'UPCOMING' | 'PAST'

export type WhatsNext =
  | 'Book Flights'
  | 'Book Housing'
  | 'Ready to Go'
  | 'Enjoy Your Trip'
  | 'Trip Complete'

export type Trip = {
  id: string
  /** Drive file id of the spreadsheet backing this trip. */
  sheetFileId: string
  /** Spreadsheet file name, shown in the "Live Sheet:" footer. (added) */
  sheetName: string
  name: string
  cities: string[]
  /** YYYY-MM-DD, local calendar days. */
  startDate: string
  endDate: string
  travelers: string[]
  budget: number
  currency: string
  /** True for the trip the user currently has selected. Lives in local storage, not the sheet. */
  isActive: boolean
  /** ISO timestamp. (added) */
  createdAt: string
  /** ISO timestamp of the last successful read. */
  lastSyncedAt: string
  /** Drive modifiedTime of the spreadsheet as of the last read; drives polling. (added) */
  lastModifiedTime: string
}

export type NewTripInput = {
  name: string
  cities: string[]
  startDate: string
  endDate: string
  travelers: string[]
  budget: number
  currency: string
}

export type TripDetailsPatch = Partial<
  Pick<Trip, 'name' | 'cities' | 'startDate' | 'endDate' | 'travelers' | 'budget' | 'currency'>
>

/** Derived on every render from the trip plus its rows. Never written to the sheet. */
export type TripSummary = {
  daysCount: number
  countdownDays: number
  status: TripStatus
  whatsNext: WhatsNext
  totalExpenses: number
  budgetRemaining: number
  /** Share of packing-list rows marked Packed, 0-100. Null when the list is empty. */
  packedPercent: number | null
  counts: Record<TabName, number>
}

export type SyncResult = {
  changed: boolean
  lastSyncedAt: string
  error?: import('./errors').AppError
}

export type ShareRole = 'reader' | 'writer'
