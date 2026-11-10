/**
 * All trip dates are plain local calendar days (YYYY-MM-DD) and all flight
 * times are local wall-clock strings (YYYY-MM-DDTHH:mm). Nothing here goes
 * through Date.parse on a bare date string, which would read it as UTC and
 * shift the day for anyone west of Greenwich.
 */

const MS_PER_DAY = 86_400_000

const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
]

export function todayISO(now: Date = new Date()): string {
  return toISODate(now)
}

export function toISODate(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

/** Returns null for anything that is not a well-formed YYYY-MM-DD. */
export function parseISODate(value: string | undefined | null): Date | null {
  if (!value) return null
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value.trim())
  if (!m) return null
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  return Number.isNaN(d.getTime()) ? null : d
}

/** Whole days from `from` to `to`; negative when `to` is earlier. */
export function daysBetween(from: string, to: string): number {
  const a = parseISODate(from)
  const b = parseISODate(to)
  if (!a || !b) return 0
  return Math.round((b.getTime() - a.getTime()) / MS_PER_DAY)
}

/** Inclusive length of a trip: Mar 15 -> Mar 22 is 8 days. */
export function tripLengthDays(startDate: string, endDate: string): number {
  const span = daysBetween(startDate, endDate)
  return span < 0 ? 0 : span + 1
}

export function addDays(iso: string, days: number): string {
  const d = parseISODate(iso)
  if (!d) return iso
  d.setDate(d.getDate() + days)
  return toISODate(d)
}

/** "Mar 15" or "Mar 15, 2026" when the year differs from `contextYear`. */
export function formatDay(iso: string, contextYear?: number): string {
  const d = parseISODate(iso)
  if (!d) return iso ?? ''
  const base = `${MONTHS[d.getMonth()]} ${d.getDate()}`
  return contextYear === d.getFullYear() ? base : `${base}, ${d.getFullYear()}`
}

/** "Mar 15 – Mar 22, 2026" — the year is shown once when both ends share it. */
export function formatDateRange(startDate: string, endDate: string): string {
  const a = parseISODate(startDate)
  const b = parseISODate(endDate)
  if (!a && !b) return ''
  if (!a) return formatDay(endDate)
  if (!b) return formatDay(startDate)
  const sameYear = a.getFullYear() === b.getFullYear()
  return `${formatDay(startDate, sameYear ? b.getFullYear() : undefined)} – ${formatDay(endDate)}`
}

/** "Sep 11, 2025 • 11:15 AM" from a YYYY-MM-DDTHH:mm value. Falls back to the raw text. */
export function formatDateTime(value: string | undefined): string {
  if (!value) return ''
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/.exec(value.trim())
  if (!m) return value
  const date = formatDay(`${m[1]}-${m[2]}-${m[3]}`)
  if (!m[4]) return date
  const hour24 = Number(m[4])
  const suffix = hour24 < 12 ? 'AM' : 'PM'
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12
  return `${date} • ${hour12}:${m[5]} ${suffix}`
}

/** Days until departure, floored at 0 once the trip has started. */
export function countdownDays(startDate: string, today: string): number {
  return Math.max(0, daysBetween(today, startDate))
}

export function nowISO(now: Date = new Date()): string {
  return now.toISOString()
}

/** "just now", "5 min ago", "3 hrs ago", "2 days ago" — for the sync footer. */
export function formatRelative(isoTimestamp: string | undefined, now: Date = new Date()): string {
  if (!isoTimestamp) return 'never'
  const then = new Date(isoTimestamp).getTime()
  if (Number.isNaN(then)) return 'never'
  const seconds = Math.max(0, Math.round((now.getTime() - then) / 1000))
  if (seconds < 45) return 'just now'
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours} hr${hours === 1 ? '' : 's'} ago`
  const days = Math.round(hours / 24)
  return `${days} day${days === 1 ? '' : 's'} ago`
}
