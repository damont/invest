import { useState } from 'react'
import { ApiError, api } from '../../api/client'
import type { Stock } from '../../types'

interface Props {
  onClose: () => void
  onCreated: (stock: Stock) => void
}

export default function AddStockDialog({ onClose, onCreated }: Props) {
  const [ticker, setTicker] = useState('')
  const [name, setName] = useState('')
  const [sector, setSector] = useState('')
  const [exchange, setExchange] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const stock = await api.post<Stock>('/api/stocks', {
        ticker: ticker.trim(),
        name: name.trim(),
        sector: sector.trim() || null,
        exchange: exchange.trim() || null,
      })
      onCreated(stock)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to add stock')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-lg p-5 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">Add stock</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          {error && <p className="text-[var(--danger)] text-sm">{error}</p>}
          <input
            type="text"
            placeholder="Ticker (e.g. NVDA)"
            value={ticker}
            onChange={(e) => setTicker(e.target.value.toUpperCase())}
            required
            maxLength={12}
            autoFocus
            className="w-full px-3 py-2 bg-[var(--bg-raised)] border border-[var(--border-color)] rounded text-[var(--text-primary)] min-h-[44px] sm:min-h-0"
          />
          <input
            type="text"
            placeholder="Company name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full px-3 py-2 bg-[var(--bg-raised)] border border-[var(--border-color)] rounded text-[var(--text-primary)] min-h-[44px] sm:min-h-0"
          />
          <input
            type="text"
            placeholder="Sector (optional)"
            value={sector}
            onChange={(e) => setSector(e.target.value)}
            className="w-full px-3 py-2 bg-[var(--bg-raised)] border border-[var(--border-color)] rounded text-[var(--text-primary)] min-h-[44px] sm:min-h-0"
          />
          <input
            type="text"
            placeholder="Exchange (optional)"
            value={exchange}
            onChange={(e) => setExchange(e.target.value)}
            className="w-full px-3 py-2 bg-[var(--bg-raised)] border border-[var(--border-color)] rounded text-[var(--text-primary)] min-h-[44px] sm:min-h-0"
          />
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 border border-[var(--border-color)] rounded text-sm text-[var(--text-secondary)] min-h-[44px] sm:min-h-0"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white rounded font-medium text-sm min-h-[44px] sm:min-h-0 disabled:opacity-50"
            >
              {loading ? 'Adding…' : 'Add'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
