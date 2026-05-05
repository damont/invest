// Shared formatters and sort logic for the dashboard.

import type { DashboardStock } from '../../types'

export function formatTimeAgo(iso: string | null | undefined): string {
  if (!iso) return ''
  const then = new Date(iso).getTime()
  const now = Date.now()
  const sec = Math.max(0, Math.floor((now - then) / 1000))
  if (sec < 60) return 'just now'
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h ago`
  const day = Math.floor(hr / 24)
  if (day === 1) return 'Yesterday'
  if (day < 7) return `${day}d ago`
  const wk = Math.floor(day / 7)
  if (wk < 5) return `${wk}w ago`
  return new Date(iso).toLocaleDateString()
}

export function formatDuration(seconds: number | null): string {
  if (seconds == null) return ''
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

export function formatMarketCap(n: number | null): string {
  if (n == null) return '—'
  const abs = Math.abs(n)
  if (abs >= 1e12) return `${(n / 1e12).toFixed(2)}T`
  if (abs >= 1e9) return `${(n / 1e9).toFixed(1)}B`
  if (abs >= 1e6) return `${(n / 1e6).toFixed(1)}M`
  return n.toFixed(0)
}

export function formatVolume(n: number | null): string {
  if (n == null) return '—'
  const abs = Math.abs(n)
  if (abs >= 1e9) return `${(n / 1e9).toFixed(1)}B`
  if (abs >= 1e6) return `${(n / 1e6).toFixed(0)}M`
  if (abs >= 1e3) return `${(n / 1e3).toFixed(0)}K`
  return n.toFixed(0)
}

export type SortId = 'movers' | 'thesis' | 'alpha'

export const SORT_OPTIONS: { id: SortId; label: string }[] = [
  { id: 'movers', label: 'Biggest movers' },
  { id: 'thesis', label: 'Recent thesis update' },
  { id: 'alpha', label: 'Alphabetical' },
]

// Stocks whose latest thesis recent_change_at is within this window count as
// "recent thesis updates" on the priority strip.
export const RECENT_THESIS_WINDOW_DAYS = 7

export function hasRecentThesisChange(item: DashboardStock, nowMs: number = Date.now()): boolean {
  const at = item.thesis?.recent_change_at
  if (!at || !item.thesis?.recent_change) return false
  const ageMs = nowMs - new Date(at).getTime()
  return ageMs <= RECENT_THESIS_WINDOW_DAYS * 24 * 60 * 60 * 1000
}

export function isBigMover(item: DashboardStock, threshold = 5): boolean {
  return item.change_pct != null && Math.abs(item.change_pct) >= threshold
}

export function sortStocks(items: DashboardStock[], sortId: SortId): DashboardStock[] {
  const arr = [...items]
  switch (sortId) {
    case 'movers':
      return arr.sort(
        (a, b) => Math.abs(b.change_pct ?? 0) - Math.abs(a.change_pct ?? 0),
      )
    case 'thesis':
      return arr.sort((a, b) => {
        const ar = a.thesis?.recent_change_at ? new Date(a.thesis.recent_change_at).getTime() : 0
        const br = b.thesis?.recent_change_at ? new Date(b.thesis.recent_change_at).getTime() : 0
        return br - ar || a.stock.ticker.localeCompare(b.stock.ticker)
      })
    case 'alpha':
      return arr.sort((a, b) => a.stock.ticker.localeCompare(b.stock.ticker))
  }
}
