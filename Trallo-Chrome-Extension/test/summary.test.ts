import { describe, expect, it } from 'vitest'
import { computeSummary, compareTrips, tripStatus, whatsNextFor } from '../src/core/summary'
import { emptyItemsByTab, type ItemsByTab } from '../src/core/types/items'
import type { Trip } from '../src/core/types/trip'

function trip(overrides: Partial<Trip> = {}): Trip {
  return {
    id: 't1',
    sheetFileId: 'f1',
    sheetName: 'Trallo – Spring Break',
    name: 'Spring Break',
    cities: ['Kyoto, Japan'],
    startDate: '2026-03-15',
    endDate: '2026-03-22',
    travelers: [],
    budget: 4000,
    currency: 'USD',
    isActive: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    lastSyncedAt: '',
    lastModifiedTime: '',
    ...overrides,
  }
}

function withItems(mutate: (items: ItemsByTab) => void): ItemsByTab {
  const items = emptyItemsByTab()
  mutate(items)
  return items
}

const flight = {
  rowId: 'fl_1',
  tab: 'Flights' as const,
  airlineFlight: 'NH 007',
  layovers: [],
}
const hotel = { rowId: 'ho_1', tab: 'Hotels & Housing' as const, name: 'UNPLAN' }

describe('tripStatus', () => {
  it('is UPCOMING before, ACTIVE during, PAST after', () => {
    expect(tripStatus('2026-03-15', '2026-03-22', '2026-03-01')).toBe('UPCOMING')
    expect(tripStatus('2026-03-15', '2026-03-22', '2026-03-15')).toBe('ACTIVE')
    expect(tripStatus('2026-03-15', '2026-03-22', '2026-03-22')).toBe('ACTIVE')
    expect(tripStatus('2026-03-15', '2026-03-22', '2026-03-23')).toBe('PAST')
  })
})

describe('whatsNext', () => {
  it('asks for flights, then housing, then stops asking', () => {
    expect(whatsNextFor('UPCOMING', emptyItemsByTab())).toBe('Book Flights')
    expect(whatsNextFor('UPCOMING', withItems((i) => i.Flights.push(flight)))).toBe('Book Housing')
    expect(
      whatsNextFor(
        'UPCOMING',
        withItems((i) => {
          i.Flights.push(flight)
          i['Hotels & Housing'].push(hotel)
        }),
      ),
    ).toBe('Ready to Go')
  })

  it('lets the dates override the checklist once the trip is under way', () => {
    expect(whatsNextFor('ACTIVE', emptyItemsByTab())).toBe('Enjoy Your Trip')
    expect(whatsNextFor('PAST', emptyItemsByTab())).toBe('Trip Complete')
  })
})

describe('computeSummary', () => {
  it('derives days, countdown, spend and packing progress', () => {
    const items = withItems((i) => {
      i.Flights.push(flight)
      i['Budgeting & Expenses'].push(
        { rowId: 'ex_1', tab: 'Budgeting & Expenses', expenseType: 'Flight', cost: 1284 },
        { rowId: 'ex_2', tab: 'Budgeting & Expenses', expenseType: 'Hotel', cost: 1166 },
      )
      i['Packing List'].push(
        { rowId: 'pk_1', tab: 'Packing List', item: 'Camera', packed: true },
        { rowId: 'pk_2', tab: 'Packing List', item: 'Adapter', packed: true },
        { rowId: 'pk_3', tab: 'Packing List', item: 'Jacket', packed: true },
        { rowId: 'pk_4', tab: 'Packing List', item: 'Shoes', packed: false },
      )
    })

    const summary = computeSummary(trip(), items, '2026-03-01')
    expect(summary.daysCount).toBe(8)
    expect(summary.countdownDays).toBe(14)
    expect(summary.status).toBe('UPCOMING')
    expect(summary.whatsNext).toBe('Book Housing')
    expect(summary.totalExpenses).toBe(2450)
    expect(summary.budgetRemaining).toBe(1550)
    expect(summary.packedPercent).toBe(75)
    expect(summary.counts.Flights).toBe(1)
  })

  it('reports no packing progress for an empty list rather than 0%', () => {
    expect(computeSummary(trip(), emptyItemsByTab(), '2026-03-01').packedPercent).toBeNull()
  })

  it('goes negative when expenses pass the budget', () => {
    const items = withItems((i) =>
      i['Budgeting & Expenses'].push({
        rowId: 'ex_1',
        tab: 'Budgeting & Expenses',
        cost: 4500,
      }),
    )
    expect(computeSummary(trip(), items, '2026-03-01').budgetRemaining).toBe(-500)
  })
})

describe('compareTrips', () => {
  it('puts the trip under way first, then the soonest, then the finished', () => {
    const active = trip({ id: 'a', startDate: '2026-02-25', endDate: '2026-03-05' })
    const soon = trip({ id: 'b', startDate: '2026-03-15', endDate: '2026-03-22' })
    const later = trip({ id: 'c', startDate: '2026-06-01', endDate: '2026-06-10' })
    const done = trip({ id: 'd', startDate: '2025-09-12', endDate: '2025-12-20' })

    const order = [later, done, soon, active]
      .sort((x, y) => compareTrips(x, y, '2026-03-01'))
      .map((t) => t.id)
    expect(order).toEqual(['a', 'b', 'c', 'd'])
  })
})
