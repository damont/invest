import { useAuth } from '../context/AuthContext'
import AgentTokenSection from './AgentTokenSection'

export default function UserProfile() {
  const { user } = useAuth()

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <section className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-lg p-4 space-y-3">
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">Profile</h2>
        <div className="space-y-2 text-sm">
          <div>
            <span className="text-[var(--text-muted)]">Name</span>
            <p className="text-[var(--text-primary)]">{user?.name || '—'}</p>
          </div>
          <div>
            <span className="text-[var(--text-muted)]">Email</span>
            <p className="text-[var(--text-primary)]">{user?.email}</p>
          </div>
        </div>
      </section>

      <AgentTokenSection />
    </div>
  )
}
