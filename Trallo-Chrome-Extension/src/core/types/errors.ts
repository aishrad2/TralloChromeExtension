export type AppErrorCode =
  | 'AUTH_REQUIRED'
  | 'AUTH_CANCELLED'
  | 'AUTH_EXPIRED'
  | 'AUTH_CONFIG'
  | 'GOOGLE_API_CONFIG'
  | 'GOOGLE_API_PERMISSION'
  | 'GOOGLE_API_ACCESS'
  | 'SHEET_STRUCTURE_BROKEN'
  | 'NOT_FOUND'
  | 'RATE_LIMITED'
  | 'OFFLINE'
  | 'UNKNOWN'

export type AppError = {
  code: AppErrorCode
  /** Raw detail for the console. */
  message: string
  /** One sentence safe to show in the panel. */
  friendlyMessage: string
  /** True when a "Try again" button makes sense. */
  retryable: boolean
}

const FRIENDLY: Record<AppErrorCode, string> = {
  AUTH_REQUIRED: 'Sign in with Google to use Trallo.',
  AUTH_CANCELLED: 'Sign-in was cancelled.',
  AUTH_EXPIRED: 'Your Google session expired. Sign in again to keep syncing.',
  AUTH_CONFIG:
    'Google rejected this extension’s OAuth client. Check the client ID in manifest.json and the extension ID registered in Google Cloud.',
  GOOGLE_API_CONFIG:
    'Google Drive or Sheets API is disabled for this OAuth project. Enable both APIs in Google Cloud Console, then try again.',
  GOOGLE_API_PERMISSION:
    'Google denied the requested Drive or Sheets permission. Sign out and back in to grant access; if it persists, check the OAuth scopes and API access in Google Cloud.',
  GOOGLE_API_ACCESS:
    'Google denied access to Drive or Sheets. Check this account’s access and the API configuration in Google Cloud.',
  SHEET_STRUCTURE_BROKEN:
    'This trip’s sheet is missing columns Trallo needs. Restore the header row in Google Sheets, then refresh.',
  NOT_FOUND: 'That trip’s sheet is no longer in your Drive.',
  RATE_LIMITED: 'Google is rate-limiting requests. Trallo will try again shortly.',
  OFFLINE: 'No connection to Google. Your changes are not saved yet.',
  UNKNOWN: 'Something went wrong talking to Google.',
}

const RETRYABLE: AppErrorCode[] = ['RATE_LIMITED', 'OFFLINE', 'UNKNOWN', 'SHEET_STRUCTURE_BROKEN']

export function appError(code: AppErrorCode, message = '', friendlyMessage?: string): AppError {
  return {
    code,
    message: message || code,
    friendlyMessage: friendlyMessage ?? FRIENDLY[code],
    retryable: RETRYABLE.includes(code),
  }
}

export function isAppError(value: unknown): value is AppError {
  return typeof value === 'object' && value !== null && 'code' in value && 'friendlyMessage' in value
}

export function toAppError(value: unknown): AppError {
  if (isAppError(value)) return value
  if (value instanceof Error) return appError('UNKNOWN', value.message)
  return appError('UNKNOWN', String(value))
}

export type HeaderValidationResult = {
  ok: boolean
  tab: import('./tabs').TabName
  missingColumns: string[]
}
