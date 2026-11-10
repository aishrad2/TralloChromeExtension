import type { TabName } from './tabs'

/** Dropdown values, copied verbatim from the master template's data validation. */
export const NECESSITY_LEVELS = [
  'Only need one for group',
  'Everyone needs to bring',
  'Optional',
] as const
export type Necessity = (typeof NECESSITY_LEVELS)[number]

export const EXPENSE_TYPES = ['Flight', 'Hotel', 'Bucket List', 'Packing List'] as const
export type ExpenseType = (typeof EXPENSE_TYPES)[number]

export const NOTE_CATEGORIES = ['Important', 'To do', 'Question'] as const
export type NoteCategory = (typeof NOTE_CATEGORIES)[number]

/**
 * Every row carries its own id so rows can be found after the user sorts or
 * inserts rows in Sheets. `link` is the template's URL column where it exists.
 *
 * Deviation from the UML: createdAt/updatedAt/addedBy are not kept. The
 * template has no columns for them, and v1 adds only the three column sets the
 * UI genuinely needs (Packed, Lat/Lng, and the expense ID/Date/Paid By block).
 */
export type TripItemBase = {
  rowId: string
  tab: TabName
  link?: string
}

export type Layover = {
  airport: string
  arriveTime?: string
  departTime?: string
}

export type FlightItem = TripItemBase & {
  tab: 'Flights'
  airlineFlight: string
  cost?: number
  departAirport?: string
  arriveAirport?: string
  /** Structured in the app, serialised into the template's single Layovers cell. */
  layovers: Layover[]
  departTime?: string
  arriveTime?: string
  notes?: string
}

export type HotelItem = TripItemBase & {
  tab: 'Hotels & Housing'
  name: string
  address?: string
  checkIn?: string
  checkOut?: string
  pricePerNight?: number
  beds?: number
  guests?: number
  notes?: string
}

export type BucketListItem = TripItemBase & {
  tab: 'Bucket List'
  name: string
  address?: string
  category?: string
  cost?: number
  notes?: string
  /** Written when known; the in-panel map is a later version. (added column) */
  lat?: number
  lng?: number
}

export type PackingItem = TripItemBase & {
  tab: 'Packing List'
  item: string
  category?: string
  necessity?: Necessity
  assignedTo?: string
  notes?: string
  /** (added column) Drives the "N% Complete" badge. */
  packed: boolean
}

export type ExpenseItem = TripItemBase & {
  tab: 'Budgeting & Expenses'
  expenseType?: ExpenseType
  cost?: number
  /** (added columns) */
  date?: string
  paidBy?: string
}

export type NoteItem = TripItemBase & {
  tab: 'Notes & Brainstorming'
  note: string
  category?: NoteCategory
  assignedTo?: string
}

export type TripItem =
  | FlightItem
  | HotelItem
  | BucketListItem
  | PackingItem
  | ExpenseItem
  | NoteItem

/** A TripItem before it has a rowId. */
export type NewItem<T extends TripItem = TripItem> = Omit<T, 'rowId'>

export type ItemForTab<T extends TabName> = Extract<TripItem, { tab: T }>

export type ItemsByTab = {
  [K in TabName]: ItemForTab<K>[]
}

export function emptyItemsByTab(): ItemsByTab {
  return {
    Flights: [],
    'Hotels & Housing': [],
    'Bucket List': [],
    'Packing List': [],
    'Budgeting & Expenses': [],
    'Notes & Brainstorming': [],
  }
}
