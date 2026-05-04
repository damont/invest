import { useEffect } from 'react'
import ForgotPassword from './components/auth/ForgotPassword'
import Login from './components/auth/Login'
import Register from './components/auth/Register'
import ResetPassword from './components/auth/ResetPassword'
import VerifyEmail from './components/auth/VerifyEmail'
import AppLayout from './components/layout/AppLayout'
import StockDetail from './components/stocks/StockDetail'
import StockList from './components/stocks/StockList'
import UserProfile from './components/UserProfile'
import { useAuth } from './context/AuthContext'
import { matchPath, useRouter } from './hooks/useRouter'

export default function App() {
  const { user, isLoading } = useAuth()
  const { path, navigate } = useRouter()

  const verifyMatch = matchPath('/verify-email/:token', path)
  const verifyToken = verifyMatch?.token ?? null
  const resetMatch = matchPath('/reset-password/:token', path)
  const resetToken = resetMatch?.token ?? null
  const stockDetailMatch = matchPath('/stocks/:id', path)

  // Authenticated users on / or unrecognized paths -> /stocks
  useEffect(() => {
    if (isLoading || !user) return
    const known =
      path === '/stocks' ||
      path === '/profile' ||
      stockDetailMatch !== null
    if (!known) navigate('/stocks', true)
  }, [isLoading, user, path, stockDetailMatch, navigate])

  // Unauthenticated users on protected paths -> /
  useEffect(() => {
    if (isLoading || user) return
    const allowed =
      path === '/' ||
      path === '/login' ||
      path === '/register' ||
      path === '/forgot-password' ||
      verifyToken !== null ||
      resetToken !== null
    if (!allowed) navigate('/', true)
  }, [isLoading, user, path, verifyToken, resetToken, navigate])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-main)]">
        <p className="text-[var(--text-secondary)]">Loading…</p>
      </div>
    )
  }

  if (!user) {
    if (verifyToken) return <VerifyEmail token={verifyToken} />
    if (resetToken) return <ResetPassword token={resetToken} />
    if (path === '/forgot-password') return <ForgotPassword />
    if (path === '/register') return <Register />
    // / and /login both render Login — there's no separate landing page.
    return <Login />
  }

  // Authenticated
  return (
    <AppLayout>
      {stockDetailMatch ? (
        <StockDetail stockId={stockDetailMatch.id} />
      ) : path === '/profile' ? (
        <UserProfile />
      ) : (
        <StockList />
      )}
    </AppLayout>
  )
}
