import { nowISO } from '../core/dates'
import { compareTrips, computeSummary } from '../core/summary'
import { appError, type AppError, type HeaderValidationResult } from '../core/types/errors'
import { emptyItemsByTab, type ItemsByTab, type NewItem, type TripItem } from '../core/types/items'
import type { TabName } from '../core/types/tabs'
import type {
  NewTripInput,
  ShareRole,
  SyncResult,
  Trip,
  TripDetailsPatch,
  TripSummary,
} from '../core/types/trip'
import type { DraftStore } from './DraftStore'
import type { TripCache } from './TripCache'
import type { TripRepository } from './TripRepository'

export type TripData = {
  trip: Trip
  items: ItemsByTab
  /** Populated when the sheet's header row no longer matches the schema. */
  structureProblems: HeaderValidationResult[]
}

export type SyncOutcome = SyncResult & {
  data?: TripData
  /** Tabs left alone because the user was mid-edit in them. */
  skippedTabs: TabName[]
}

/**
 * The single entry point for the UI. It owns the cache-then-network policy and
 * the rule that a refresh never clobbers a form the user is editing. It knows
 * nothing about Google: everything goes through TripRepository.
 */
export class TripManager {
  private readonly data = new Map<string, TripData>()
  private readonly validated = new Set<string>()
  private trips: Trip[] = []
  private activeTripId?: string

  private readonly repo: TripRepository
  private readonly cache: TripCache
  readonly drafts: DraftStore

  constructor(repo: TripRepository, cache: TripCache, drafts: DraftStore) {
    this.repo = repo
    this.cache = cache
    this.drafts = drafts
  }

  // ---------------------------------------------------------------- trips

  /**
   * Cached trips and their rows, painted immediately on open before any
   * network call. Rows matter here and not just on the trip screen: "What's
   * Next" on a trip card is derived from whether flights and housing exist.
   */
  async primeFromCache(): Promise<{
    trips: Trip[]
    activeTripId?: string
    itemsByTrip: Record<string, ItemsByTab>
  }> {
    this.trips = await this.cache.getTrips()
    this.activeTripId = await this.cache.getActiveTripId()
    this.applyActiveFlag()

    const itemsByTrip: Record<string, ItemsByTab> = {}
    await Promise.all(
      this.trips.map(async (trip) => {
        const stored = await this.cache.get(trip.id)
        if (!stored) return
        this.data.set(trip.id, { trip: stored.trip, items: stored.items, structureProblems: [] })
        itemsByTrip[trip.id] = stored.items
      }),
    )
    return { trips: this.sorted(), activeTripId: this.activeTripId, itemsByTrip }
  }

  /**
   * Re-reads the trip list from Drive. Only trips whose modifiedTime moved are
   * re-read from their sheet, so the steady-state cost is one Drive request.
   */
  async listTrips(): Promise<Trip[]> {
    const refs = await this.repo.listTripRefs()
    const byId = new Map(this.trips.map((t) => [t.id, t]))

    const loaded = await Promise.all(
      refs.map(async (ref) => {
        const cached = ref.tripId ? byId.get(ref.tripId) : undefined
        if (cached && cached.lastModifiedTime === ref.modifiedTime) {
          return { ...cached, sheetName: ref.sheetName }
        }
        return this.repo.loadTripFromRef(ref)
      }),
    )

    // Drop cached trips whose sheet is gone (trashed, or deleted in Drive).
    const liveIds = new Set(loaded.map((t) => t.id))
    for (const id of [...this.data.keys()]) if (!liveIds.has(id)) this.data.delete(id)

    this.trips = loaded
    this.applyActiveFlag()
    await this.cache.setTrips(this.trips)
    return this.sorted()
  }

  getTrip(tripId: string): Trip | undefined {
    return this.trips.find((t) => t.id === tripId)
  }

  async createTrip(input: NewTripInput): Promise<Trip> {
    const trip = await this.repo.createTripFromTemplate(input)
    this.trips = [...this.trips.filter((t) => t.id !== trip.id), trip]
    this.data.set(trip.id, { trip, items: emptyItemsByTab(), structureProblems: [] })
    await this.setActiveTrip(trip.id)
    await this.cache.setTrips(this.trips)
    await this.writeCache(trip.id)
    return trip
  }

