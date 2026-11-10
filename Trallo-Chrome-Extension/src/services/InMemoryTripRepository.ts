import { nowISO } from '../core/dates'
import { newRowId, newTripId } from '../core/ids'
import { ALL_TAB_SPECS } from '../core/sheets/schema'
import { appError, type HeaderValidationResult } from '../core/types/errors'
import {
  emptyItemsByTab,
  type ItemForTab,
  type ItemsByTab,
  type NewItem,
  type TripItem,
} from '../core/types/items'
import type { TabName } from '../core/types/tabs'
import type { NewTripInput, ShareRole, Trip, TripDetailsPatch } from '../core/types/trip'
import type { TripRef, TripRepository } from './TripRepository'

type Record_ = { trip: Trip; items: ItemsByTab; modifiedTime: string }

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

/**
 * A repository that behaves like the Sheets one without the network. Tests use
 * it; the extension never does.
 */
export class InMemoryTripRepository implements TripRepository {
  private readonly store = new Map<string, Record_>()
  private tick = 0
  readonly shares: { tripId: string; email: string; role: ShareRole }[] = []

  private bump(record: Record_): void {
    this.tick += 1
    record.modifiedTime = new Date(Date.UTC(2026, 0, 1, 0, 0, this.tick)).toISOString()
    record.trip.lastModifiedTime = record.modifiedTime
  }

  private require(tripId: string): Record_ {
    const record = this.store.get(tripId)
    if (!record) throw appError('NOT_FOUND', `No trip ${tripId}`)
    return record
  }

  async createTripFromTemplate(input: NewTripInput): Promise<Trip> {
    const id = newTripId()
    const trip: Trip = {
      id,
      sheetFileId: `file_${id}`,
      sheetName: `Trallo – ${input.name}`,
      ...input,
      isActive: true,
      createdAt: nowISO(),
      lastSyncedAt: nowISO(),
      lastModifiedTime: '',
    }
    const record: Record_ = { trip, items: emptyItemsByTab(), modifiedTime: '' }
    this.store.set(id, record)
    this.bump(record)
    return clone(trip)
  }

  async listTripRefs(): Promise<TripRef[]> {
    return [...this.store.values()].map((r) => ({
      tripId: r.trip.id,
      sheetFileId: r.trip.sheetFileId,
      sheetName: r.trip.sheetName,
      modifiedTime: r.modifiedTime,
    }))
  }

  async loadTripFromRef(ref: TripRef): Promise<Trip> {
    return this.loadTrip(ref.tripId ?? '')
  }

  async listTrips(): Promise<Trip[]> {
    return [...this.store.values()].map((r) => clone(r.trip))
  }

  async loadTrip(tripId: string): Promise<Trip> {
    return clone(this.require(tripId).trip)
  }

  async updateTripDetails(tripId: string, patch: TripDetailsPatch): Promise<Trip> {
    const record = this.require(tripId)
    record.trip = { ...record.trip, ...patch }
    if (patch.name) record.trip.sheetName = `Trallo – ${patch.name}`
    this.bump(record)
    return clone(record.trip)
  }

  async deleteTrip(tripId: string): Promise<void> {
    this.require(tripId)
    this.store.delete(tripId)
  }

  async readTab<T extends TabName>(tripId: string, tab: T): Promise<ItemForTab<T>[]> {
    return clone(this.require(tripId).items[tab]) as ItemForTab<T>[]
  }

  async readAllTabs(tripId: string): Promise<ItemsByTab> {
    return clone(this.require(tripId).items)
  }

  async appendRow(tripId: string, tab: TabName, item: NewItem): Promise<TripItem> {
    const record = this.require(tripId)
    const saved = { ...item, tab, rowId: newRowId(tab) } as TripItem
    ;(record.items[tab] as TripItem[]).push(clone(saved))
    this.bump(record)
    return saved
  }

  async updateRowById(
    tripId: string,
    tab: TabName,
    rowId: string,
    patch: Partial<TripItem>,
  ): Promise<TripItem> {
    const record = this.require(tripId)
    const rows = record.items[tab] as TripItem[]
    const i = rows.findIndex((r) => r.rowId === rowId)
    if (i < 0) throw appError('NOT_FOUND', `Row ${rowId} is no longer in ${tab}`)
    rows[i] = { ...rows[i], ...patch, rowId, tab } as TripItem
    this.bump(record)
    return clone(rows[i])
  }

  async deleteRowById(tripId: string, tab: TabName, rowId: string): Promise<void> {
    const record = this.require(tripId)
    const rows = record.items[tab] as TripItem[]
    const i = rows.findIndex((r) => r.rowId === rowId)
    if (i < 0) throw appError('NOT_FOUND', `Row ${rowId} is no longer in ${tab}`)
    rows.splice(i, 1)
    this.bump(record)
  }

  async getModifiedTime(tripId: string): Promise<string> {
    return this.require(tripId).modifiedTime
  }

  async validateHeaders(tripId: string): Promise<HeaderValidationResult[]> {
    this.require(tripId)
    return ALL_TAB_SPECS.map((spec) => ({ ok: true, tab: spec.name, missingColumns: [] }))
  }

  async share(tripId: string, email: string, role: ShareRole): Promise<void> {
    this.require(tripId)
    this.shares.push({ tripId, email, role })
  }

  async getSheetUrl(tripId: string, tab?: TabName): Promise<string> {
    const record = this.require(tripId)
    return `https://docs.google.com/spreadsheets/d/${record.trip.sheetFileId}/edit${tab ? `#${tab}` : ''}`
  }

  /** Test helper: simulate somebody editing the sheet directly. */
  editInSheets(tripId: string, mutate: (items: ItemsByTab) => void): void {
    const record = this.require(tripId)
    mutate(record.items)
    this.bump(record)
  }
}
