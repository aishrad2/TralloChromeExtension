import { describe, expect, it } from 'vitest'
import {
  countdownDays,
  daysBetween,
  formatDateRange,
  formatDateTime,
  formatRelative,
  parseISODate,
  tripLengthDays,
} from '../src/core/dates'

describe('dates', () => {
  it('reads YYYY-MM-DD as a local calendar day, not UTC', () => {
    const parsed = parseISODate('2026-03-15')!
    expect(parsed.getFullYear()).toBe(2026)
    expect(parsed.getMonth()).toBe(2)
    expect(parsed.getDate()).toBe(15)
  })

  it('rejects malformed dates instead of guessing', () => {
    expect(parseISODate('')).toBeNull()
    expect(parseISODate('next tuesday')).toBeNull()
    expect(parseISODate(undefined)).toBeNull()
  })

  it('counts trip length inclusively', () => {
    expect(tripLengthDays('2026-03-15', '2026-03-22')).toBe(8)
    expect(tripLengthDays('2026-03-15', '2026-03-15')).toBe(1)
    expect(tripLengthDays('2026-03-22', '2026-03-15')).toBe(0)
  })

  it('counts across a month boundary', () => {
    expect(daysBetween('2026-02-26', '2026-03-02')).toBe(4)
  })

  it('floors the countdown once the trip has started', () => {
    expect(countdownDays('2026-03-15', '2026-03-01')).toBe(14)
    expect(countdownDays('2026-03-15', '2026-03-20')).toBe(0)
  })

  it('prints a range with the year stated once', () => {
    expect(formatDateRange('2026-03-15', '2026-03-22')).toBe('Mar 15 – Mar 22, 2026')
    expect(formatDateRange('2025-12-28', '2026-01-04')).toBe('Dec 28, 2025 – Jan 4, 2026')
  })

  it('formats a local date-time and falls back to raw text', () => {
    expect(formatDateTime('2025-09-11T11:15')).toBe('Sep 11, 2025 • 11:15 AM')
    expect(formatDateTime('2025-09-12T14:30')).toBe('Sep 12, 2025 • 2:30 PM')
    expect(formatDateTime('2025-09-12T00:05')).toBe('Sep 12, 2025 • 12:05 AM')
    expect(formatDateTime('sometime Tuesday')).toBe('sometime Tuesday')
    expect(formatDateTime(undefined)).toBe('')
  })

  it('describes how long ago the last sync was', () => {
    const now = new Date('2026-03-01T12:00:00Z')
    expect(formatRelative('2026-03-01T11:59:50Z', now)).toBe('just now')
    expect(formatRelative('2026-03-01T11:55:00Z', now)).toBe('5 min ago')
    expect(formatRelative('2026-03-01T07:00:00Z', now)).toBe('5 hrs ago')
    expect(formatRelative(undefined, now)).toBe('never')
  })
})
