import { useEffect, useState } from 'react'
import { api } from '../../api/client'
import { useRouter } from '../../hooks/useRouter'
import type { DashboardResponse, DashboardStock } from '../../types'
import MarketBar from '../dashboard/MarketBar'
import MoverCard from '../dashboard/MoverCard'
import PriorityStrip from '../dashboard/PriorityStrip'
import StockListSection from '../dashboard/StockListSection'
import ThesisChangeCard from '../dashboard/ThesisChangeCard'
import VideoCard from '../dashboard/VideoCard'
import {
  type SortId,
  hasRecentThesisChange,
  isBigMover,
} from '../dashboard/format'
import AddStockDialog from './AddStockDialog'

export default function StockList() {
  const { navigate } = useRouter()
  const [data, setData] = useState<DashboardStock[] | null>(null)
  const [error, setError] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [sortId, setSortId] = useState<SortId>('movers')

  const load = async () => {
    setError('')
    try {
      const res = await api.get<DashboardResponse>('/api/stocks/dashboard')
      setData(res.stocks)
    } catch {
      setError('Failed to load dashboard')
    }
  }

  useEffect(() => {
    load()
  }, [])

  if (data === null) {
    return <p className="text-[var(--text-secondary)] text-sm">Loading…</p>
  }

  const thesisChanged = data.filter((s) => hasRecentThesisChange(s))
  const bigMovers = data
    .filter((s) => isBigMover(s))
    .sort((a, b) => Math.abs(b.change_pct ?? 0) - Math.abs(a.change_pct ?? 0))
  const newVideos = data
    .filter((s) => !!s.latest_video)
    .sort((a, b) => {
      const ad = a.latest_video?.published_at ?? a.latest_video?.curated_at ?? ''
      const bd = b.latest_video?.published_at ?? b.latest_video?.curated_at ?? ''
      return bd.localeCompare(ad)
    })

  return (
    <div className="space-y-4">
      {error && <p className="text-[var(--danger)] text-sm">{error}</p>}

      <MarketBar items={data} />

      <PriorityStrip
        eyebrow="Action needed"
        title="Thesis updates"
        items={thesisChanged}
        renderItem={(s) => <ThesisChangeCard item={s} />}
        empty="No thesis changes recently."
      />

      <PriorityStrip
        eyebrow="Big moves"
        title="±5% movers"
        items={bigMovers}
        renderItem={(s) => <MoverCard item={s} />}
        empty="No 5%+ moves on your watchlist today."
      />

      <PriorityStrip
        eyebrow="New today"
        title="YouTube videos"
        items={newVideos}
        renderItem={(s) => <VideoCard item={s} />}
        empty="No new videos today."
      />

      {data.length === 0 ? (
        <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-lg p-8 text-center">
          <p className="text-sm text-[var(--text-secondary)]">
            No stocks yet. Add your first to start tracking.
          </p>
        </div>
      ) : (
        <StockListSection items={data} sortId={sortId} onSortChange={setSortId} />
      )}

      <div className="flex justify-end">
        <button
          onClick={() => setShowAdd(true)}
          className="w-full sm:w-auto px-4 py-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white rounded text-sm min-h-[44px] sm:min-h-0"
        >
          + Add stock
        </button>
      </div>

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
