import { useEffect, useState } from 'react'
import type { DashboardStock } from '../../types'
import ChangeBadge from './ChangeBadge'

interface Props {
  items: DashboardStock[]
}

export default function MarketBar({ items }: Props) {
  const withChange = items.filter((s) => s.change_pct != null)
  const winners = withChange.filter((s) => (s.change_pct ?? 0) >= 0).length
  const avgChange =
    withChange.length === 0
      ? null
      : withChange.reduce((a, s) => a + (s.change_pct ?? 0), 0) / withChange.length

  const [now, setNow] = useState(() => formatClock())
  useEffect(() => {
    const t = setInterval(() => setNow(formatClock()), 30_000)
    return () => clearInterval(t)
  }, [])

  return (
    <div className="market-bar">
      <div className="market-stat">
        <span className="market-stat-label">Watchlist</span>
        <span className="market-stat-val">{items.length} stocks</span>
      </div>
      <div className="market-stat">
        <span className="market-stat-label">Today</span>
        <span className="market-stat-val">
          {avgChange == null ? '—' : <ChangeBadge change={avgChange} />}
        </span>
      </div>
      <div className="market-stat">
        <span className="market-stat-label">Winners</span>
        <span className="market-stat-val">
          {withChange.length === 0 ? '—' : `${winners} / ${withChange.length}`}
        </span>
      </div>
      <div className="market-bar-time">
        <span className="market-status-dot" />
        {now}
      </div>
    </div>
  )
}

function formatClock(): string {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}
