import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ThesisPanel from './ThesisPanel'

const initialThesis = {
  user_md: 'My take',
  user_updated_at: '2026-05-01T00:00:00Z',
  ai: {
    id: 'ai-1',
    content_md: 'Agent says hold.',
    model: 'claude-opus-4-7',
    version: 2,
    generated_at: '2026-05-02T00:00:00Z',
  },
}

describe('ThesisPanel', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('renders both user and AI thesis content', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => initialThesis,
      }),
    )

    render(<ThesisPanel stockId="abc" />)
    await waitFor(() => expect(screen.getByText('My take')).toBeInTheDocument())
    expect(screen.getByText('Agent says hold.')).toBeInTheDocument()
    expect(screen.getByText(/v2/)).toBeInTheDocument()
    expect(screen.getByText(/claude-opus-4-7/)).toBeInTheDocument()
  })

  it('saves edits via PUT and exits edit mode', async () => {
    const user = userEvent.setup()
    const updated = { ...initialThesis, user_md: 'Updated take' }
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => initialThesis })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => updated })
    vi.stubGlobal('fetch', fetchMock)

    render(<ThesisPanel stockId="abc" />)
    await waitFor(() => screen.getByText('My take'))

    await user.click(screen.getByRole('button', { name: /Edit/i }))
    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement
    await user.clear(textarea)
    await user.type(textarea, 'Updated take')
    await user.click(screen.getByRole('button', { name: /^Save$/i }))

    await waitFor(() => expect(screen.getByText('Updated take')).toBeInTheDocument())

    // The PUT call was made with the new content
    const putCall = fetchMock.mock.calls.find((c: unknown[]) => (c[1] as { method?: string })?.method === 'PUT')
    expect(putCall).toBeDefined()
    expect(JSON.parse((putCall![1] as { body: string }).body)).toEqual({ content_md: 'Updated take' })
  })

  it('shows placeholder text when no AI thesis exists', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ user_md: '', user_updated_at: null, ai: null }),
      }),
    )
    render(<ThesisPanel stockId="abc" />)
    await waitFor(() =>
      expect(screen.getByText(/agent will fill this/i)).toBeInTheDocument(),
    )
    expect(screen.getByText(/No thesis yet/i)).toBeInTheDocument()
  })
})
