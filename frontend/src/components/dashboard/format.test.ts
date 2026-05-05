import { describe, it, expect } from 'vitest'
import type { DashboardStock, Stock } from '../../types'
import {
  hasRecentThesisChange,
  isBigMover,
  sortStocks,
  RECENT_THESIS_WINDOW_DAYS,
} from './format'

const baseStock = (id: string, ticker: string): Stock => ({
  id,
  ticker,
  name: `${ticker} Inc`,
  sector: null,
  exchange: null,
  related: [],
  archived: false,
  pinned: false,
  sort_order: 0,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
})

const baseItem = (overrides: Partial<DashboardStock> & { id: string; ticker: string }): DashboardStock => ({
  stock: baseStock(overrides.id, overrides.ticker),
  snapshot: null,
  spark: [],
  change_pct: null,
  thesis: null,
  latest_news: null,
  latest_video: null,
  ...overrides,
  // ensure stock survives override
  ...(overrides.stock ? {} : {}),
})

describe('isBigMover', () => {
  it('returns true at +5% / -5%', () => {
    expect(isBigMover(baseItem({ id: '1', ticker: 'A', change_pct: 5 }))).toBe(true)
    expect(isBigMover(baseItem({ id: '2', ticker: 'B', change_pct: -5.1 }))).toBe(true)
  })
  it('returns false below threshold or null', () => {
    expect(isBigMover(baseItem({ id: '1', ticker: 'A', change_pct: 4.99 }))).toBe(false)
    expect(isBigMover(baseItem({ id: '2', ticker: 'B', change_pct: null }))).toBe(false)
  })
})

describe('hasRecentThesisChange', () => {
  const now = new Date('2026-05-05T12:00:00Z').getTime()
  const insideWindow = new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString()
  const outsideWindow = new Date(
    now - (RECENT_THESIS_WINDOW_DAYS + 1) * 24 * 60 * 60 * 1000,
  ).toISOString()

  it('true for thesis with recent_change inside window', () => {
    const item = baseItem({
      id: '1',
      ticker: 'A',
      thesis: {
        content_md: '',
        version: 1,
        generated_at: insideWindow,
        recent_change: 'upgraded',
        recent_change_at: insideWindow,
      },
    })
    expect(hasRecentThesisChange(item, now)).toBe(true)
  })

  it('false when recent_change is null even if recent_change_at set', () => {
    const item = baseItem({
      id: '1',
      ticker: 'A',
      thesis: {
        content_md: '',
        version: 1,
        generated_at: insideWindow,
        recent_change: null,
        recent_change_at: insideWindow,
      },
    })
    expect(hasRecentThesisChange(item, now)).toBe(false)
  })

  it('false when outside window', () => {
    const item = baseItem({
      id: '1',
      ticker: 'A',
      thesis: {
        content_md: '',
        version: 1,
        generated_at: outsideWindow,
        recent_change: 'old',
        recent_change_at: outsideWindow,
      },
    })
    expect(hasRecentThesisChange(item, now)).toBe(false)
  })

  it('false when no thesis', () => {
    expect(hasRecentThesisChange(baseItem({ id: '1', ticker: 'A' }), now)).toBe(false)
  })
})

describe('sortStocks', () => {
  const items: DashboardStock[] = [
    baseItem({ id: '1', ticker: 'BBB', change_pct: 2 }),
    baseItem({ id: '2', ticker: 'AAA', change_pct: -8 }),
    baseItem({ id: '3', ticker: 'CCC', change_pct: 6 }),
  ]

  it('movers sorts by absolute change desc', () => {
    expect(sortStocks(items, 'movers').map((i) => i.stock.ticker)).toEqual(['AAA', 'CCC', 'BBB'])
  })

  it('alpha sorts alphabetically', () => {
    expect(sortStocks(items, 'alpha').map((i) => i.stock.ticker)).toEqual(['AAA', 'BBB', 'CCC'])
  })

  it('thesis sorts by most recent change_at desc, ticker tiebreaker', () => {
    const t = (iso: string | null) => ({
      content_md: '',
      version: 1,
      generated_at: '2026-01-01T00:00:00Z',
      recent_change: iso ? 'note' : null,
      recent_change_at: iso,
    })
    const arr: DashboardStock[] = [
      baseItem({ id: '1', ticker: 'BBB', thesis: t('2026-05-01T00:00:00Z') }),
      baseItem({ id: '2', ticker: 'AAA', thesis: t('2026-05-04T00:00:00Z') }),
      baseItem({ id: '3', ticker: 'CCC', thesis: t(null) }),
    ]
    expect(sortStocks(arr, 'thesis').map((i) => i.stock.ticker)).toEqual(['AAA', 'BBB', 'CCC'])
  })
})
