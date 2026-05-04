import { useEffect, useState } from 'react'
import { api } from '../../api/client'
import { useRouter } from '../../hooks/useRouter'
import type { Stock } from '../../types'
import AddStockDialog from './AddStockDialog'

export default function StockList() {
  const { navigate } = useRouter()
  const [stocks, setStocks] = useState<Stock[] | null>(null)
  const [error, setError] = useState('')
  const [showAdd, setShowAdd] = useState(false)

  const load = async () => {
    setError('')
    try {
      const data = await api.get<Stock[]>('/api/stocks')
      setStocks(data)
    } catch {
      setError('Failed to load stocks')
    }
  }

  useEffect(() => {
    load()
  }, [])

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h2 className="text-xl font-semibold text-[var(--text-primary)]">Watchlist</h2>
        <button
          onClick={() => setShowAdd(true)}
          className="w-full sm:w-auto px-4 py-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white rounded text-sm min-h-[44px] sm:min-h-0"
        >
          + Add stock
        </button>
      </div>

      {error && <p className="text-[var(--danger)] text-sm">{error}</p>}

      {stocks === null ? (
        <p className="text-[var(--text-muted)] text-sm">Loading…</p>
      ) : stocks.length === 0 ? (
        <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-lg p-8 text-center">
          <p className="text-sm text-[var(--text-secondary)]">
            No stocks yet. Add your first to start tracking.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {stocks.map((s) => (
            <a
              key={s.id}
              href={`/stocks/${s.id}`}
              onClick={(e) => {
                e.preventDefault()
                navigate(`/stocks/${s.id}`)
              }}
              className="block bg-[var(--bg-surface)] border border-[var(--border-color)] hover:border-[var(--accent)] rounded-lg p-4 transition-colors"
            >
              <div className="flex items-baseline justify-between">
                <span className="text-lg font-semibold text-[var(--text-primary)]">
                  {s.ticker}
                </span>
                {s.pinned && <span className="text-xs text-[var(--warning)]">★ pinned</span>}
              </div>
              <p className="text-sm text-[var(--text-secondary)] truncate">{s.name}</p>
              {s.sector && (
                <p className="text-xs text-[var(--text-muted)] mt-1">{s.sector}</p>
              )}
            </a>
          ))}
        </div>
      )}

      {showAdd && (
        <AddStockDialog
          onClose={() => setShowAdd(false)}
          onCreated={(stock) => {
            setShowAdd(false)
            navigate(`/stocks/${stock.id}`)
          }}
        />
      )}
    </div>
  )
}
