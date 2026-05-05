import type { DashboardStock } from '../../types'
import { formatDuration, formatTimeAgo } from './format'

interface Props {
  item: DashboardStock
}

export default function VideoCard({ item }: Props) {
  const v = item.latest_video
  if (!v) return null
  const open = () => window.open(v.url, '_blank', 'noopener,noreferrer')
  return (
    <div
      className="video-card"
      tabIndex={0}
      role="link"
      onClick={open}
      onKeyDown={(e) => {
        if (e.key === 'Enter') open()
      }}
    >
      <div className="video-thumb">
        <div className="video-thumb-pattern" />
        {v.duration_seconds != null && (
          <span className="video-duration">{formatDuration(v.duration_seconds)}</span>
        )}
        <span className="video-play">▶</span>
        <span className="video-ticker-tag">{item.stock.ticker}</span>
      </div>
      <div className="video-meta">
        <div className="video-title">{v.title}</div>
        <div className="video-sub">
          {v.channel && <span>{v.channel}</span>}
          {v.channel && (v.published_at || v.curated_at) && <span className="video-dot">·</span>}
          <span>{formatTimeAgo(v.published_at ?? v.curated_at)}</span>
        </div>
      </div>
    </div>
  )
}
