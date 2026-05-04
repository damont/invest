import { useEffect, useRef, useState } from 'react'
import { ApiError, api } from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import { useRouter } from '../../hooks/useRouter'

interface Props {
  token: string
}

type Status = 'verifying' | 'success' | 'error'

export default function VerifyEmail({ token }: Props) {
  const { setTokenAndFetch } = useAuth()
  const { navigate } = useRouter()
  const [status, setStatus] = useState<Status>('verifying')
  const [error, setError] = useState('')
  const [resendEmail, setResendEmail] = useState('')
  const [resendMsg, setResendMsg] = useState('')
  const ran = useRef(false)

  useEffect(() => {
    if (ran.current) return
    ran.current = true
    ;(async () => {
      try {
        const { access_token } = await api.verifyEmail(token)
        await setTokenAndFetch(access_token)
        setStatus('success')
        navigate('/stocks', true)
      } catch (err) {
        setStatus('error')
        setError(err instanceof ApiError ? err.message : 'Invalid or expired verification link.')
      }
    })()
  }, [token, setTokenAndFetch, navigate])

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault()
    setResendMsg('')
    try {
      const r = await api.resendVerification(resendEmail)
      setResendMsg(r.message)
    } catch {
      setResendMsg('Could not resend right now.')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-main)] px-4">
      <div className="w-full max-w-sm text-center space-y-4">
        <h1 className="text-2xl font-semibold text-[var(--text-primary)]">Verify email</h1>

        {status === 'verifying' && (
          <p className="text-sm text-[var(--text-secondary)]">Verifying your email…</p>
        )}

        {status === 'success' && (
          <p className="text-sm text-[var(--text-secondary)]">
            Verified. Redirecting…
          </p>
        )}

        {status === 'error' && (
          <div className="space-y-4">
            <p className="text-sm text-[var(--danger)]">{error}</p>
            <form onSubmit={handleResend} className="space-y-3 text-left">
              <p className="text-sm text-[var(--text-secondary)] text-center">
                Enter your email to get a new link.
              </p>
              <input
                type="email"
                placeholder="Email"
                value={resendEmail}
                onChange={(e) => setResendEmail(e.target.value)}
                required
                className="w-full px-3 py-2 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded text-[var(--text-primary)] min-h-[44px] sm:min-h-0"
              />
              <button
                type="submit"
                className="w-full py-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white rounded font-medium min-h-[44px] sm:min-h-0"
              >
                Resend verification email
              </button>
              {resendMsg && (
                <p className="text-xs text-[var(--text-muted)] text-center">{resendMsg}</p>
              )}
            </form>
            <p className="text-sm">
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
          </div>
        )}
      </div>
    </div>
  )
}
