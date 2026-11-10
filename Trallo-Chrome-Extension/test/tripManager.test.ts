import { beforeEach, describe, expect, it } from 'vitest'
import { installChromeStub } from './helpers/chromeStub'

installChromeStub()

const { TripManager } = await import('../src/services/TripManager')
const { InMemoryTripRepository } = await import('../src/services/InMemoryTripRepository')
const { TripCache } = await import('../src/services/TripCache')
const { DraftStore } = await import('../src/services/DraftStore')

type Manager = InstanceType<typeof TripManager>
type Repo = InstanceType<typeof InMemoryTripRepository>

const NEW_TRIP = {
  name: 'Spring Break',
  cities: ['Kyoto, Japan'],
  startDate: '2026-03-15',
  endDate: '2026-03-22',
  travelers: ['Alexis'],
  budget: 4000,
  currency: 'USD',
}

const FLIGHT = {
  tab: 'Flights' as const,
  airlineFlight: 'ANA NH 007',
  cost: 1284,
  layovers: [],
}

let repo: Repo
let manager: Manager

beforeEach(() => {
  installChromeStub()
  repo = new InMemoryTripRepository()
  manager = new TripManager(repo, new TripCache(), new DraftStore())
})

describe('creating and opening a trip', () => {
  it('creates the sheet, selects the trip, and starts empty', async () => {
    const trip = await manager.createTrip(NEW_TRIP)
    expect(trip.sheetFileId).toBeTruthy()
    expect(manager.getActiveTripId()).toBe(trip.id)

    const data = await manager.loadTripData(trip.id)
    expect(data.items.Flights).toHaveLength(0)
    expect(data.structureProblems).toEqual([])
  })

  it('repopulates trips and their rows from the cache on a cold start', async () => {
    const trip = await manager.createTrip(NEW_TRIP)
    await manager.loadTripData(trip.id)
    await manager.addItem(trip.id, FLIGHT)

    const second = new TripManager(repo, new TripCache(), new DraftStore())
    const primed = await second.primeFromCache()
    expect(primed.trips.map((t) => t.id)).toEqual([trip.id])
    expect(primed.activeTripId).toBe(trip.id)
    expect(primed.itemsByTrip[trip.id].Flights).toHaveLength(1)
  })
})

describe('rows', () => {
  it('gives every appended row an id and keeps it in the returned list', async () => {
    const trip = await manager.createTrip(NEW_TRIP)
    const { saved, items } = await manager.addItem(trip.id, FLIGHT)
    expect(saved.rowId).toMatch(/^fl_/)
    expect(items.Flights).toHaveLength(1)
  })

  it('updates and deletes by id, not by position', async () => {
    const trip = await manager.createTrip(NEW_TRIP)
    const first = await manager.addItem(trip.id, FLIGHT)
    const second = await manager.addItem(trip.id, { ...FLIGHT, airlineFlight: 'JL 002' })

    // Somebody sorts the sheet, so the rows swap places.
    repo.editInSheets(trip.id, (items) => items.Flights.reverse())

    const updated = await manager.updateItem(trip.id, 'Flights', first.saved.rowId, { cost: 999 })
    expect(updated.saved.rowId).toBe(first.saved.rowId)
    expect((updated.saved as { cost?: number }).cost).toBe(999)

    const after = await manager.deleteItem(trip.id, 'Flights', second.saved.rowId)
    expect(after.Flights.map((f) => f.rowId)).toEqual([first.saved.rowId])
  })
})

describe('sync', () => {
  it('does nothing when the sheet has not moved', async () => {
    const trip = await manager.createTrip(NEW_TRIP)
    await manager.loadTripData(trip.id)

    const result = await manager.syncIfChanged(trip.id)
    expect(result.changed).toBe(false)
    expect(result.error).toBeUndefined()
  })

  it('picks up an edit made directly in Sheets', async () => {
    const trip = await manager.createTrip(NEW_TRIP)
    await manager.loadTripData(trip.id)

    repo.editInSheets(trip.id, (items) =>
      items.Flights.push({ ...FLIGHT, rowId: 'fl_hand', tab: 'Flights' }),
    )

    const result = await manager.syncIfChanged(trip.id)
    expect(result.changed).toBe(true)
    expect(result.data?.items.Flights.map((f) => f.rowId)).toEqual(['fl_hand'])
  })

  it('never replaces a tab the user is editing', async () => {
    const trip = await manager.createTrip(NEW_TRIP)
    await manager.loadTripData(trip.id)

    repo.editInSheets(trip.id, (items) => {
      items.Flights.push({ ...FLIGHT, rowId: 'fl_hand', tab: 'Flights' })
      items['Bucket List'].push({ rowId: 'bl_hand', tab: 'Bucket List', name: 'teamLab' })
    })

    const result = await manager.syncIfChanged(trip.id, ['Flights'])
    expect(result.changed).toBe(true)
    expect(result.skippedTabs).toEqual(['Flights'])
    // The held-back tab keeps what the panel already had…
    expect(result.data?.items.Flights).toHaveLength(0)
    // …while every other tab refreshes normally.
    expect(result.data?.items['Bucket List']).toHaveLength(1)
  })

  it('reports an error without losing the last good sync time', async () => {
    const trip = await manager.createTrip(NEW_TRIP)
    await manager.loadTripData(trip.id)
    await repo.deleteTrip(trip.id)

    const result = await manager.syncIfChanged(trip.id)
    expect(result.changed).toBe(false)
    expect(result.error?.code).toBe('NOT_FOUND')
    expect(result.lastSyncedAt).toBeTruthy()
  })
})

describe('deleting a trip', () => {
  it('drops it from the list and moves selection on', async () => {
    const keep = await manager.createTrip(NEW_TRIP)
    const drop = await manager.createTrip({ ...NEW_TRIP, name: 'Tokyo' })
    await manager.listTrips()

    await manager.deleteTrip(drop.id)
    const trips = await manager.listTrips()
    expect(trips.map((t) => t.id)).toEqual([keep.id])
    expect(manager.getActiveTripId()).toBe(keep.id)
  })
})

describe('sharing', () => {
  it('rejects something that is not an email before calling Drive', async () => {
    const trip = await manager.createTrip(NEW_TRIP)
    await expect(manager.share(trip.id, 'not-an-email', 'writer')).rejects.toMatchObject({
      friendlyMessage: expect.stringContaining('email address'),
    })
    expect(repo.shares).toHaveLength(0)
  })

  it('passes a valid address through with the chosen role', async () => {
    const trip = await manager.createTrip(NEW_TRIP)
    await manager.share(trip.id, ' friend@example.com ', 'reader')
    expect(repo.shares).toEqual([{ tripId: trip.id, email: 'friend@example.com', role: 'reader' }])
  })
})
