import { beforeEach, describe, expect, it } from 'vitest'
import { SheetsTripRepository } from '../src/services/SheetsTripRepository'
import type { GoogleApiClient } from '../src/services/GoogleApiClient'
import type { Trip } from '../src/core/types/trip'

type Call = { url: string; options: { method?: string; query?: unknown; body?: unknown } }

const TRIP: Trip = {
  id: 'trip_1',
  sheetFileId: 'file_1',
  sheetName: 'Trallo – Spring Break',
  name: 'Spring Break',
  cities: ['Kyoto, Japan'],
  startDate: '2026-03-15',
  endDate: '2026-03-22',
  travelers: [],
  budget: 4000,
  currency: 'USD',
  isActive: true,
  createdAt: '',
  lastSyncedAt: '',
  lastModifiedTime: '',
}

/**
 * The Flights tab as a person might leave it: an extra column of their own in
 * the middle, and the rows sorted so positions no longer match insert order.
 */
const FLIGHT_HEADERS = [
  'ID',
  'URL',
  'Airline & Flight #',
  'Cost ($)',
  'Who booked it',
  'Departing Airport',
  'Arriving Airport',
  'Layovers',
  'Departure Date & Time (Local)',
  'Arrival Date & Time (Local)',
  'Notes',
]

const FLIGHT_ROWS = [
  FLIGHT_HEADERS,
  ['fl_zzz', '', 'JL 002', 980, 'Sam', 'SFO', 'HND', '', '', '', ''],
  ['fl_aaa', '', 'ANA NH 007', 1284, 'Alexis', 'SFO', 'HND', 'NRT 10:30 → 12:45', '', '', 'Window'],
]

class FakeApi {
  readonly calls: Call[] = []
  flightRows: unknown[][] = FLIGHT_ROWS.map((r) => [...r])

  async request(url: string, options: Call['options'] = {}): Promise<unknown> {
    this.calls.push({ url, options })

    if (url.includes('/values/') && url.includes('Flights')) {
      return { values: this.flightRows }
    }
    if (url.includes('/values:batchUpdate')) {
      return { totalUpdatedCells: 1 }
    }
    if (url.includes(':batchUpdate')) {
      return { replies: [] }
    }
    if (url.includes('fields=sheets.properties') || options.query) {
      const query = options.query as { fields?: string } | undefined
      if (query?.fields === 'sheets.properties(sheetId,title)') {
        return { sheets: [{ properties: { sheetId: 1, title: 'Flights' } }] }
      }
    }
    return {}
  }

  lastBody(match: string): Record<string, unknown> {
    const call = [...this.calls].reverse().find((c) => c.url.includes(match) && c.options.body)
    if (!call) throw new Error(`no call matching ${match}`)
    return call.options.body as Record<string, unknown>
  }
}

let api: FakeApi
let repo: SheetsTripRepository

beforeEach(() => {
  api = new FakeApi()
  repo = new SheetsTripRepository(api as unknown as GoogleApiClient)
  repo.prime([TRIP])
})

describe('updating a row by id', () => {
  it('finds the row wherever the sort left it and writes only what changed', async () => {
    const saved = await repo.updateRowById(TRIP.id, 'Flights', 'fl_aaa', { cost: 1100 })
    expect(saved.rowId).toBe('fl_aaa')

    const body = api.lastBody('/values:batchUpdate') as {
      valueInputOption: string
      data: { range: string; values: unknown[][] }[]
    }
    expect(body.valueInputOption).toBe('RAW')
    // fl_aaa is the second data row, so row 3; Cost ($) sits in column D even
    // though a column of the user's own comes right after it.
    expect(body.data).toEqual([{ range: "'Flights'!D3", values: [[1100]] }])
  })

  it('keeps fields it was not asked to change', async () => {
    const saved = (await repo.updateRowById(TRIP.id, 'Flights', 'fl_aaa', {
      notes: 'Aisle',
    })) as { airlineFlight: string; cost?: number; notes?: string }
    expect(saved.airlineFlight).toBe('ANA NH 007')
    expect(saved.cost).toBe(1284)
    expect(saved.notes).toBe('Aisle')
  })

  it('refuses to guess when the row is gone', async () => {
    await expect(repo.updateRowById(TRIP.id, 'Flights', 'fl_missing', {})).rejects.toMatchObject({
      code: 'NOT_FOUND',
    })
  })
})

describe('deleting a row by id', () => {
  it('deletes the row the id points at, not a fixed position', async () => {
    await repo.deleteRowById(TRIP.id, 'Flights', 'fl_zzz')
    const body = api.lastBody(':batchUpdate') as {
      requests: { deleteDimension: { range: { startIndex: number; endIndex: number } } }[]
    }
    // fl_zzz is the first data row: sheet row 2, zero-based index 1.
    expect(body.requests[0].deleteDimension.range).toMatchObject({ startIndex: 1, endIndex: 2 })
  })
})

describe('reading a tab', () => {
  it('parses rows through the header row, extra columns and all', async () => {
    const flights = await repo.readTab(TRIP.id, 'Flights')
    expect(flights.map((f) => f.rowId)).toEqual(['fl_zzz', 'fl_aaa'])
    expect(flights[1].cost).toBe(1284)
    expect(flights[1].layovers).toEqual([
      { airport: 'NRT', arriveTime: '10:30', departTime: '12:45' },
    ])
  })

  it('gives a hand-typed row an id and writes that id back', async () => {
    api.flightRows.push(['', '', 'Hand-typed', '', '', '', '', '', '', '', ''])

    const flights = await repo.readTab(TRIP.id, 'Flights')
    const added = flights.find((f) => f.airlineFlight === 'Hand-typed')!
    expect(added.rowId).toMatch(/^fl_/)

    const body = api.lastBody('/values:batchUpdate') as {
      data: { range: string; values: unknown[][] }[]
    }
    expect(body.data).toEqual([{ range: "'Flights'!A4", values: [[added.rowId]] }])
  })

  it('ignores blank spacer rows', async () => {
    api.flightRows.push(['', '', '', '', '', '', '', '', '', '', ''])
    const flights = await repo.readTab(TRIP.id, 'Flights')
    expect(flights).toHaveLength(2)
  })
})

describe('appending a row', () => {
  it('builds a full-width row and leaves the user’s own column empty', async () => {
    const saved = await repo.appendRow(TRIP.id, 'Flights', {
      tab: 'Flights',
      airlineFlight: 'UA 837',
      cost: 1050,
      layovers: [],
    })

    const body = api.lastBody(':append') as { values: unknown[][] }
    const row = body.values[0]
    expect(row[0]).toBe(saved.rowId)
    expect(row[2]).toBe('UA 837')
    expect(row[3]).toBe(1050)
    expect(row[4]).toBe('') // "Who booked it" is not Trallo's to fill
    expect(row).toHaveLength(FLIGHT_HEADERS.length)
  })

  it('refuses to append into a tab whose headers were broken', async () => {
    api.flightRows = [['ID', 'URL'], []]
    await expect(
      repo.appendRow(TRIP.id, 'Flights', { tab: 'Flights', airlineFlight: 'X', layovers: [] }),
    ).rejects.toMatchObject({ code: 'SHEET_STRUCTURE_BROKEN' })
  })
})
