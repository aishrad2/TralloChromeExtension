export function money(value: number | undefined, currency = 'USD'): string {
  if (value === undefined || !Number.isFinite(value)) return '—'
  const fractionDigits = Number.isInteger(value) ? 0 : 2
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    }).format(value)
  } catch {
    return `${currency} ${value.toFixed(fractionDigits)}`
  }
}

/** Reads what a person typed into a money or count field. Blank means "not set". */
export function parseAmount(value: string): number | undefined {
  const cleaned = value.replace(/[^0-9.-]/g, '')
  if (!cleaned || cleaned === '-' || cleaned === '.') return undefined
  const parsed = Number(cleaned)
  return Number.isFinite(parsed) ? parsed : undefined
}

export function plural(count: number, one: string, many = `${one}s`): string {
  return `${count} ${count === 1 ? one : many}`
}

/** "a, b, etc." — the wireframe's trailing-item style for long lists. */
export function listSummary(values: string[], max = 2): string {
  const kept = values.filter(Boolean)
  if (kept.length === 0) return ''
  if (kept.length <= max) return kept.join(', ')
  return `${kept.slice(0, max).join(', ')}, etc.`
}

export function truncate(value: string, max = 60): string {
  return value.length <= max ? value : `${value.slice(0, max - 1).trimEnd()}…`
}
