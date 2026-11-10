import type { HeaderValidationResult } from '../core/types/errors'
import type { ItemForTab, ItemsByTab, NewItem, TripItem } from '../core/types/items'
import type { TabName } from '../core/types/tabs'
import type { NewTripInput, ShareRole, Trip, TripDetailsPatch } from '../core/types/trip'

/**
 * A trip spotted in storage before its details have been read. Carries just
 * enough to decide whether the cached copy is still current.
 */
export type TripRef = {
  tripId?: string
  sheetFileId: string
  sheetName: string
  modifiedTime: string
}

/**
 * The seam between Trallo and Google. TripManager is written against this
 * interface only; SheetsTripRepository is the sole implementation that knows
 * Sheets and Drive exist, and InMemoryTripRepository backs the tests.
 */
export interface TripRepository {
  createTripFromTemplate(input: NewTripInput): Promise<Trip>
  listTripRefs(): Promise<TripRef[]>
  loadTripFromRef(ref: TripRef): Promise<Trip>
  listTrips(): Promise<Trip[]>
  loadTrip(tripId: string): Promise<Trip>
  updateTripDetails(tripId: string, patch: TripDetailsPatch): Promise<Trip>
  /** Moves the spreadsheet to Drive's trash; it is not erased. */
  deleteTrip(tripId: string): Promise<void>

  readTab<T extends TabName>(tripId: string, tab: T): Promise<ItemForTab<T>[]>
  readAllTabs(tripId: string): Promise<ItemsByTab>
  appendRow(tripId: string, tab: TabName, item: NewItem): Promise<TripItem>
  updateRowById(
    tripId: string,
    tab: TabName,
    rowId: string,
    patch: Partial<TripItem>,
  ): Promise<TripItem>
  deleteRowById(tripId: string, tab: TabName, rowId: string): Promise<void>

  getModifiedTime(tripId: string): Promise<string>
  validateHeaders(tripId: string): Promise<HeaderValidationResult[]>
  share(tripId: string, email: string, role: ShareRole): Promise<void>
  getSheetUrl(tripId: string, tab?: TabName): Promise<string>
}
