export interface User {
  id: string
  name: string | null
  email: string
}

export interface RelatedStock {
  ticker: string
  name?: string | null
  relation?: string | null
}

export interface Stock {
  id: string
  ticker: string
  name: string
  sector: string | null
  exchange: string | null
  related: RelatedStock[]
  archived: boolean
  pinned: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

export interface AiThesis {
  id: string
  content_md: string
  model: string | null
  version: number
  generated_at: string
}

export interface ThesisCombined {
  user_md: string
  user_updated_at: string | null
  ai: AiThesis | null
}

export type NewsTag = 'recent' | 'long_term'
export type Sentiment = 'bullish' | 'bearish' | 'neutral' | 'mixed'

export interface NewsItem {
  id: string
  headline: string
  source: string
  url: string
  summary: string | null
  published_at: string | null
  tag: NewsTag
  sentiment: Sentiment | null
  relevance_score: number | null
  is_read: boolean
  ingested_at: string
}

export interface PricePoint {
  id: string
  date: string
  open: number
  close: number
  high: number
  low: number
  volume: number
  captured_at: string
}

export interface StockSnapshot {
  id: string
  captured_at: string
  price: number | null
  market_cap: number | null
  pe_ratio: number | null
  eps: number | null
  dividend_yield: number | null
  beta: number | null
  high_52w: number | null
  low_52w: number | null
  high_all_time: number | null
  low_all_time: number | null
  avg_volume_30d: number | null
  shares_outstanding: number | null
}

export interface YouTubeLink {
  id: string
  title: string
  url: string
  channel: string | null
  notes: string | null
  duration_seconds: number | null
  watched: boolean
  published_at: string | null
  curated_at: string
}
