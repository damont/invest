import { useEffect, useState } from 'react'
import { api } from '../../api/client'
import type { YouTubeLink } from '../../types'

interface Props {
  stockId: string
}

function fmtDuration(seconds: number | null): string {
  if (!seconds) return ''
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  if (m >= 60) {
    const h = Math.floor(m / 60)
    return `${h}h ${m % 60}m`
  }
  return `${m}m ${s.toString().padStart(2, '0')}s`
}

export default function YouTubePanel({ stockId }: Props) {
  const [items, setItems] = useState<YouTubeLink[] | null>(null)

  const load = async () => {
    try {
      setItems(await api.get<YouTubeLink[]>(`/api/stocks/${stockId}/youtube`))
    } catch {
      setItems([])
    }
  }

  useEffect(() => {
    load()
  }, [stockId])

  const toggleWatched = async (item: YouTubeLink) => {
    const updated = await api.patch<YouTubeLink>(
      `/api/stocks/${stockId}/youtube/${item.id}`,
      { watched: !item.watched },
    )
    setItems((cur) => cur?.map((y) => (y.id === item.id ? updated : y)) ?? null)
  }

  return (
    <section className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-lg p-4 space-y-3">
      <h3 className="text-lg font-semibold text-[var(--text-primary)]">YouTube</h3>
      {items === null ? (
        <p className="text-sm text-[var(--text-muted)]">Loading…</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-[var(--text-muted)] italic">No videos curated yet.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((y) => (
            <li
              key={y.id}
              className="flex gap-3 items-start p-2 rounded hover:bg-[var(--bg-raised)]"
            >
              <input
                type="checkbox"
                checked={y.watched}
                onChange={() => toggleWatched(y)}
                className="mt-1"
                title="Watched"
              />
              <div className="flex-1 min-w-0">
                <a
                  href={y.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`text-sm hover:underline ${
                    y.watched ? 'text-[var(--text-secondary)]' : 'text-[var(--text-primary)]'
                  }`}
                >
                  {y.title}
                </a>
                <div className="flex flex-wrap gap-x-2 text-xs text-[var(--text-muted)] mt-0.5">
                  {y.channel && <span>{y.channel}</span>}
                  {y.duration_seconds && <span>· {fmtDuration(y.duration_seconds)}</span>}
                  {y.published_at && (
                    <span>· {new Date(y.published_at).toLocaleDateString()}</span>
                  )}
                </div>
                {y.notes && (
                  <p className="text-xs text-[var(--text-secondary)] mt-1">{y.notes}</p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
