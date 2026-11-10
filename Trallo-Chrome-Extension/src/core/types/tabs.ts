/**
 * Tab names are the ground truth for Google Sheets API ranges, so they must
 * match the master template byte-for-byte ("Budgeting & Expenses", not
 * "Budget & Expenses"). The friendlier labels from the wireframes live in
 * TAB_DISPLAY and are used for UI copy only.
 */
export const TAB_NAMES = [
  'Flights',
  'Hotels & Housing',
  'Bucket List',
  'Packing List',
  'Budgeting & Expenses',
  'Notes & Brainstorming',
] as const

export type TabName = (typeof TAB_NAMES)[number]

export const TAB_DISPLAY: Record<TabName, string> = {
  Flights: 'Flights',
  'Hotels & Housing': 'Hotels & Housing',
  'Bucket List': 'Bucket List',
  'Packing List': 'Packing List',
  'Budgeting & Expenses': 'Budget & Expenses',
  'Notes & Brainstorming': 'Notes & Brainstorm',
}

/**
 * Hidden tab holding the trip's own metadata as key/value rows. It makes each
 * spreadsheet self-describing, so Trallo can rebuild its trip list from Drive
 * alone after a cache wipe or on a second machine.
 */
export const META_TAB = '_Trallo'

export function isTabName(value: string): value is TabName {
  return (TAB_NAMES as readonly string[]).includes(value)
}
