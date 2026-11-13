import { appError, type AppError } from '../core/types/errors'
import type { AuthService } from './AuthService'

export type Query = Record<string, string | number | boolean | string[] | undefined>

export type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  query?: Query
  body?: unknown
}

function withQuery(url: string, query?: Query): string {
  if (!query) return url
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined) continue
    if (Array.isArray(value)) value.forEach((v) => params.append(key, v))
    else params.append(key, String(value))
  }
  const qs = params.toString()
  return qs ? `${url}${url.includes('?') ? '&' : '?'}${qs}` : url
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function googleErrorReason(detail: string): string {
  try {
    const body: unknown = JSON.parse(detail)
    if (typeof body !== 'object' || body === null || !('error' in body)) return ''
    const error = body.error
    if (typeof error !== 'object' || error === null || !('errors' in error)) return ''
    const errors = error.errors
    if (!Array.isArray(errors)) return ''
    return errors
      .map((item: unknown) =>
        typeof item === 'object' && item !== null && 'reason' in item && typeof item.reason === 'string'
          ? item.reason
          : '',
      )
      .filter(Boolean)
      .join(' ')
  } catch {
    return ''
  }
}

function errorFromStatus(status: number, detail: string): AppError {
  if (status === 401) return appError('AUTH_EXPIRED', detail)
  if (status === 403 && /rate|quota/i.test(detail)) return appError('RATE_LIMITED', detail)
  if (status === 403) {
    const reason = googleErrorReason(detail)
    if (
      /accessNotConfigured|serviceDisabled/i.test(reason) ||
      /api has not been used in project|api is disabled/i.test(detail)
    ) {
      return appError('GOOGLE_API_CONFIG', detail)
    }
    if (/insufficientPermissions|insufficient authentication scopes/i.test(`${reason} ${detail}`)) {
      return appError('GOOGLE_API_PERMISSION', detail)
    }
    return appError('GOOGLE_API_ACCESS', detail)
  }
  if (status === 404) return appError('NOT_FOUND', detail)
  if (status === 429 || status >= 500) return appError('RATE_LIMITED', detail)
  return appError('UNKNOWN', `HTTP ${status}: ${detail}`)
}

/**
 * Every Google request goes through here. It attaches the bearer token, retries
 * once on a 401 with a freshly minted token, and backs off twice on 429/5xx.
 * No other module is allowed to call fetch.
 */
export class GoogleApiClient {
  private readonly auth: AuthService

  constructor(auth: AuthService) {
    this.auth = auth
  }

  async request<T>(url: string, options: RequestOptions = {}): Promise<T> {
    return this.attempt<T>(url, options, 0, false)
  }

  private async attempt<T>(
    url: string,
    options: RequestOptions,
    backoffAttempt: number,
    retriedAuth: boolean,
  ): Promise<T> {
    const token = await this.auth.getToken(false)
    const headers: Record<string, string> = { Authorization: `Bearer ${token}` }
    if (options.body !== undefined) headers['Content-Type'] = 'application/json'

    let response: Response
    try {
      response = await fetch(withQuery(url, options.query), {
        method: options.method ?? 'GET',
        headers,
        body: options.body === undefined ? undefined : JSON.stringify(options.body),
      })
    } catch (err) {
      throw appError('OFFLINE', err instanceof Error ? err.message : String(err))
    }

    if (response.ok) {
      if (response.status === 204) return undefined as T
      const text = await response.text()
      return (text ? JSON.parse(text) : undefined) as T
    }

    const detail = await response.text().catch(() => response.statusText)

    if (response.status === 401 && !retriedAuth) {
      await this.auth.handleExpiredToken()
      return this.attempt<T>(url, options, backoffAttempt, true)
    }

    if ((response.status === 429 || response.status >= 500) && backoffAttempt < 2) {
      await sleep(600 * 2 ** backoffAttempt)
      return this.attempt<T>(url, options, backoffAttempt + 1, retriedAuth)
    }

    throw errorFromStatus(response.status, detail)
  }
}

export const SHEETS_API = 'https://sheets.googleapis.com/v4/spreadsheets'
export const DRIVE_API = 'https://www.googleapis.com/drive/v3/files'
