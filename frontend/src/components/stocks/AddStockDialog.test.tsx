import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AddStockDialog from './AddStockDialog'

const mockStock = {
  id: 'stock-1',
  ticker: 'GOOG',
  name: 'Alphabet',
  sector: null,
  exchange: null,
  related: [],
  archived: false,
  pinned: false,
  sort_order: 0,
  created_at: '2026-05-04T00:00:00Z',
  updated_at: '2026-05-04T00:00:00Z',
}

describe('AddStockDialog', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('uppercases ticker as user types', async () => {
    const user = userEvent.setup()
    render(<AddStockDialog onClose={vi.fn()} onCreated={vi.fn()} />)

    const input = screen.getByPlaceholderText(/Ticker/i) as HTMLInputElement
    await user.type(input, 'goog')
    expect(input.value).toBe('GOOG')
  })

  it('submits and calls onCreated with the stock', async () => {
    const user = userEvent.setup()
    const onCreated = vi.fn()
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => mockStock,
    })
    vi.stubGlobal('fetch', fetchMock)

    render(<AddStockDialog onClose={vi.fn()} onCreated={onCreated} />)

    await user.type(screen.getByPlaceholderText(/Ticker/i), 'goog')
    await user.type(screen.getByPlaceholderText(/Company name/i), 'Alphabet')
    await user.click(screen.getByRole('button', { name: /^Add$/i }))

    await waitFor(() => expect(onCreated).toHaveBeenCalledWith(mockStock))
    const body = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(body.ticker).toBe('GOOG')
    expect(body.name).toBe('Alphabet')
    expect(body.sector).toBeNull()
  })

  it('shows the API error message on 409', async () => {
    const user = userEvent.setup()
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 409,
        json: async () => ({ detail: 'Stock already in your watchlist' }),
      }),
    )

    render(<AddStockDialog onClose={vi.fn()} onCreated={vi.fn()} />)
    await user.type(screen.getByPlaceholderText(/Ticker/i), 'GOOG')
    await user.type(screen.getByPlaceholderText(/Company name/i), 'Alphabet')
    await user.click(screen.getByRole('button', { name: /^Add$/i }))

    await waitFor(() =>
      expect(screen.getByText(/already in your watchlist/i)).toBeInTheDocument(),
    )
  })

  it('calls onClose when Cancel is clicked', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<AddStockDialog onClose={onClose} onCreated={vi.fn()} />)
    await user.click(screen.getByRole('button', { name: /Cancel/i }))
    expect(onClose).toHaveBeenCalled()
  })
})
