import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AgentTokenSection from './AgentTokenSection'

describe('AgentTokenSection', () => {
  beforeEach(() => {
    localStorage.setItem('token', 'session-token')
  })

  afterEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('shows discovery URLs derived from window.location.origin', () => {
    render(<AgentTokenSection />)
    expect(screen.getByText(/Swagger UI/i)).toBeInTheDocument()
    expect(screen.getByText('/api/openapi.json', { exact: false })).toBeInTheDocument()
  })

  it('mints a token using the session JWT and shows it with a copy button', async () => {
    const user = userEvent.setup()
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        access_token: 'fake.jwt.token',
        token_type: 'bearer',
        expires_in_days: 90,
      }),
    })
    vi.stubGlobal('fetch', fetchMock)

    render(<AgentTokenSection />)

    await user.click(screen.getByRole('button', { name: /^Generate$/i }))
    await user.selectOptions(screen.getByLabelText(/Duration/i), '90')
    await user.click(screen.getByRole('button', { name: /Generate token/i }))

    await waitFor(() =>
      expect(screen.getByText(/Valid for 90 days/i)).toBeInTheDocument(),
    )
    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement
    expect(textarea.value).toBe('fake.jwt.token')
    expect(screen.getByRole('button', { name: /Copy to clipboard/i })).toBeInTheDocument()

    // Confirm session bearer was sent and request body has only the duration
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/auth/agent-token')
    expect((init as { headers: Record<string, string> }).headers.Authorization).toBe(
      'Bearer session-token',
    )
    expect(JSON.parse((init as { body: string }).body)).toEqual({ expires_in_days: 90 })
  })
})
