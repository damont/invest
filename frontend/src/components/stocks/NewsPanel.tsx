import { useEffect, useState } from 'react'
import { api } from '../../api/client'
import type { NewsItem, NewsTag } from '../../types'

interface Props {
  stockId: string
}

const sentimentColor: Record<string, string> = {
  bullish: 'var(--success)',
  bearish: 'var(--danger)',
  neutral: 'var(--text-muted)',
  mixed: 'var(--warning)',
}

export default function NewsPanel({ stockId }: Props) {
  const [items, setItems] = useState<NewsItem[] | null>(null)
  const [tag, setTag] = useState<NewsTag | 'all'>('all')

  const load = async () => {
    const url =
      tag === 'all'
        ? `/api/stocks/${stockId}/news?limit=50`
        : `/api/stocks/${stockId}/news?tag=${tag}&limit=50`
    try {
      setItems(await api.get<NewsItem[]>(url))
    } catch {
      setItems([])
    }
  }

  useEffect(() => {
    load()
  }, [stockId, tag])

  const toggleRead = async (item: NewsItem) => {
    const updated = await api.patch<NewsItem>(
      `/api/stocks/${stockId}/news/${item.id}`,
      { is_read: !item.is_read },
    )
    setItems((cur) => cur?.map((n) => (n.id === item.id ? updated : n)) ?? null)
  }

  return (
    <section className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-[var(--text-primary)]">News</h3>
        <div className="flex gap-1 text-xs">
          {(['all', 'recent', 'long_term'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTag(t)}
              className={`px-2 py-1 rounded ${
                tag === t
                  ? 'bg-[var(--selected-bg)] text-[var(--accent)]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              {t === 'long_term' ? 'long term' : t}
            </button>
          ))}
        </div>
      </div>
      {items === null ? (
        <p className="text-sm text-[var(--text-muted)]">Loading…</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-[var(--text-muted)] italic">No news yet.</p>
      ) : (
        <ul className="divide-y divide-[var(--border-color)]">
          {items.map((n) => (
            <li key={n.id} className="py-3 flex gap-3 items-start">
              <button
                onClick={() => toggleRead(n)}
                className="mt-1 shrink-0"
                title={n.is_read ? 'Mark unread' : 'Mark read'}
              >
                <span
                  className={`block w-2.5 h-2.5 rounded-full ${
                    n.is_read ? 'bg-[var(--text-muted)]' : 'bg-[var(--accent)]'
                  }`}
                />
              </button>
              <div className="flex-1 min-w-0">
                <a
                  href={n.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`text-sm ${
                    n.is_read ? 'text-[var(--text-secondary)]' : 'text-[var(--text-primary)]'
                  } hover:underline`}
                >
                  {n.headline}
                </a>
                <div className="flex flex-wrap gap-x-2 text-xs text-[var(--text-muted)] mt-1">
                  <span>{n.source}</span>
                  {n.published_at && <span>· {new Date(n.published_at).toLocaleDateString()}</span>}
                  {n.sentiment && (
                    <span style={{ color: sentimentColor[n.sentiment] }}>
                      · {n.sentiment}
                    </span>
                  )}
                  {n.relevance_score !== null && (
                    <span>· relevance {(n.relevance_score * 100).toFixed(0)}%</span>
                  )}
                </div>
                {n.summary && (
                  <p className="text-xs text-[var(--text-secondary)] mt-1">{n.summary}</p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