  async updateTrip(tripId: string, patch: TripDetailsPatch): Promise<Trip> {
    const trip = await this.repo.updateTripDetails(tripId, patch)
    this.trips = this.trips.map((t) => (t.id === tripId ? { ...trip, isActive: t.isActive } : t))
    const existing = this.data.get(tripId)
    if (existing) this.data.set(tripId, { ...existing, trip })
    await this.cache.setTrips(this.trips)
    await this.writeCache(tripId)
    return trip
  }

  async deleteTrip(tripId: string): Promise<void> {
    await this.repo.deleteTrip(tripId)
    this.trips = this.trips.filter((t) => t.id !== tripId)
    this.data.delete(tripId)
    this.validated.delete(tripId)
    await this.cache.clear(tripId)
    await this.cache.setTrips(this.trips)
    if (this.activeTripId === tripId) await this.setActiveTrip(this.trips[0]?.id)
  }

  async setActiveTrip(tripId: string | undefined): Promise<void> {
    this.activeTripId = tripId
    this.applyActiveFlag()
    await this.cache.setActiveTripId(tripId)
  }

  getActiveTripId(): string | undefined {
    return this.activeTripId
  }

  // ----------------------------------------------------------------- data

  /** Cached rows for a trip, or empty ones if it has never been opened. */
  async cachedData(tripId: string): Promise<TripData | undefined> {
    const live = this.data.get(tripId)
    if (live) return live
    const stored = await this.cache.get(tripId)
    if (!stored) return undefined
    const data: TripData = { trip: stored.trip, items: stored.items, structureProblems: [] }
    this.data.set(tripId, data)
    return data
  }

  async loadTripData(tripId: string): Promise<TripData> {
    // Trip details first: that call also captures modifiedTime, so an edit that
    // lands while the rows are being read is still seen by the next poll
    // rather than being silently swallowed.
    const trip = await this.repo.loadTrip(tripId)
    const items = await this.repo.readAllTabs(tripId)
    const structureProblems = await this.checkStructureOnce(tripId)

    const refreshed: Trip = { ...trip, lastSyncedAt: nowISO() }
    const data: TripData = { trip: refreshed, items, structureProblems }
    this.data.set(tripId, data)
    this.trips = this.trips.map((t) => (t.id === tripId ? { ...refreshed, isActive: t.isActive } : t))
    await this.cache.setTrips(this.trips)
    await this.writeCache(tripId)
    return data
  }

  private async checkStructureOnce(tripId: string): Promise<HeaderValidationResult[]> {
    if (this.validated.has(tripId)) return this.data.get(tripId)?.structureProblems ?? []
    const results = await this.repo.validateHeaders(tripId)
    this.validated.add(tripId)
    return results.filter((r) => !r.ok)
  }

  // ----------------------------------------------------------------- rows

  async addItem(tripId: string, item: NewItem): Promise<{ saved: TripItem; items: ItemsByTab }> {
    const saved = await this.repo.appendRow(tripId, item.tab, item)
    const items = await this.mutate(tripId, (draft) => {
      ;(draft[item.tab] as TripItem[]).push(saved)
    })
    return { saved, items }
  }

  async updateItem(
    tripId: string,
    tab: TabName,
    rowId: string,
    patch: Partial<TripItem>,
  ): Promise<{ saved: TripItem; items: ItemsByTab }> {
    const saved = await this.repo.updateRowById(tripId, tab, rowId, patch)
    const items = await this.mutate(tripId, (draft) => {
      const rows = draft[tab] as TripItem[]
      const i = rows.findIndex((r) => r.rowId === rowId)
      if (i >= 0) rows[i] = saved
      else rows.push(saved)
    })
    return { saved, items }
  }

  async deleteItem(tripId: string, tab: TabName, rowId: string): Promise<ItemsByTab> {
    await this.repo.deleteRowById(tripId, tab, rowId)
    return this.mutate(tripId, (draft) => {
      const rows = draft[tab] as TripItem[]
      const i = rows.findIndex((r) => r.rowId === rowId)
      if (i >= 0) rows.splice(i, 1)
    })
  }

