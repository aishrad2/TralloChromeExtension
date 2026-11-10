import { NECESSITY_LEVELS, NOTE_CATEGORIES, EXPENSE_TYPES } from '../types/items'
import { TAB_NAMES, type TabName } from '../types/tabs'

/**
 * The sheet schema. Header text here must match the master template exactly,
 * because headers — not column positions — are how rows are read and written.
 * Inserting an unrelated column in Sheets therefore cannot break Trallo.
 *
 * Three sets of columns are additions to the supplied template, approved so the
 * UI has something to read:
 *   Packing List         -> Packed        (the "N% Complete" badge)
 *   Bucket List          -> Lat, Lng      (saved now, mapped in a later version)
 *   Budgeting & Expenses -> ID, Date, Paid By
 * The ID column matters most: it was the one tab with no stable row identity.
 */

export type FieldKind = 'string' | 'number' | 'boolean' | 'layovers'

export type FieldSpec = {
  header: string
  key: string
  kind: FieldKind
}

export type ValidationSpec = {
  header: string
  values: readonly string[]
}

export type TabSpec = {
  name: TabName
  fields: readonly FieldSpec[]
  validations?: readonly ValidationSpec[]
  /** Columns rendered as Sheets checkboxes. */
  checkboxes?: readonly string[]
  /** Header of the column holding the row id. */
  idHeader: string
}

const s = (header: string, key: string): FieldSpec => ({ header, key, kind: 'string' })
const n = (header: string, key: string): FieldSpec => ({ header, key, kind: 'number' })

export const TAB_SPECS: Record<TabName, TabSpec> = {
  Flights: {
    name: 'Flights',
    idHeader: 'ID',
    fields: [
      s('ID', 'rowId'),
      s('URL', 'link'),
      s('Airline & Flight #', 'airlineFlight'),
      n('Cost ($)', 'cost'),
      s('Departing Airport', 'departAirport'),
      s('Arriving Airport', 'arriveAirport'),
      { header: 'Layovers', key: 'layovers', kind: 'layovers' },
      s('Departure Date & Time (Local)', 'departTime'),
      s('Arrival Date & Time (Local)', 'arriveTime'),
      s('Notes', 'notes'),
    ],
  },
  'Hotels & Housing': {
    name: 'Hotels & Housing',
    idHeader: 'ID',
    fields: [
      s('ID', 'rowId'),
      s('URL', 'link'),
      s('Hotel Name', 'name'),
      s('Address', 'address'),
      s('Check-in Date', 'checkIn'),
      s('Check-out Date', 'checkOut'),
      n('Price Per Night ($)', 'pricePerNight'),
      n('Beds', 'beds'),
      n('Guests', 'guests'),
      s('Notes', 'notes'),
    ],
  },
  'Bucket List': {
    name: 'Bucket List',
    idHeader: 'ID',
    fields: [
      s('ID', 'rowId'),
      s('URL', 'link'),
      s('Name', 'name'),
      s('Address', 'address'),
      s('Category', 'category'),
      n('Cost ($)', 'cost'),
      s('Notes', 'notes'),
      n('Lat', 'lat'),
      n('Lng', 'lng'),
    ],
  },
  'Packing List': {
    name: 'Packing List',
    idHeader: 'ID',
    fields: [
      s('ID', 'rowId'),
      s('Item Name', 'item'),
      s('Category', 'category'),
      s('Necessity Level', 'necessity'),
      s('Assignee(s)', 'assignedTo'),
      s('Notes', 'notes'),
      { header: 'Packed', key: 'packed', kind: 'boolean' },
    ],
    validations: [{ header: 'Necessity Level', values: NECESSITY_LEVELS }],
    checkboxes: ['Packed'],
  },
  'Budgeting & Expenses': {
    name: 'Budgeting & Expenses',
    idHeader: 'ID',
    fields: [
      s('ID', 'rowId'),
      s('Expense Type', 'expenseType'),
      n('Cost ($)', 'cost'),
      s('Date', 'date'),
      s('Paid By', 'paidBy'),
    ],
    validations: [{ header: 'Expense Type', values: EXPENSE_TYPES }],
  },
  'Notes & Brainstorming': {
    name: 'Notes & Brainstorming',
    idHeader: 'ID',
    fields: [s('ID', 'rowId'), s('Note', 'note'), s('Category', 'category'), s('Assignee(s)', 'assignedTo')],
    validations: [{ header: 'Category', values: NOTE_CATEGORIES }],
  },
}

export const ALL_TAB_SPECS = TAB_NAMES.map((t) => TAB_SPECS[t])

/**
 * The Budget / Expenses / Amount Left block on the Budgeting & Expenses tab.
 * The template keeps it at D1:I1; it moves right here to leave A:E for the
 * expense rows. Expenses and Amount Left are live formulas so the numbers stay
 * right when the sheet is edited by hand, and Budget (H1) is the single source
 * of truth for the trip's budget — edit it in Sheets and Trallo picks it up.
 */
export const BUDGET_BLOCK = {
  tab: 'Budgeting & Expenses' as const,
  range: 'G1:L1',
  labels: ['Budget', 'Expenses', 'Amount Left'],
  budgetCell: 'H1',
  expensesFormula: '=SUM(C2:C)',
  remainingFormula: '=H1-J1',
} as const

/** Widest column letter Trallo ever reads from a data tab. */
export const READ_WIDTH = 'Z'

export function columnLetter(index0: number): string {
  let n0 = index0
  let out = ''
  do {
    out = String.fromCharCode(65 + (n0 % 26)) + out
    n0 = Math.floor(n0 / 26) - 1
  } while (n0 >= 0)
  return out
}

/** `'Hotels & Housing'!C4` — single-quoted so `&` and spaces survive. */
export function cellRange(tab: string, columnIndex0: number, rowNumber: number): string {
  return `'${tab.replace(/'/g, "''")}'!${columnLetter(columnIndex0)}${rowNumber}`
}

export function tabRange(tab: string, a1: string): string {
  return `'${tab.replace(/'/g, "''")}'!${a1}`
}
