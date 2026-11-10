import type { ItemsByTab } from '../core/types/items'
import type { Trip } from '../core/types/trip'

export type CachedTrip = {
  trip: Trip
  items: ItemsByTab
  /** Drive modifiedTime this snapshot was read at. */
  lastModifiedTime: string
}

const TRIPS_KEY = 'trallo:trips'
const ACTIVE_KEY = 'trallo:activeTripId'
const tripKey = (tripId: string) => `trallo:trip:${tripId}`

async function read<T>(key: string): Promise<T | undefined> {
  try {
    const bag = await chrome.storage.local.get(key)
    return bag[key] as T | undefined
  } catch {
    return undefined
  }
}

async function write(key: string, value: unknown): Promise<void> {
  try {
    await chrome.storage.local.set({ [key]: value })
  } catch {
    /* a full or unavailable quota must not break the UI; the sheet is the truth */
  }
}

/**
 * chrome.storage.local snapshot of what the sheets held last time. It exists so
 * the panel paints instantly on open and so a poll that finds nothing changed
 * costs exactly one Drive request. The sheet always wins on conflict.
 */
export class TripCache {
  async getTrips(): Promise<Trip[]> {
    return (await read<Trip[]>(TRIPS_KEY)) ?? []
  }

  async setTrips(trips: Trip[]): Promise<void> {
    await write(TRIPS_KEY, trips)
  }

  async get(tripId: string): Promise<CachedTrip | undefined> {
    return read<CachedTrip>(tripKey(tripId))
  }

  async set(tripId: string, value: CachedTrip): Promise<void> {
    await write(tripKey(tripId), value)
  }

  async clear(tripId: string): Promise<void> {
    try {
      await chrome.storage.local.remove(tripKey(tripId))
    } catch {
      /* ignore */
    }
  }

  async getActiveTripId(): Promise<string | undefined> {
    return read<string>(ACTIVE_KEY)
  }

  async setActiveTripId(tripId: string | undefined): Promise<void> {
    if (tripId) await write(ACTIVE_KEY, tripId)
    else await chrome.storage.local.remove(ACTIVE_KEY).catch(() => undefined)
  }
}
