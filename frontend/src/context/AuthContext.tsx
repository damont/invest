import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { api } from '../api/client'
import type { User } from '../types'

export interface RegisterResult {
  verificationRequired: true
  email: string
}

interface AuthContextType {
  isAuthenticated: boolean
  isLoading: boolean
  user: User | null
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  register: (data: { name: string; email: string; password: string; phone?: string }) => Promise<RegisterResult>
  googleLogin: (credential: string) => Promise<void>
  setTokenAndFetch: (accessToken: string) => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (api.isAuthenticated()) {
      api
        .get<User>('/api/auth/me')
        .then(setUser)
        .catch(() => api.clearToken())
        .finally(() => setIsLoading(false))
    } else {
      setIsLoading(false)
    }
  }, [])

  const setTokenAndFetch = async (accessToken: string) => {
    api.setToken(accessToken)
    const userData = await api.get<User>('/api/auth/me')
    setUser(userData)
  }

  const login = async (email: string, password: string) => {
    const res = await api.post<{ access_token: string }>('/api/auth/login', { email, password })
    await setTokenAndFetch(res.access_token)
  }

  const register = async (data: {
    name: string
    email: string
    password: string
    phone?: string
  }): Promise<RegisterResult> => {
    const resp = await api.post<{ message: string; email: string }>('/api/auth/register', data)
    return { verificationRequired: true, email: resp.email }
  }

  const googleLogin = async (credential: string) => {
    const { access_token } = await api.googleLogin(credential)
    await setTokenAndFetch(access_token)
  }

  const logout = () => {
    api.clearToken()
    setUser(null)
  }

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: !!user,
        isLoading,
        user,
        login,
        logout,
        register,
        googleLogin,
        setTokenAndFetch,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)!
