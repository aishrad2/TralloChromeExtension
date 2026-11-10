import { listSummary, money, plural, truncate } from './format'
import type { ItemsByTab } from './types/items'
import { TAB_DISPLAY, TAB_NAMES, type TabName } from './types/tabs'
import type { Trip, TripSummary } from './types/trip'

export type ModuleRowInfo = {
  tab: TabName
  title: string
  subtitle: string
  badge: string
  /** 'green' once the module has content, 'neutral' while it's empty. */
  tone: 'green' | 'neutral'
}

const PLACEHOLDER: Record<TabName, string> = {
  Flights: 'No flights logged yet',
  'Hotels & Housing': 'Where you’ll stay',
  'Bucket List': 'Places you want to see',
  'Packing List': 'Categories & assignments',
  'Budgeting & Expenses': 'Track spend against your budget',
  'Notes & Brainstorming': 'Reminders & group tasks',
}

function subtitleFor(tab: TabName, items: ItemsByTab, trip: Trip, summary: TripSummary): string {
  switch (tab) {
    case 'Flights': {
      const rows = items.Flights
      if (rows.length === 0) return PLACEHOLDER.Flights
      return `${plural(rows.length, 'flight')} logged (${truncate(
        listSummary(rows.map((f) => f.airlineFlight).filter(Boolean)),
        40,
      )})`
    }
    case 'Hotels & Housing': {
      const rows = items['Hotels & Housing']
      if (rows.length === 0) return PLACEHOLDER['Hotels & Housing']
      return truncate(listSummary(rows.map((h) => h.name).filter(Boolean)), 48)
    }
    case 'Bucket List': {
      const rows = items['Bucket List']
      if (rows.length === 0) return PLACEHOLDER['Bucket List']
      return truncate(listSummary(rows.map((b) => b.name).filter(Boolean)), 48)
    }
    case 'Packing List': {
      const rows = items['Packing List']
      if (rows.length === 0) return PLACEHOLDER['Packing List']
      const packed = rows.filter((p) => p.packed).length
      return `${packed} of ${plural(rows.length, 'item')} packed`
    }
    case 'Budgeting & Expenses':
      return `${money(summary.totalExpenses, trip.currency)} tracked of ${money(
        trip.budget,
        trip.currency,
      )} budget`
    case 'Notes & Brainstorming': {
      const rows = items['Notes & Brainstorming']
      if (rows.length === 0) return PLACEHOLDER['Notes & Brainstorming']
      return truncate(listSummary(rows.map((n) => n.note).filter(Boolean), 1), 48)
    }
  }
}

function badgeFor(tab: TabName, items: ItemsByTab, summary: TripSummary): string {
  if (tab === 'Packing List') {
    const percent = summary.packedPercent
    return percent === null ? 'not started' : `${percent}% packed`
  }
  if (tab === 'Budgeting & Expenses') {
    const count = items['Budgeting & Expenses'].length
    return count === 0 ? 'not started' : `${plural(count, 'expense')}`
  }
  const count = items[tab].length
  return count === 0 ? 'not started' : `${count} saved`
}

export function moduleRows(trip: Trip, items: ItemsByTab, summary: TripSummary): ModuleRowInfo[] {
  return TAB_NAMES.map((tab) => ({
    tab,
    title: TAB_DISPLAY[tab],
    subtitle: subtitleFor(tab, items, trip, summary),
    badge: badgeFor(tab, items, summary),
    tone: items[tab].length > 0 ? ('green' as const) : ('neutral' as const),
  }))
}
