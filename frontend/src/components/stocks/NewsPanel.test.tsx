import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import NewsPanel from './NewsPanel'

const newsList = [
  {
    id: 'n1',
    headline: 'Beat earnings',
    source: 'Reuters',
    url: 'https://r/1',
    summary: null,
    published_at: '2026-04-30T00:00:00Z',
    tag: 'recent' as const,
    sentiment: 'bullish' as const,
    relevance_score: 0.9,
    is_read: false,
    ingested_at: '2026-05-01T00:00:00Z',
  },
]

describe('NewsPanel', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('renders news with sentiment and toggles is_read', async () => {
    const user = userEvent.setup()
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => newsList })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ ...newsList[0], is_read: true }),
      })
    vi.stubGlobal('fetch', fetchMock)

    render(<NewsPanel stockId="abc" />)
    await waitFor(() => screen.getByText('Beat earnings'))
    expect(screen.getByText(/bullish/i)).toBeInTheDocument()
    expect(screen.getByText(/relevance 90%/i)).toBeInTheDocument()

    // Click the unread/read dot button
    const dot = screen.getByTitle('Mark read')
    await user.click(dot)

    await waitFor(() => {
      const patchCall = fetchMock.mock.calls.find((c: unknown[]) => (c[1] as { method?: string })?.method === 'PATCH')
      expect(patchCall).toBeDefined()
      expect(JSON.parse((patchCall![1] as { body: string }).body)).toEqual({ is_read: true })
    })
  })

  it('switches the tag filter', async () => {
    const user = userEvent.setup()
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => [],
    })
    vi.stubGlobal('fetch', fetchMock)

    render(<NewsPanel stockId="abc" />)
    await waitFor(() => screen.getByText(/No news yet/i))

    await user.click(screen.getByRole('button', { name: /^long term$/i }))
    await waitFor(() => {
      const lastCall = fetchMock.mock.calls[fetchMock.mock.calls.length - 1]
      expect(lastCall[0]).toContain('tag=long_term')
    })
  })
})
