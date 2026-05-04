import { useEffect, useState } from 'react'
import { api } from '../../api/client'
import type { ThesisCombined } from '../../types'

interface Props {
  stockId: string
}

function formatDate(iso: string | null) {
  if (!iso) return ''
  return new Date(iso).toLocaleString()
}

export default function ThesisPanel({ stockId }: Props) {
  const [data, setData] = useState<ThesisCombined | null>(null)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const load = async () => {
    setError('')
    try {
      const t = await api.get<ThesisCombined>(`/api/stocks/${stockId}/thesis`)
      setData(t)
      setDraft(t.user_md)
    } catch {
      setError('Failed to load thesis')
    }
  }

  useEffect(() => {
    load()
  }, [stockId])

  const handleSave = async () => {
    setSaving(true)
    try {
      const updated = await api.put<ThesisCombined>(`/api/stocks/${stockId}/thesis`, {
        content_md: draft,
      })
      setData(updated)
      setEditing(false)
    } catch {
      setError('Failed to save thesis')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-lg p-4 space-y-4">
      <h3 className="text-lg font-semibold text-[var(--text-primary)]">Thesis</h3>
      {error && <p className="text-[var(--danger)] text-sm">{error}</p>}

      {/* My thesis (editable) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-[var(--text-secondary)]">My thesis</h4>
          {!editing && (
            <button
              onClick={() => setEditing(true)}
              className="text-xs text-[var(--accent)] hover:underline"
            >
              Edit
            </button>
          )}
        </div>
        {editing ? (
          <div className="space-y-2">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={10}
              className="w-full px-3 py-2 bg-[var(--bg-raised)] border border-[var(--border-color)] rounded text-[var(--text-primary)] text-sm font-mono"
              placeholder="Markdown supported. Why do you own this?"
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setEditing(false)
                  setDraft(data?.user_md ?? '')
                }}
                className="px-3 py-1.5 text-sm text-[var(--text-secondary)] border border-[var(--border-color)] rounded"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-3 py-1.5 text-sm bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white rounded disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        ) : (
          <div>
            {data?.user_md ? (
              <pre className="whitespace-pre-wrap text-sm text-[var(--text-primary)] font-sans bg-[var(--bg-raised)] rounded p-3">
                {data.user_md}
              </pre>
            ) : (
              <p className="text-sm text-[var(--text-muted)] italic">
                No thesis yet. Click Edit to add yours.
              </p>
            )}
            {data?.user_updated_at && (
              <p className="text-xs text-[var(--text-muted)] mt-1">
                Last updated {formatDate(data.user_updated_at)}
              </p>
            )}
          </div>
        )}
      </div>

      {/* AI thesis (read-only) */}
      <div className="space-y-2 pt-2 border-t border-[var(--border-color)]">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-[var(--text-secondary)]">AI thesis</h4>
          {data?.ai && (
            <span className="text-xs text-[var(--text-muted)]">
              v{data.ai.version}
              {data.ai.model ? ` · ${data.ai.model}` : ''}
              {' · '}
              {formatDate(data.ai.generated_at)}
            </span>
          )}
        </div>
        {data?.ai ? (
          <pre className="whitespace-pre-wrap text-sm text-[var(--text-primary)] font-sans bg-[var(--bg-raised)] rounded p-3">
            {data.ai.content_md}
          </pre>
        ) : (
          <p className="text-sm text-[var(--text-muted)] italic">
            No AI thesis yet. The agent will fill this on its next run.
          </p>
        )}
      </div>
    </section>
  )
}
