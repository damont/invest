import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { AuthProvider } from './context/AuthContext'
import App from './App'
import './index.css'

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined

const rootNode = (
  <AuthProvider>
    <App />
  </AuthProvider>
)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {googleClientId ? (
      <GoogleOAuthProvider clientId={googleClientId}>{rootNode}</GoogleOAuthProvider>
    ) : (
      rootNode
    )}
  </StrictMode>,
)
