import { describe, expect, it } from 'vitest'
import {
  changedCells,
  fromRow,
  indexHeaders,
  parseLayovers,
  serializeLayovers,
  toBoolean,
  toNumber,
  toRow,
  validateHeaders,
} from '../src/core/sheets/mappers'
import { TAB_SPECS } from '../src/core/sheets/schema'
import type { FlightItem, PackingItem } from '../src/core/types/items'

const FLIGHTS = TAB_SPECS.Flights
const PACKING = TAB_SPECS['Packing List']

const FLIGHT_HEADERS = FLIGHTS.fields.map((f) => f.header)

describe('cell coercion', () => {
  it('reads money the way people type it', () => {
    expect(toNumber('$1,284.50')).toBe(1284.5)
    expect(toNumber(1284)).toBe(1284)
    expect(toNumber('')).toBeUndefined()
    expect(toNumber('free')).toBeUndefined()
    expect(toNumber(null)).toBeUndefined()
  })

  it('accepts the several ways a sheet says yes', () => {
    expect(toBoolean(true)).toBe(true)
    expect(toBoolean('TRUE')).toBe(true)
    expect(toBoolean('x')).toBe(true)
    expect(toBoolean('')).toBe(false)
    expect(toBoolean('no')).toBe(false)
  })
})

describe('layovers', () => {
  it('round-trips through the template’s single cell', () => {
    const layovers = [
      { airport: 'NRT', arriveTime: '10:30', departTime: '12:45' },
      { airport: 'ICN', arriveTime: '14:00', departTime: '15:30' },
    ]
    const text = serializeLayovers(layovers)
    expect(text).toBe('NRT 10:30 → 12:45; ICN 14:00 → 15:30')
    expect(parseLayovers(text)).toEqual(layovers)
  })

  it('treats the usual ways of writing "no stops" as nonstop', () => {
    expect(parseLayovers('')).toEqual([])
    expect(parseLayovers('Nonstop')).toEqual([])
    expect(parseLayovers('direct')).toEqual([])
    expect(serializeLayovers([])).toBe('')
  })

  it('keeps an airport with no times', () => {
    expect(parseLayovers('NRT')).toEqual([{ airport: 'NRT' }])
  })
})

describe('reading rows', () => {
  it('maps by header name, so a reordered or extra column is harmless', () => {
    const headers = ['Notes', 'ID', 'Who added it', 'Airline & Flight #', 'Cost ($)', 'URL']
    const index = indexHeaders(headers)
    const row = ['Window seat', 'fl_123', 'Alexis', 'ANA NH 007', '$1,284', 'https://x.test']

    const flight = fromRow(FLIGHTS, row, index) as FlightItem
    expect(flight.rowId).toBe('fl_123')
    expect(flight.airlineFlight).toBe('ANA NH 007')
    expect(flight.cost).toBe(1284)
    expect(flight.notes).toBe('Window seat')
    expect(flight.link).toBe('https://x.test')
    // Columns absent from the sheet simply come back undefined.
    expect(flight.departAirport).toBeUndefined()
  })

  it('skips blank rows', () => {
    expect(fromRow(FLIGHTS, ['', '', ''], indexHeaders(FLIGHT_HEADERS))).toBeNull()
  })

  it('reports a row with no ID so one can be backfilled', () => {
    const index = indexHeaders(FLIGHT_HEADERS)
    const row = ['', '', 'Hand-typed flight']
    const flight = fromRow(FLIGHTS, row, index) as FlightItem
    expect(flight.rowId).toBe('')
    expect(flight.airlineFlight).toBe('Hand-typed flight')
  })

  it('defaults a packing row to not packed', () => {
    const headers = PACKING.fields.map((f) => f.header)
    const item = fromRow(PACKING, ['pk_1', 'Camera'], indexHeaders(headers)) as PackingItem
    expect(item.packed).toBe(false)
  })
})

describe('writing rows', () => {
  it('fills only the columns it manages', () => {
    const headers = ['ID', 'Mine', 'Airline & Flight #', 'Cost ($)']
    const row = toRow(
      FLIGHTS,
      { rowId: 'fl_1', airlineFlight: 'NH 007', cost: 1284, layovers: [] },
      indexHeaders(headers),
      headers.length,
    )
    expect(row).toEqual(['fl_1', '', 'NH 007', 1284])
  })

  it('emits a write only for the cells that actually changed', () => {
    const index = indexHeaders(FLIGHT_HEADERS)
    const before = { rowId: 'fl_1', airlineFlight: 'NH 007', cost: 1284, layovers: [], notes: 'a' }
    const after = { ...before, cost: 1100 }
    expect(changedCells(FLIGHTS, before, after, index, 7)).toEqual([{ a1: 'D7', value: 1100 }])
  })

  it('writes nothing when nothing moved', () => {
    const index = indexHeaders(FLIGHT_HEADERS)
    const item = { rowId: 'fl_1', airlineFlight: 'NH 007', layovers: [] }
    expect(changedCells(FLIGHTS, item, { ...item }, index, 2)).toEqual([])
  })
})

describe('header validation', () => {
  it('passes a healthy header row', () => {
    expect(validateHeaders(FLIGHTS, FLIGHT_HEADERS).ok).toBe(true)
  })

  it('names the columns a hand edit removed', () => {
    const broken = FLIGHT_HEADERS.filter((h) => h !== 'Cost ($)' && h !== 'ID')
    const result = validateHeaders(FLIGHTS, broken)
    expect(result.ok).toBe(false)
    expect(result.missingColumns).toEqual(['ID', 'Cost ($)'])
  })
})