  private async mutate(tripId: string, apply: (draft: ItemsByTab) => void): Promise<ItemsByTab> {
    const current = (await this.cachedData(tripId)) ?? {
      trip: this.getTrip(tripId)!,
      items: emptyItemsByTab(),
      structureProblems: [],
    }
    const items: ItemsByTab = { ...current.items }
    for (const key of Object.keys(items) as TabName[]) {
      items[key] = [...items[key]] as never
    }
    apply(items)

    const trip: Trip = {
      ...current.trip,
      lastSyncedAt: nowISO(),
      lastModifiedTime: await this.repo.getModifiedTime(tripId).catch(() => current.trip.lastModifiedTime),
    }
    this.data.set(tripId, { ...current, trip, items })
    this.trips = this.trips.map((t) => (t.id === tripId ? { ...trip, isActive: t.isActive } : t))
    await this.writeCache(tripId)
    return items
  }

  // ----------------------------------------------------------------- sync

  /**
   * One Drive request to compare modifiedTime; the tabs are re-read only if it
   * moved. Tabs named in `dirtyTabs` keep their current rows, because replacing
   * a list under a half-filled form is the one thing sync must never do.
   */
  async syncIfChanged(tripId: string, dirtyTabs: TabName[] = []): Promise<SyncOutcome> {
    const current = await this.cachedData(tripId)
    try {
      const modifiedTime = await this.repo.getModifiedTime(tripId)
      if (current && modifiedTime && modifiedTime === current.trip.lastModifiedTime) {
        const trip = { ...current.trip, lastSyncedAt: nowISO() }
        this.data.set(tripId, { ...current, trip })
        return { changed: false, lastSyncedAt: trip.lastSyncedAt, skippedTabs: [] }
      }
      return this.refresh(tripId, dirtyTabs)
    } catch (err) {
      return {
        changed: false,
        lastSyncedAt: current?.trip.lastSyncedAt ?? '',
        error: err as AppError,
        skippedTabs: [],
      }
    }
  }

  async forceRefresh(tripId: string, dirtyTabs: TabName[] = []): Promise<SyncOutcome> {
    this.validated.delete(tripId)
    try {
      return await this.refresh(tripId, dirtyTabs)
    } catch (err) {
      const current = await this.cachedData(tripId)
      return {
        changed: false,
        lastSyncedAt: current?.trip.lastSyncedAt ?? '',
        error: err as AppError,
        skippedTabs: [],
      }
    }
  }

  private async refresh(tripId: string, dirtyTabs: TabName[]): Promise<SyncOutcome> {
    const before = await this.cachedData(tripId)
    const fresh = await this.loadTripData(tripId)

    if (before && dirtyTabs.length > 0) {
      const merged: ItemsByTab = { ...fresh.items }
      for (const tab of dirtyTabs) merged[tab] = before.items[tab] as never
      const data: TripData = { ...fresh, items: merged }
      this.data.set(tripId, data)
      await this.writeCache(tripId)
      return { changed: true, lastSyncedAt: data.trip.lastSyncedAt, data, skippedTabs: dirtyTabs }
    }

    return {
      changed: true,
      lastSyncedAt: fresh.trip.lastSyncedAt,
      data: fresh,
      skippedTabs: [],
    }
  }

  // ---------------------------------------------------------------- misc

  getSummary(tripId: string): TripSummary | undefined {
    const data = this.data.get(tripId)
    if (!data) return undefined
    return computeSummary(data.trip, data.items)
  }

  async share(tripId: string, email: string, role: ShareRole): Promise<void> {
    const trimmed = email.trim()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      throw appError('UNKNOWN', 'Invalid email', 'That doesn’t look like an email address.')
    }
    await this.repo.share(tripId, trimmed, role)
  }

  getSheetUrl(tripId: string, tab?: TabName): Promise<string> {
    return this.repo.getSheetUrl(tripId, tab)
  }

  // -------------------------------------------------------------- private

  private applyActiveFlag(): void {
    this.trips = this.trips.map((t) => ({ ...t, isActive: t.id === this.activeTripId }))
  }

  private sorted(): Trip[] {
    return [...this.trips].sort((a, b) => compareTrips(a, b))
  }

  private async writeCache(tripId: string): Promise<void> {
    const data = this.data.get(tripId)
    if (!data) return
    await this.cache.set(tripId, {
      trip: data.trip,
      items: data.items,
      lastModifiedTime: data.trip.lastModifiedTime,
    })
  }
}
