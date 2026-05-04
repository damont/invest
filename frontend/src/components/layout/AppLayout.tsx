import { useAuth } from '../../context/AuthContext'
import { useRouter } from '../../hooks/useRouter'

interface Props {
  children: React.ReactNode
}

export default function AppLayout({ children }: Props) {
  const { user, logout } = useAuth()
  const { navigate, path } = useRouter()
  const onStocks = path === '/stocks' || path.startsWith('/stocks/')

  return (
    <div className="min-h-screen bg-[var(--bg-main)]">
      <header className="bg-[var(--header-bg)] border-b border-[var(--border-color)] px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <a
            href="/stocks"
            onClick={(e) => {
              e.preventDefault()
              navigate('/stocks')
            }}
            className="text-lg font-semibold text-[var(--text-primary)] no-underline"
          >
            invest
          </a>
          <div className="flex items-center gap-4">
            <a
              href="/profile"
              onClick={(e) => {
                e.preventDefault()
                navigate('/profile')
              }}
              className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] truncate max-w-[160px]"
            >
              {user?.name || user?.email}
            </a>
            <button
              onClick={logout}
              className="text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            >
              Logout
            </button>
          </div>
        </div>
        <nav className="flex gap-1 mt-2 overflow-x-auto">
          <a
            href="/stocks"
            onClick={(e) => {
              e.preventDefault()
              navigate('/stocks')
            }}
            className={`px-3 py-1.5 rounded text-sm flex items-center ${
              onStocks
                ? 'bg-[var(--selected-bg)] text-[var(--accent)]'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            Stocks
          </a>
        </nav>
      </header>
      <main className="p-4 max-w-6xl mx-auto">{children}</main>
    </div>
  )
}
