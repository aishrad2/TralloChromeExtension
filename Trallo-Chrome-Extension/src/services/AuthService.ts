import { appError, type AppError } from '../core/types/errors'

export type AuthToken = {
  token: string
  email?: string
}

type RawTokenResult = string | { token?: string; grantedScopes?: string[] } | undefined

function readToken(result: RawTokenResult): string | undefined {
  if (!result) return undefined
  // MV3 hands back an object; MV2 and some channels still hand back a bare string.
  return typeof result === 'string' ? result : result.token
}

function classify(message: string): AppError {
  const m = message.toLowerCase()
  if (m.includes('did not approve') || m.includes('canceled') || m.includes('cancelled')) {
    return appError('AUTH_CANCELLED', message)
  }
  if (m.includes('user interaction required') || m.includes('not signed in')) {
    return appError('AUTH_REQUIRED', message)
  }
  if (m.includes('not granted') || m.includes('revoked')) {
    return appError('AUTH_EXPIRED', message)
  }
  if (m.includes('client id') || m.includes('client_id') || m.includes('invalid client')) {
    return appError('AUTH_CONFIG', message)
  }
  if (m.includes('network') || m.includes('offline')) {
    return appError('OFFLINE', message)
  }
  return appError('UNKNOWN', message)
}

/**
 * The only code that talks to chrome.identity. It runs in the side panel rather
 * than the service worker: an interactive token prompt needs a user gesture,
 * and a worker woken by an alarm or a message has none.
 */
export class AuthService {
  private current?: string
  private email?: string

  async getToken(interactive: boolean): Promise<string> {
    if (this.current && !interactive) return this.current
    const token = await this.requestToken(interactive)
    this.current = token
    return token
  }

  async signIn(): Promise<AuthToken> {
    const token = await this.requestToken(true)
    this.current = token
    return { token, email: await this.getEmail() }
  }

  async signOut(): Promise<void> {
    const token = this.current
    this.current = undefined
    this.email = undefined
    if (token) await this.invalidate(token)
  }

  /** True when a token can be had without showing the user a prompt. */
  async isSignedIn(): Promise<boolean> {
    try {
      await this.getToken(false)
      return true
    } catch {
      return false
    }
  }

  /**
   * Drops a token Google has stopped accepting and fetches a fresh one. Without
   * removeCachedAuthToken, Chrome would keep handing back the same dead token.
   */
  async handleExpiredToken(): Promise<string> {
    const stale = this.current
    this.current = undefined
    if (stale) await this.invalidate(stale)
    return this.getToken(false)
  }

  async getEmail(): Promise<string | undefined> {
    if (this.email) return this.email
    this.email = await new Promise<string | undefined>((resolve) => {
      try {
        chrome.identity.getProfileUserInfo({ accountStatus: 'ANY' }, (info) =>
          resolve(info?.email || undefined),
        )
      } catch {
        resolve(undefined)
      }
    })
    return this.email
  }

  private invalidate(token: string): Promise<void> {
    return new Promise((resolve) => {
      try {
        chrome.identity.removeCachedAuthToken({ token }, () => resolve())
      } catch {
        resolve()
      }
    })
  }

  private requestToken(interactive: boolean): Promise<string> {
    return new Promise((resolve, reject) => {
      try {
        chrome.identity.getAuthToken({ interactive }, (result: RawTokenResult) => {
          const lastError = chrome.runtime.lastError
          if (lastError) {
            reject(classify(lastError.message ?? 'Google sign-in failed.'))
            return
          }
          const token = readToken(result)
          if (!token) {
            reject(appError(interactive ? 'AUTH_CANCELLED' : 'AUTH_REQUIRED', 'No token returned.'))
            return
          }
          resolve(token)
        })
      } catch (err) {
        reject(classify(err instanceof Error ? err.message : String(err)))
      }
    })
  }
}
