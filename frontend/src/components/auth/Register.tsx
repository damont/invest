import { GoogleLogin } from '@react-oauth/google'
import { useState } from 'react'
import { ApiError, api } from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import { useRouter } from '../../hooks/useRouter'

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined

export default function Register() {
  const { register, googleLogin } = useAuth()
  const { navigate } = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [pendingEmail, setPendingEmail] = useState<string | null>(null)
  const [resendMsg, setResendMsg] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      const result = await register({ name, email, password })
      setPendingEmail(result.email)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Registration failed')
    }
  }

  const handleResend = async () => {
    if (!pendingEmail) return
    setResendMsg('')
    try {
      const res = await api.resendVerification(pendingEmail)
      setResendMsg(res.message)
    } catch {
      setResendMsg('Could not resend right now.')
    }
  }

  if (pendingEmail) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-main)] px-4">
        <div className="w-full max-w-sm text-center space-y-4">
          <h1 className="text-2xl font-semibold text-[var(--text-primary)]">Check your inbox</h1>
          <p className="text-sm text-[var(--text-secondary)]">
            We sent a verification link to{' '}
            <strong className="text-[var(--text-primary)]">{pendingEmail}</strong>.
          </p>
          <button
            onClick={handleResend}
            className="text-sm text-[var(--accent)] underline"
          >
            Resend verification email
          </button>
          {resendMsg && <p className="text-xs text-[var(--text-muted)]">{resendMsg}</p>}
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
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-main)] px-4">
      <div className="w-full max-w-sm space-y-4">
        <h1 className="text-2xl font-semibold text-[var(--text-primary)] text-center">Create account</h1>

        {googleClientId && (
          <div className="flex flex-col items-center">
            <GoogleLogin
              onSuccess={async (resp) => {
                if (!resp.credential) return
                try {
                  await googleLogin(resp.credential)
                } catch {
                  setError('Google sign-in failed.')
                }
              }}
              onError={() => setError('Google sign-in failed.')}
              theme="filled_black"
            />
            <div className="flex items-center gap-2 my-3 text-xs text-[var(--text-muted)] w-full">
              <div className="flex-1 h-px bg-[var(--border-color)]" />
              <span>or</span>
              <div className="flex-1 h-px bg-[var(--border-color)]" />
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          {error && <p className="text-[var(--danger)] text-sm text-center">{error}</p>}
          <input
            type="text"
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full px-3 py-2 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded text-[var(--text-primary)] min-h-[44px] sm:min-h-0"
          />
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-3 py-2 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded text-[var(--text-primary)] min-h-[44px] sm:min-h-0"
          />
          <input
            type="password"
            placeholder="Password (min 6)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={6}
            required
            className="w-full px-3 py-2 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded text-[var(--text-primary)] min-h-[44px] sm:min-h-0"
          />
          <button
            type="submit"
            className="w-full py-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white rounded font-medium min-h-[44px] sm:min-h-0"
          >
            Create account
          </button>
        </form>

        <p className="text-center text-sm text-[var(--text-secondary)]">
          Already have an account?{' '}
          <a
            href="/login"
            onClick={(e) => {
              e.preventDefault()
              navigate('/login')
            }}
            className="text-[var(--accent)]"
          >
            Sign in
          </a>
        </p>
      </div>
    </div>
  )
}
