import type { Layover, TripItem } from '../types/items'
import type { HeaderValidationResult } from '../types/errors'
import { columnLetter, type FieldSpec, type TabSpec } from './schema'

export type CellValue = string | number | boolean | null

/** header text -> 0-based column index, as found in the sheet's row 1. */
export type HeaderIndex = Record<string, number>

export function indexHeaders(headerRow: readonly CellValue[] = []): HeaderIndex {
  const index: HeaderIndex = {}
  headerRow.forEach((cell, i) => {
    const key = String(cell ?? '').trim()
    // First occurrence wins, so a stray duplicate header can't shadow the real one.
    if (key && !(key in index)) index[key] = i
  })
  return index
}

export function validateHeaders(
  spec: TabSpec,
  headerRow: readonly CellValue[] = [],
): HeaderValidationResult {
  const index = indexHeaders(headerRow)
  const missingColumns = spec.fields.map((f) => f.header).filter((h) => !(h in index))
  return { ok: missingColumns.length === 0, tab: spec.name, missingColumns }
}

export function isRowBlank(row: readonly CellValue[] = []): boolean {
  return row.every((cell) => cell === null || cell === undefined || String(cell).trim() === '')
}

// ---------------------------------------------------------------- coercion

function toText(raw: CellValue | undefined): string | undefined {
  if (raw === null || raw === undefined) return undefined
  const text = String(raw).trim()
  return text === '' ? undefined : text
}

export function toNumber(raw: CellValue | undefined): number | undefined {
  if (raw === null || raw === undefined || raw === '') return undefined
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : undefined
  // Tolerates what people actually type into a money column: "$1,284.50".
  const cleaned = String(raw).replace(/[^0-9.-]/g, '')
  if (cleaned === '' || cleaned === '-' || cleaned === '.') return undefined
  const value = Number(cleaned)
  return Number.isFinite(value) ? value : undefined
}

const TRUTHY = new Set(['true', 'yes', 'y', '1', 'x', '✓', 'packed', 'done'])

export function toBoolean(raw: CellValue | undefined): boolean {
  if (typeof raw === 'boolean') return raw
  if (typeof raw === 'number') return raw !== 0
  return TRUTHY.has(String(raw ?? '').trim().toLowerCase())
}

// ---------------------------------------------------------------- layovers

const NONSTOP_WORDS = new Set(['', 'none', 'nonstop', 'non-stop', 'direct', 'n/a', 'na', '-'])

/** `NRT 10:30 → 12:45; ICN 14:00 → 15:30` — readable in Sheets, parses back cleanly. */
export function serializeLayovers(layovers: readonly Layover[] = []): string {
  return layovers
    .map((l) => {
      const airport = (l.airport ?? '').trim()
      const arrive = (l.arriveTime ?? '').trim()
      const depart = (l.departTime ?? '').trim()
      if (!airport && !arrive && !depart) return ''
      if (arrive && depart) return `${airport} ${arrive} → ${depart}`
      if (arrive || depart) return `${airport} ${arrive || depart}`.trim()
      return airport
    })
    .filter(Boolean)
    .join('; ')
}

export function parseLayovers(raw: CellValue | undefined): Layover[] {
  const text = String(raw ?? '').trim()
  if (NONSTOP_WORDS.has(text.toLowerCase())) return []
  return text
    .split(/[;\n]+/)
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk) => {
      const split = /^(\S+)\s+(.*?)\s*(?:→|->|–|-)\s*(.*)$/.exec(chunk)
      if (split) {
        return { airport: split[1], arriveTime: split[2] || undefined, departTime: split[3] || undefined }
      }
      const single = /^(\S+)\s+(.+)$/.exec(chunk)
      if (single) return { airport: single[1], arriveTime: single[2] }
      return { airport: chunk }
    })
}

// ---------------------------------------------------------------- row <-> item

function readField(field: FieldSpec, raw: CellValue | undefined): unknown {
  switch (field.kind) {
    case 'number':
      return toNumber(raw)
    case 'boolean':
      return toBoolean(raw)
    case 'layovers':
      return parseLayovers(raw)
    case 'string':
      return toText(raw)
  }
}

function writeField(field: FieldSpec, value: unknown): CellValue {
  switch (field.kind) {
    case 'number':
      return typeof value === 'number' && Number.isFinite(value) ? value : ''
    case 'boolean':
      return value === true
    case 'layovers':
      return serializeLayovers((value as Layover[]) ?? [])
    case 'string':
      return value === undefined || value === null ? '' : String(value)
  }
}

/**
 * Reads one sheet row into an item. Returns null for blank rows and for rows
 * whose required field is empty, so stray spacer rows don't become ghost items.
 */
export function fromRow(
  spec: TabSpec,
  row: readonly CellValue[],
  index: HeaderIndex,
): TripItem | null {
  if (isRowBlank(row)) return null
  const out: Record<string, unknown> = { tab: spec.name }
  for (const field of spec.fields) {
    const column = index[field.header]
    out[field.key] = readField(field, column === undefined ? undefined : row[column])
  }
  out.rowId = typeof out.rowId === 'string' ? out.rowId : ''
  return out as TripItem
}

/** Full-width row for appends. Columns Trallo doesn't manage are left empty. */
export function toRow(
  spec: TabSpec,
  item: Partial<Record<string, unknown>>,
  index: HeaderIndex,
  width: number,
): CellValue[] {
  const cells: CellValue[] = new Array(width).fill('')
  for (const field of spec.fields) {
    const column = index[field.header]
    if (column === undefined || column >= width) continue
    cells[column] = writeField(field, item[field.key])
  }
  return cells
}

export type CellWrite = { a1: string; value: CellValue }

/**
 * The cells that actually differ between `before` and `after`, as A1 ranges on
 * `rowNumber`. Updating only these leaves hand-added columns untouched.
 */
export function changedCells(
  spec: TabSpec,
  before: Partial<Record<string, unknown>>,
  after: Partial<Record<string, unknown>>,
  index: HeaderIndex,
  rowNumber: number,
): CellWrite[] {
  const writes: CellWrite[] = []
  for (const field of spec.fields) {
    const column = index[field.header]
    if (column === undefined) continue
    const next = writeField(field, after[field.key])
    const prev = writeField(field, before[field.key])
    if (next === prev) continue
    writes.push({ a1: `${columnLetter(column)}${rowNumber}`, value: next })
  }
  return writes
}

/** Row numbers are 1-based and row 1 is the header, so data starts at 2. */
export function rowNumberFor(dataIndex: number): number {
  return dataIndex + 2
}
