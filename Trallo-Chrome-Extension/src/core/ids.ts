import type { TabName } from './types/tabs'

const PREFIX: Record<TabName, string> = {
  Flights: 'fl',
  'Hotels & Housing': 'ho',
  'Bucket List': 'bl',
  'Packing List': 'pk',
  'Budgeting & Expenses': 'ex',
  'Notes & Brainstorming': 'nt',
}

function randomSuffix(random: () => number): string {
  // 10 base-36 chars ~ 51 bits; collisions inside one small sheet are not a concern.
  let out = ''
  while (out.length < 10) out += Math.floor(random() * 36 ** 6).toString(36)
  return out.slice(0, 10)
}

function defaultRandom(): number {
  const g = globalThis as { crypto?: Crypto }
  if (g.crypto?.getRandomValues) {
    const buf = new Uint32Array(1)
    g.crypto.getRandomValues(buf)
    return buf[0] / 2 ** 32
  }
  return Math.random()
}

export function newRowId(tab: TabName, random: () => number = defaultRandom): string {
  return `${PREFIX[tab]}_${randomSuffix(random)}`
}

export function newTripId(random: () => number = defaultRandom): string {
  return `trip_${randomSuffix(random)}`
}
