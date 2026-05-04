import { useEffect, useState } from 'react'
import { api } from '../../api/client'
import { useRouter } from '../../hooks/useRouter'
import type { RelatedStock, Stock } from '../../types'

interface Props {
  related: RelatedStock[]
}

export default function RelatedPanel({ related }: Props) {
  const { navigate } = useRouter()
  const [trackedByTicker, setTrackedByTicker] = useState<Map<string, Stock>>(new Map())

  useEffect(() => {
    api
      .get<Stock[]>('/api/stocks?include_archived=true')
      .then((all) => {
        const m = new Map<string, Stock>()
        for (const s of all) m.set(s.ticker, s)
        setTrackedByTicker(m)
      })
      .catch(() => {})
  }, [])

  if (related.length === 0) {
    return (
      <section className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-lg p-4 space-y-3">
        <h3 className="text-lg font-semibold text-[var(--text-primary)]">Related</h3>
        <p className="text-sm text-[var(--text-muted)] italic">No related stocks yet.</p>
      </section>
    )
  }

  return (
    <section className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-lg p-4 space-y-3">
      <h3 className="text-lg font-semibold text-[var(--text-primary)]">Related</h3>
      <div className="flex flex-wrap gap-2">
        {related.map((r) => {
          const tracked = trackedByTicker.get(r.ticker)
          const chip = (
            <span
              className={`inline-flex items-baseline gap-2 px-3 py-1.5 rounded-full text-sm border ${
                tracked
                  ? 'border-[var(--accent)] text-[var(--accent)] hover:bg-[var(--selected-bg)] cursor-pointer'
                  : 'border-[var(--border-color)] text-[var(--text-secondary)]'
              }`}
            >
              <strong>{r.ticker}</strong>
              {r.name && <span className="text-xs text-[var(--text-muted)]">{r.name}</span>}
              {r.relation && (
                <span className="text-xs text-[var(--text-muted)] italic">· {r.relation}</span>
              )}
            </span>
          )
          if (tracked) {
            return (
              <a
                key={r.ticker}
                href={`/stocks/${tracked.id}`}
                onClick={(e) => {
                  e.preventDefault()
                  navigate(`/stocks/${tracked.id}`)
                }}
              >
                {chip}
              </a>
            )
          }
          return <span key={r.ticker}>{chip}</span>
        })}
      </div>
    </section>
  )
}
