import { useEffect, useState } from 'react'
import { api } from '../../api/client'
import type { PricePoint } from '../../types'

interface Props {
  stockId: string
}

function Sparkline({ values }: { values: number[] }) {
  if (values.length < 2) return null
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const w = 240
  const h = 40
  const step = w / (values.length - 1)
  const path = values
    .map((v, i) => {
      const x = i * step
      const y = h - ((v - min) / range) * h
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`
    })
    .join(' ')
  const last = values[values.length - 1]
  const first = values[0]
  const color = last >= first ? 'var(--success)' : 'var(--danger)'
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-12">
      <path d={path} fill="none" stroke={color} strokeWidth="2" />
    </svg>
  )
}

export default function PricesPanel({ stockId }: Props) {
  const [prices, setPrices] = useState<PricePoint[] | null>(null)

  useEffect(() => {
    api
      .get<PricePoint[]>(`/api/stocks/${stockId}/prices?limit=60`)
      .then(setPrices)
      .catch(() => setPrices([]))
  }, [stockId])

  // API returns most-recent first; reverse for chronological sparkline
  const chrono = prices ? [...prices].reverse() : []
  const closes = chrono.map((p) => p.close)
  const recent = prices?.slice(0, 10) ?? []

  return (
    <section className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-lg p-4 space-y-3">
      <h3 className="text-lg font-semibold text-[var(--text-primary)]">Prices</h3>
      {prices === null ? (
        <p className="text-sm text-[var(--text-muted)]">Loading…</p>
      ) : prices.length === 0 ? (
        <p className="text-sm text-[var(--text-muted)] italic">No price data yet.</p>
      ) : (
        <>
          <Sparkline values={closes} />
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-[var(--text-muted)] uppercase tracking-wide">
                  <th className="py-1 pr-3">Date</th>
                  <th className="py-1 pr-3">Open</th>
                  <th className="py-1 pr-3">Close</th>
                  <th className="py-1 pr-3">High</th>
                  <th className="py-1 pr-3">Low</th>
                  <th className="py-1">Volume</th>
                </tr>
              </thead>
              <tbody className="text-[var(--text-primary)]">
                {recent.map((p) => (
                  <tr key={p.id} className="border-t border-[var(--border-color)]">
                    <td className="py-1 pr-3">{p.date}</td>
                    <td className="py-1 pr-3">{p.open.toFixed(2)}</td>
                    <td className="py-1 pr-3">{p.close.toFixed(2)}</td>
                    <td className="py-1 pr-3">{p.high.toFixed(2)}</td>
                    <td className="py-1 pr-3">{p.low.toFixed(2)}</td>
                    <td className="py-1">{p.volume.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  )
}
