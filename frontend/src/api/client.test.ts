import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError, api } from './client'

describe('ApiClient', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('omits Authorization header when no token is set', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ ok: true }),
    })
    vi.stubGlobal('fetch', fetchMock)

    await api.get('/api/health')

    const headers = fetchMock.mock.calls[0]?.[1]?.headers as Record<string, string>
    expect(headers).toBeDefined()
    expect(headers.Authorization).toBeUndefined()
  })

  it('includes Bearer token when set', async () => {
    localStorage.setItem('token', 'tok-abc')
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({}),
    })
    vi.stubGlobal('fetch', fetchMock)

    await api.get('/api/auth/me')

    const headers = fetchMock.mock.calls[0]?.[1]?.headers as Record<string, string>
    expect(headers.Authorization).toBe('Bearer tok-abc')
  })

  it('clears token and throws ApiError(401) on 401', async () => {
    localStorage.setItem('token', 'expired')
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 401 }),
    )

    await expect(api.get('/api/auth/me')).rejects.toBeInstanceOf(ApiError)
    expect(localStorage.getItem('token')).toBeNull()
  })

  it('throws ApiError carrying status and detail message', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 409,
        json: async () => ({ detail: 'Stock already in your watchlist' }),
      }),
    )

    try {
      await api.post('/api/stocks', { ticker: 'GOOG' })
      throw new Error('expected throw')
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError)
      expect((err as ApiError).status).toBe(409)
      expect((err as ApiError).message).toBe('Stock already in your watchlist')
    }
  })

  it('returns undefined for 204 responses', async () => {
    localStorage.setItem('token', 't')
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, status: 204 }),
    )
    const result = await api.delete('/api/stocks/123')
    expect(result).toBeUndefined()
  })

  it('verifyEmail posts the token', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ access_token: 'new-token', token_type: 'bearer' }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const result = await api.verifyEmail('verify-token-123')

    expect(result.access_token).toBe('new-token')
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/auth/verify-email',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ token: 'verify-token-123' }),
      }),
    )
  })
})
