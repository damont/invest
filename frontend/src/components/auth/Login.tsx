import { GoogleLogin } from '@react-oauth/google'
import { useState } from 'react'
import { ApiError, api } from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import { useRouter } from '../../hooks/useRouter'

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined

export default function Login() {
  const { login, googleLogin } = useAuth()
  const { navigate } = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [unverified, setUnverified] = useState(false)
  const [resendMsg, setResendMsg] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setUnverified(false)
    setIsLoading(true)
    try {
      await login(email, password)
    } catch (err) {
      if (err instanceof ApiError && err.status === 403 && err.message === 'email_not_verified') {
        setUnverified(true)
        setError("Your email isn't verified yet.")
      } else {
        setError(err instanceof ApiError ? err.message : 'Login failed')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleSuccess = async (credential: string | undefined) => {
    if (!credential) return
    setIsLoading(true)
    setError('')
    try {
      await googleLogin(credential)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Google login failed')
    } finally {
      setIsLoading(false)
    }
  }

  const handleResend = async () => {
    setResendMsg('')
    try {
      const res = await api.resendVerification(email)
      setResendMsg(res.message)
    } catch {
      setResendMsg('Could not resend right now. Try again later.')
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ backgroundColor: 'var(--bg-main)' }}
    >
      <div
        className="max-w-md w-full space-y-8 p-8 rounded-lg"
        style={{
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-color)',
        }}
      >
        <div>
          <h2 className="text-center text-3xl font-bold" style={{ color: 'var(--accent)' }}>
            invest
          </h2>
          <p className="mt-2 text-center text-sm" style={{ color: 'var(--text-secondary)' }}>
            Your stock thesis dashboard
          </p>
        </div>

        {googleClientId && (
          <div>
            <div className="flex justify-center">
              <GoogleLogin
                onSuccess={(resp) => handleGoogleSuccess(resp.credential)}
                onError={() => setError('Google login failed')}
                theme="filled_black"
              />
            </div>
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div
                  className="w-full"
                  style={{ borderTop: '1px solid var(--border-color)' }}
                />
              </div>
              <div className="relative flex justify-center text-xs">
                <span
                  className="px-2"
                  style={{
                    backgroundColor: 'var(--bg-surface)',
                    color: 'var(--text-secondary)',
                  }}
                >
                  or
                </span>
              </div>
            </div>
          </div>
        )}

        <form className="space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div
              className="px-4 py-3 rounded text-sm"
              style={{
                backgroundColor: 'rgba(200, 100, 100, 0.12)',
                border: '1px solid rgba(200, 100, 100, 0.25)',
                color: '#c06464',
              }}
            >
              {error}
              {unverified && (
                <div className="mt-2 text-xs">
                  <button
                    type="button"
                    onClick={handleResend}
                    className="underline"
                    style={{ color: 'var(--accent)' }}
                  >
                    Resend verification email
                  </button>
                  {resendMsg && (
                    <p className="mt-1" style={{ color: 'var(--text-muted)' }}>
                      {resendMsg}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium"
                style={{ color: 'var(--text-secondary)' }}
              >
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                placeholder="Email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full px-3 py-2 rounded-md focus:outline-none min-h-[44px] sm:min-h-0"
                style={{
                  backgroundColor: 'var(--bg-raised)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                }}
              />
            </div>
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium"
                style={{ color: 'var(--text-secondary)' }}
              >
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                placeholder="Password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full px-3 py-2 rounded-md focus:outline-none min-h-[44px] sm:min-h-0"
                style={{
                  backgroundColor: 'var(--bg-raised)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                }}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex justify-center py-2 px-4 rounded-md text-sm font-medium text-white disabled:opacity-50 min-h-[44px] sm:min-h-0"
            style={{ backgroundColor: 'var(--accent)' }}
            onMouseOver={(e) => (e.currentTarget.style.backgroundColor = 'var(--accent-hover)')}
            onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'var(--accent)')}
          >
            {isLoading ? 'Signing in…' : 'Sign in'}
          </button>

          <div className="text-center space-y-2">
            <button
              type="button"
              onClick={() => navigate('/forgot-password')}
              className="text-sm hover:underline block w-full"
              style={{ color: 'var(--text-secondary)' }}
            >
              Forgot password?
            </button>
            <button
              type="button"
              onClick={() => navigate('/register')}
              className="text-sm hover:underline block w-full"
              style={{ color: 'var(--accent)' }}
            >
              Don't have an account? Register
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
