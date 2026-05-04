import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Login from './Login'
import { AuthProvider } from '../../context/AuthContext'

// Stub the Google library so the button doesn't crash without a Client ID
vi.mock('@react-oauth/google', () => ({
  GoogleLogin: () => null,
}))

describe('Login', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('shows resend-verification path when backend returns email_not_verified', async () => {
    const user = userEvent.setup()
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        json: async () => ({ detail: 'email_not_verified' }),
      }),
    )

    render(
      <AuthProvider>
        <Login />
      </AuthProvider>,
    )

    await user.type(screen.getByPlaceholderText(/Email/i), 'd@example.com')
    await user.type(screen.getByPlaceholderText(/Password/i), 'testpass123')
    await user.click(screen.getByRole('button', { name: /^Sign in$/i }))

    await waitFor(() =>
      expect(screen.getByText(/isn't verified yet/i)).toBeInTheDocument(),
    )
    expect(
      screen.getByRole('button', { name: /Resend verification email/i }),
    ).toBeInTheDocument()
  })

  it('shows API error message on bad credentials', async () => {
    const user = userEvent.setup()
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({ detail: 'Invalid email or password' }),
      }),
    )

    render(
      <AuthProvider>
        <Login />
      </AuthProvider>,
    )

    await user.type(screen.getByPlaceholderText(/Email/i), 'd@example.com')
    await user.type(screen.getByPlaceholderText(/Password/i), 'wrong')
    await user.click(screen.getByRole('button', { name: /^Sign in$/i }))

    await waitFor(() =>
      expect(screen.getByText(/Unauthorized|Invalid/i)).toBeInTheDocument(),
    )
  })
})
