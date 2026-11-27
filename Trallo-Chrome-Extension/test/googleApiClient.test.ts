import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthService } from '../src/services/AuthService'
import { GoogleApiClient } from '../src/services/GoogleApiClient'

describe('GoogleApiClient access errors', () => {
  let client: GoogleApiClient

  beforeEach(() => {
    const auth = new AuthService()
    vi.spyOn(auth, 'getToken').mockResolvedValue('test-token')
    client = new GoogleApiClient(auth)
  })

  it('explains when a Google API is disabled', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            error: {
              code: 403,
              message: 'Drive API has not been used in project 123 before or it is disabled.',
              errors: [{ reason: 'accessNotConfigured' }],
            },
          }),
          { status: 403 },
        ),
      ),
    )

    await expect(client.request('https://www.googleapis.com/drive/v3/files')).rejects.toMatchObject({
      code: 'GOOGLE_API_CONFIG',
    })
  })

  it('does not describe a Drive or Sheets permission denial as a sign-in failure', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            error: {
              code: 403,
              message: 'Insufficient authentication scopes.',
              errors: [{ reason: 'insufficientPermissions' }],
            },
          }),
          { status: 403 },
        ),
      ),
    )

    await expect(client.request('https://www.googleapis.com/drive/v3/files')).rejects.toMatchObject({
      code: 'GOOGLE_API_PERMISSION',
      friendlyMessage: expect.not.stringContaining('Sign in with Google'),
    })
  })

  it('labels other forbidden API responses as access errors', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: { message: 'Forbidden' } }), { status: 403 })),
    )

    await expect(client.request('https://www.googleapis.com/drive/v3/files')).rejects.toMatchObject({
      code: 'GOOGLE_API_ACCESS',
    })
  })
})
