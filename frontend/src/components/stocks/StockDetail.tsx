import { useEffect, useState } from 'react'
import { ApiError, api } from '../../api/client'
import { useRouter } from '../../hooks/useRouter'
import type { Stock } from '../../types'
import NewsPanel from './NewsPanel'
import PricesPanel from './PricesPanel'
import RelatedPanel from './RelatedPanel'
import SnapshotPanel from './SnapshotPanel'
import ThesisPanel from './ThesisPanel'
import YouTubePanel from './YouTubePanel'

interface Props {
  stockId: string
}

export default function StockDetail({ stockId }: Props) {
  const { navigate } = useRouter()
  const [stock, setStock] = useState<Stock | null>(null)
  const [error, setError] = useState('')

  const load = async () => {
    setError('')
    try {
      setStock(await api.get<Stock>(`/api/stocks/${stockId}`))
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setError('Stock not found.')
      } else {
        setError('Failed to load stock.')
      }
    }
  }

  useEffect(() => {
    load()
  }, [stockId])

  const togglePin = async () => {
    if (!stock) return
    const updated = await api.patch<Stock>(`/api/stocks/${stockId}`, {
      pinned: !stock.pinned,
    })
    setStock(updated)
  }

  const toggleArchive = async () => {
    if (!stock) return
    const updated = await api.patch<Stock>(`/api/stocks/${stockId}`, {
      archived: !stock.archived,
    })
    setStock(updated)
  }

  const handleDelete = async () => {
    if (!stock) return
    if (!confirm(`Delete ${stock.ticker} and all its data?`)) return
    await api.delete(`/api/stocks/${stockId}`)
    navigate('/stocks')
  }

  if (error) {
    return (
      <div className="space-y-3">
        <p className="text-[var(--danger)] text-sm">{error}</p>
        <a
          href="/stocks"
          onClick={(e) => {
            e.preventDefault()
            navigate('/stocks')
          }}
          className="text-sm text-[var(--accent)]"
        >
          ← Back to watchlist
        </a>
      </div>
    )
  }

  if (!stock) {
    return <p className="text-[var(--text-muted)] text-sm">Loading…</p>
  }

  return (
    <div className="space-y-4">
      <a
        href="/stocks"
        onClick={(e) => {
          e.preventDefault()
          navigate('/stocks')
        }}
        className="text-sm text-[var(--accent)] inline-block"
      >
        ← Watchlist
      </a>

      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold text-[var(--text-primary)]">
            {stock.ticker}
            {stock.archived && (
              <span className="ml-2 text-xs text-[var(--text-muted)] uppercase tracking-wide">
                archived
              </span>
            )}
          </h1>
          <p className="text-[var(--text-secondary)]">{stock.name}</p>
          <p className="text-xs text-[var(--text-muted)]">
            {[stock.sector, stock.exchange].filter(Boolean).join(' · ')}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={togglePin}
            className="px-3 py-1.5 text-sm border border-[var(--border-color)] rounded text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
            {stock.pinned ? '★ Pinned' : '☆ Pin'}
          </button>
          <button
            onClick={toggleArchive}
            className="px-3 py-1.5 text-sm border border-[var(--border-color)] rounded text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
            {stock.archived ? 'Unarchive' : 'Archive'}
          </button>
          <button
            onClick={handleDelete}
            className="px-3 py-1.5 text-sm border border-[var(--danger)] rounded text-[var(--danger)] hover:bg-[var(--danger)] hover:text-white"
          >
            Delete
          </button>
        </div>
      </header>

      <SnapshotPanel stockId={stockId} />
      <PricesPanel stockId={stockId} />
      <NewsPanel stockId={stockId} />
      <ThesisPanel stockId={stockId} />
      <YouTubePanel stockId={stockId} />
      <RelatedPanel related={stock.related} />
    </div>
  )
}
