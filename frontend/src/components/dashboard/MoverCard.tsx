import { useRouter } from '../../hooks/useRouter'
import type { DashboardStock } from '../../types'
import ChangeBadge from './ChangeBadge'
import Sparkline from './Sparkline'

interface Props {
  item: DashboardStock
}

export default function MoverCard({ item }: Props) {
  const { navigate } = useRouter()
  const { stock, change_pct, spark, snapshot, latest_news } = item
  const change = change_pct ?? 0
  return (
    <div
      className="mover-card"
      tabIndex={0}
      role="link"
      onClick={() => navigate(`/stocks/${stock.id}`)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') navigate(`/stocks/${stock.id}`)
      }}
    >
      <div className="mover-card-head">
        <span className="ticker-mono">{stock.ticker}</span>
        {change_pct != null && <ChangeBadge change={change} />}
      </div>
      <div className="mover-card-spark">
        {spark.length > 1 && <Sparkline data={spark} change={change} width={180} height={36} />}
      </div>
      <div className="mover-card-foot">
        <span className="mover-price">
          {snapshot?.price != null ? `$${snapshot.price.toFixed(2)}` : '—'}
        </span>
        {latest_news && (
          <span className="mover-news" title={latest_news.headline}>
            {latest_news.headline}
          </span>
        )}
      </div>
    </div>
  )
}
