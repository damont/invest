import { useEffect, useState } from 'react'
import { api } from '../../api/client'
import type { StockSnapshot } from '../../types'

interface Props {
  stockId: string
}

function fmtMoney(n: number | null | undefined) {
  if (n === null || n === undefined) return '—'
  if (Math.abs(n) >= 1e12) return `$${(n / 1e12).toFixed(2)}T`
  if (Math.abs(n) >= 1e9) return `$${(n / 1e9).toFixed(2)}B`
  if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toFixed(2)}M`
  return `$${n.toFixed(2)}`
}

function fmt(n: number | null | undefined, digits = 2) {
  if (n === null || n === undefined) return '—'
  return n.toFixed(digits)
}

function fmtInt(n: number | null | undefined) {
  if (n === null || n === undefined) return '—'
  return n.toLocaleString()
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-[var(--text-muted)] uppercase tracking-wide">{label}</p>
      <p className="text-sm text-[var(--text-primary)]">{value}</p>
    </div>
  )
}

export default function SnapshotPanel({ stockId }: Props) {
  const [snap, setSnap] = useState<StockSnapshot | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api
      .get<StockSnapshot | null>(`/api/stocks/${stockId}/snapshot`)
      .then(setSnap)
      .catch(() => setSnap(null))
      .finally(() => setLoading(false))
  }, [stockId])

  return (
    <section className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-[var(--text-primary)]">Snapshot</h3>
        {snap && (
          <span className="text-xs text-[var(--text-muted)]">
            captured {new Date(snap.captured_at).toLocaleString()}
          </span>
        )}
      </div>
      {loading ? (
        <p className="text-sm text-[var(--text-muted)]">Loading…</p>
      ) : !snap ? (
        <p className="text-sm text-[var(--text-muted)] italic">
          No snapshot yet. Agent will populate on its next run.
        </p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          <Stat label="Price" value={fmtMoney(snap.price)} />
          <Stat label="Market cap" value={fmtMoney(snap.market_cap)} />
          <Stat label="P/E" value={fmt(snap.pe_ratio)} />
          <Stat label="EPS" value={fmt(snap.eps)} />
          <Stat label="Div yield" value={snap.dividend_yield !== null && snap.dividend_yield !== undefined ? `${(snap.dividend_yield * 100).toFixed(2)}%` : '—'} />
          <Stat label="Beta" value={fmt(snap.beta)} />
          <Stat label="52w high" value={fmtMoney(snap.high_52w)} />
          <Stat label="52w low" value={fmtMoney(snap.low_52w)} />
          <Stat label="ATH" value={fmtMoney(snap.high_all_time)} />
          <Stat label="ATL" value={fmtMoney(snap.low_all_time)} />
          <Stat label="Avg vol 30d" value={fmtInt(snap.avg_volume_30d)} />
          <Stat label="Shares out" value={fmtInt(snap.shares_outstanding)} />
        </div>
      )}
    </section>
  )
}
