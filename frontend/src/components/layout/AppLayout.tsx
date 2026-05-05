import { useAuth } from '../../context/AuthContext'
import { useRouter } from '../../hooks/useRouter'

interface Props {
  children: React.ReactNode
}

export default function AppLayout({ children }: Props) {
  const { user, logout } = useAuth()
  const { navigate } = useRouter()

  return (
    <>
      <header className="app-header">
        <a
          href="/stocks"
          onClick={(e) => {
            e.preventDefault()
            navigate('/stocks')
          }}
          className="brand"
          style={{ textDecoration: 'none', color: 'inherit' }}
        >
          <div className="brand-mark">i</div>
          <span>invest</span>
        </a>
        <div className="header-right">
          <a
            href="/profile"
            onClick={(e) => {
              e.preventDefault()
              navigate('/profile')
            }}
            className="user-name"
            style={{ textDecoration: 'none' }}
          >
            {user?.name || user?.email}
          </a>
          <div className="header-divider" />
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault()
              logout()
            }}
            className="logout-link"
            style={{ textDecoration: 'none' }}
          >
            Logout
          </a>
        </div>
      </header>
      <main className="app-shell">{children}</main>
    </>
  )
}
