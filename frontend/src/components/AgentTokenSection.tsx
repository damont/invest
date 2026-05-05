import { useState } from 'react'
import { ApiError, api } from '../api/client'
import { agentSkill, downloadSkill } from '../lib/agentSkill'

interface TokenResult {
  access_token: string
  expires_in_days: number
}

const DURATIONS = [
  { value: 1, label: '1 day' },
  { value: 7, label: '7 days' },
  { value: 30, label: '30 days' },
  { value: 90, label: '90 days' },
  { value: 365, label: '365 days' },
]

export default function AgentTokenSection() {
  const [open, setOpen] = useState(false)
  const [expiresInDays, setExpiresInDays] = useState(365)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<TokenResult | null>(null)
  const [copied, setCopied] = useState(false)

  const baseUrl = window.location.origin

  const handleDownloadSkill = () => {
    const md = agentSkill({
      appName: 'invest',
      baseUrl,
      description:
        'invest is a personal stock thesis dashboard. The signed-in user maintains a watchlist of companies, writes their own thesis on each one, and relies on agents to keep adjacent context fresh: news, market data, AI-written counter-thesis, and curated YouTube material. The frontend is read-only for everything except the user-authored thesis — agents own the rest.',
      dataModel:
        "The core resource is a Stock (one per ticker per user). Hanging off each Stock are: a UserThesis (markdown, user-edited only), versioned AiThesis records (markdown, agent-appended; latest is 'current'), NewsItems (with sentiment and relevance score), PricePoints (daily OHLCV bars — bulk-upsertable), StockSnapshots (point-in-time vitals: price, P/E, 52w highs, etc.), YouTubeLinks, and a list of RelatedStocks (free-form references to other tickers, may or may not be tracked).",
      capabilities: [
        'Refresh daily prices for every tracked stock (idempotent bulk upsert by date)',
        'Capture a fresh StockSnapshot of current vitals on a slower cadence (e.g. weekly)',
        'Ingest recent news and tag each item with sentiment + relevance',
        'Append a new AiThesis version when material context shifts (new earnings, regulatory news, etc.)',
        'Curate a small set of high-quality YouTube videos per stock; mark older ones as long-term',
        'Maintain the related-tickers list so the user knows when a competitor or supplier reports earnings',
      ],
      suggestions: [
        'Build an on-demand "current status" skill: when the operator asks "how is GOOG doing?", return the latest StockSnapshot, today\'s price action vs. yesterday, and the top 3 unread news items by relevance score',
        'Set up an hourly job that fetches fresh prices for every tracked stock, writes a StockSnapshot, and alerts the operator if any stock has moved more than ±5% on the day',
        'Set up a daily news digest job: ingest the day\'s headlines for every tracked stock, dedupe across sources, rank by relevance, and surface the top items the operator hasn\'t marked read yet',
        'Set up a weekly AiThesis refresh: re-generate each stock\'s AI thesis given the past week of news + price action, and only persist a new version if the take has materially changed',
        'Watch the related-tickers list and alert the operator when a related (but not tracked) ticker has earnings or major news — that\'s often a leading indicator',
        'Set up a quarterly review skill that summarizes how each stock\'s reality (price action, news flow, financials) has tracked against the operator\'s UserThesis, flagging any divergences worth re-examining',
      ],
    })
    downloadSkill('invest', md)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await api.agentToken(expiresInDays)
      setResult({ access_token: res.access_token, expires_in_days: res.expires_in_days })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to generate token')
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = async () => {
    if (!result) return
    await navigator.clipboard.writeText(result.access_token)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleReset = () => {
    setResult(null)
    setError('')
  }

  const handleClose = () => {
    setOpen(false)
    setResult(null)
    setError('')
  }

  return (
    <section className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Agent tokens</h2>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            Long-lived bearer tokens for agents (openclaw, scripts, MCP). Tokens use the same JWT
            format as the browser session — agents call any endpoint the frontend can.
          </p>
        </div>
        {!open && (
          <div className="shrink-0 flex flex-col sm:flex-row gap-2">
            <button
              onClick={handleDownloadSkill}
              className="px-3 py-1.5 text-sm border border-[var(--border-color)] hover:border-[var(--accent)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded min-h-[44px] sm:min-h-0"
              title="Download the agent skill markdown — hand it to your agent alongside the token"
            >
              Download skill
            </button>
            <button
              onClick={() => setOpen(true)}
              className="px-3 py-1.5 text-sm bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white rounded min-h-[44px] sm:min-h-0"
            >
              Generate
            </button>
          </div>
        )}
      </div>

      <div className="text-xs text-[var(--text-secondary)] space-y-1">
        <div>
          <span className="text-[var(--text-muted)]">Discovery:</span>{' '}
          <a
            href="/api/agent"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--accent)] hover:underline"
          >
            {baseUrl}/api/agent
          </a>{' '}
          <span className="text-[var(--text-muted)]">(Swagger UI)</span>
        </div>
        <div>
          <span className="text-[var(--text-muted)]">Schema:</span>{' '}
          <a
            href="/api/openapi.json"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--accent)] hover:underline"
          >
            {baseUrl}/api/openapi.json
          </a>
        </div>
        <div>
          <span className="text-[var(--text-muted)]">API base:</span>{' '}
          <code className="px-1 py-0.5 rounded bg-[var(--bg-raised)]">{baseUrl}/api/</code>
        </div>
      </div>

      {open && !result && (
        <form
          onSubmit={handleSubmit}
          className="space-y-3 pt-3 border-t border-[var(--border-color)]"
        >
          {error && (
            <div
              className="px-3 py-2 rounded text-sm"
              style={{
                backgroundColor: 'rgba(200, 100, 100, 0.12)',
                border: '1px solid rgba(200, 100, 100, 0.25)',
                color: '#c06464',
              }}
            >
              {error}
            </div>
          )}
          <div>
            <label
              htmlFor="agent-duration"
              className="block text-sm font-medium text-[var(--text-secondary)]"
            >
              Duration
            </label>
            <select
              id="agent-duration"
              value={expiresInDays}
              onChange={(e) => setExpiresInDays(Number(e.target.value))}
              className="mt-1 block w-full px-3 py-2 rounded bg-[var(--bg-raised)] border border-[var(--border-color)] text-[var(--text-primary)] focus:outline-none min-h-[44px] sm:min-h-0"
            >
              {DURATIONS.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 py-2 border border-[var(--border-color)] rounded text-sm text-[var(--text-secondary)] min-h-[44px] sm:min-h-0"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white rounded font-medium text-sm min-h-[44px] sm:min-h-0 disabled:opacity-50"
            >
              {loading ? 'Generating…' : 'Generate token'}
            </button>
          </div>
        </form>
      )}

      {result && (
        <div className="space-y-3 pt-3 border-t border-[var(--border-color)]">
          <div
            className="px-3 py-2 rounded text-sm"
            style={{
              backgroundColor: 'rgba(100, 200, 100, 0.12)',
              border: '1px solid rgba(100, 200, 100, 0.25)',
              color: '#64c064',
            }}
          >
            Token generated. Valid for {result.expires_in_days} day
            {result.expires_in_days !== 1 ? 's' : ''}. Copy it now — once you close this it's gone.
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
              Token
            </label>
            <textarea
              readOnly
              value={result.access_token}
              rows={4}
              className="block w-full px-3 py-2 rounded bg-[var(--bg-raised)] border border-[var(--border-color)] text-[var(--text-primary)] font-mono text-xs"
              style={{ resize: 'none' }}
            />
            <button
              type="button"
              onClick={handleCopy}
              className="mt-2 w-full py-2 rounded text-sm font-medium text-white min-h-[44px] sm:min-h-0"
              style={{ backgroundColor: copied ? '#64c064' : 'var(--accent)' }}
            >
              {copied ? 'Copied!' : 'Copy to clipboard'}
            </button>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleReset}
              className="flex-1 py-2 text-sm text-[var(--accent)] hover:underline"
            >
              Generate another
            </button>
            <button
              onClick={handleClose}
              className="flex-1 py-2 text-sm text-[var(--text-secondary)] hover:underline"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
