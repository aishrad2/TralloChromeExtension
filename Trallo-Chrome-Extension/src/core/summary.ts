import { countdownDays, daysBetween, tripLengthDays, todayISO } from './dates'
import type { ItemsByTab } from './types/items'
import { TAB_NAMES, type TabName } from './types/tabs'
import type { Trip, TripStatus, TripSummary, WhatsNext } from './types/trip'

export function tripStatus(startDate: string, endDate: string, today: string): TripStatus {
  if (endDate && daysBetween(endDate, today) > 0) return 'PAST'
  if (startDate && daysBetween(startDate, today) >= 0) return 'ACTIVE'
  return 'UPCOMING'
}

export function whatsNextFor(status: TripStatus, items: ItemsByTab): WhatsNext {
  if (status === 'PAST') return 'Trip Complete'
  if (status === 'ACTIVE') return 'Enjoy Your Trip'
  if (items.Flights.length === 0) return 'Book Flights'
  if (items['Hotels & Housing'].length === 0) return 'Book Housing'
  return 'Ready to Go'
}

/** The tab the "What's Next" card should jump to, or null when there's nothing to do. */
export function whatsNextTarget(next: WhatsNext): TabName | null {
  if (next === 'Book Flights') return 'Flights'
  if (next === 'Book Housing') return 'Hotels & Housing'
  return null
}

export function totalExpenses(items: ItemsByTab): number {
  return items['Budgeting & Expenses'].reduce((sum, e) => sum + (e.cost ?? 0), 0)
}

export function packedPercent(items: ItemsByTab): number | null {
  const list = items['Packing List']
  if (list.length === 0) return null
  const packed = list.filter((i) => i.packed).length
  return Math.round((packed / list.length) * 100)
}

export function computeSummary(
  trip: Trip,
  items: ItemsByTab,
  today: string = todayISO(),
): TripSummary {
  const status = tripStatus(trip.startDate, trip.endDate, today)
  const spent = totalExpenses(items)
  const counts = Object.fromEntries(TAB_NAMES.map((t) => [t, items[t].length])) as Record<
    TabName,
    number
  >
  return {
    daysCount: tripLengthDays(trip.startDate, trip.endDate),
    countdownDays: countdownDays(trip.startDate, today),
    status,
    whatsNext: whatsNextFor(status, items),
    totalExpenses: spent,
    budgetRemaining: (trip.budget ?? 0) - spent,
    packedPercent: packedPercent(items),
    counts,
  }
}

/** Sorts My Trips the way the wireframe shows it: active, then soonest upcoming, then past. */
export function compareTrips(a: Trip, b: Trip, today: string = todayISO()): number {
  const rank = { ACTIVE: 0, UPCOMING: 1, PAST: 2 }
  const ra = rank[tripStatus(a.startDate, a.endDate, today)]
  const rb = rank[tripStatus(b.startDate, b.endDate, today)]
  if (ra !== rb) return ra - rb
  if (ra === 2) return b.startDate.localeCompare(a.startDate)
  return a.startDate.localeCompare(b.startDate)
}
