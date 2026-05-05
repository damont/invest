import { useRouter } from '../../hooks/useRouter'
import type { DashboardStock } from '../../types'
import ChangeBadge from './ChangeBadge'
import Sparkline from './Sparkline'
import { formatTimeAgo } from './format'

interface Props {
  item: DashboardStock
}

export default function ThesisChangeCard({ item }: Props) {
  const { navigate } = useRouter()
  const { stock, thesis, snapshot, change_pct, spark } = item
  if (!thesis?.recent_change) return null
  const price = snapshot?.price
  const change = change_pct ?? 0

  return (
    <div className="thesis-card" tabIndex={0}>
      <div className="thesis-card-top">
        <div className="thesis-card-ticker">
          <span className="ticker-mono">{stock.ticker}</span>
          <span className="thesis-card-name">{stock.name}</span>
        </div>
        <span className="thesis-updated-badge">
          <span className="dot dot-accent" /> Thesis updated · {formatTimeAgo(thesis.recent_change_at)}
        </span>
      </div>
      <p className="thesis-delta">{thesis.recent_change}</p>
      <div className="thesis-card-foot">
        <span className="thesis-card-meta">{price != null ? `$${price.toFixed(2)}` : '—'}</span>
        {change_pct != null && <ChangeBadge change={change} />}
        {spark.length > 1 && (
          <span className="thesis-card-spark">
            <Sparkline data={spark} change={change} width={72} height={20} />
          </span>
        )}
        <button
          className="link-btn"
          onClick={() => navigate(`/stocks/${stock.id}`)}
        >
          Read full thesis →
        </button>
      </div>
    </div>
  )
}
