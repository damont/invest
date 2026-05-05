import { useRouter } from '../../hooks/useRouter'
import type { DashboardStock } from '../../types'
import ChangeBadge from './ChangeBadge'
import Sparkline from './Sparkline'
import { SORT_OPTIONS, type SortId, formatTimeAgo, sortStocks } from './format'

interface Props {
  items: DashboardStock[]
  sortId: SortId
  onSortChange: (id: SortId) => void
}

export default function StockListSection({ items, sortId, onSortChange }: Props) {
  const sorted = sortStocks(items, sortId)
  return (
    <section className="stock-list-section">
      <div className="section-header">
        <div className="section-header-left">
          <span className="section-eyebrow">Watchlist</span>
          <h2 className="section-title">All stocks</h2>
          <span className="section-count">{items.length}</span>
        </div>
        <div className="sort-control">
          <span className="sort-label">Sort by</span>
          <div className="sort-buttons">
            {SORT_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                className={`sort-btn ${sortId === opt.id ? 'is-active' : ''}`}
                onClick={() => onSortChange(opt.id)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="stock-list">
        <div className="stock-list-head density-rich">
          <div className="cell cell-id">Ticker</div>
          <div className="cell cell-price">Price · Today</div>
          <div className="cell cell-spark">24h</div>
          <div className="cell cell-thesis">AI thesis</div>
          <div className="cell cell-conviction">Updated</div>
          <div className="cell cell-chev"></div>
        </div>
        {sorted.map((item) => (
          <StockRow key={item.stock.id} item={item} />
        ))}
      </div>
    </section>
  )
}

function StockRow({ item }: { item: DashboardStock }) {
  const { navigate } = useRouter()
  const { stock, snapshot, change_pct, spark, thesis } = item
  const change = change_pct ?? 0
  const hasRecentChange = !!thesis?.recent_change && !!thesis?.recent_change_at

  return (
    <div className="stock-row density-rich">
      <a
        href={`/stocks/${stock.id}`}
        onClick={(e) => {
          e.preventDefault()
          navigate(`/stocks/${stock.id}`)
        }}
        className="stock-row-main"
        style={{ display: 'grid', textDecoration: 'none' }}
      >
        <div className="cell cell-id">
          <div className="ticker-block">
            <span className="ticker-mono lg">{stock.ticker}</span>
            {hasRecentChange && <span className="dot-thesis" title="Thesis updated" />}
          </div>
          <span className="row-name">{stock.name}</span>
        </div>
        <div className="cell cell-price">
          <span className="row-price">
            {snapshot?.price != null ? `$${snapshot.price.toFixed(2)}` : '—'}
          </span>
          {change_pct != null && <ChangeBadge change={change} />}
        </div>
        <div className="cell cell-spark">
          {spark.length > 1 && <Sparkline data={spark} change={change} width={120} height={32} />}
        </div>
        <div className="cell cell-thesis">
          <p className="row-thesis">
            {thesis?.recent_change || thesis?.content_md || (
              <span style={{ color: 'var(--fg-faint)' }}>No thesis yet</span>
            )}
          </p>
          {thesis && (
            <span className="row-thesis-meta">
              Updated {formatTimeAgo(thesis.recent_change_at ?? thesis.generated_at)}
            </span>
          )}
        </div>
        <div className="cell cell-conviction">
          <span className="row-thesis-meta">
            {thesis ? `v${thesis.version}` : '—'}
          </span>
        </div>
        <div className="cell cell-chev">
          <span className="chev">›</span>
        </div>
      </a>
    </div>
  )
}
