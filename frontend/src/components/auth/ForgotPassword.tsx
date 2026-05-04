import { useState } from 'react'
import { api } from '../../api/client'
import { useRouter } from '../../hooks/useRouter'

export default function ForgotPassword() {
  const { navigate } = useRouter()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await api.post('/api/auth/forgot-password', { email })
      setSubmitted(true)
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-main)] px-4">
      <div className="w-full max-w-sm space-y-4">
        <h1 className="text-2xl font-semibold text-[var(--text-primary)] text-center">Reset password</h1>
        {submitted ? (
          <div className="text-center space-y-3">
            <p className="text-sm text-[var(--text-secondary)]">
              If that email is registered, you'll receive a reset link shortly.
            </p>
            <a
              href="/login"
              onClick={(e) => {
                e.preventDefault()
                navigate('/login')
              }}
              className="text-sm text-[var(--accent)]"
            >
              Back to sign in
            </a>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <p className="text-sm text-[var(--text-secondary)] text-center">
              Enter your email and we'll send a reset link.
            </p>
            {error && <p className="text-[var(--danger)] text-sm text-center">{error}</p>}
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
              className="w-full px-3 py-2 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded text-[var(--text-primary)] min-h-[44px] sm:min-h-0"
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white rounded font-medium min-h-[44px] sm:min-h-0 disabled:opacity-50"
            >
              {loading ? 'Sending…' : 'Send reset link'}
            </button>
            <p className="text-center text-sm">
              <a
                href="/login"
                onClick={(e) => {
                  e.preventDefault()
                  navigate('/login')
                }}
                className="text-[var(--accent)]"
              >
                Back to sign in
              </a>
            </p>
          </form>
        )}
      </div>
    </div>
  )
}
