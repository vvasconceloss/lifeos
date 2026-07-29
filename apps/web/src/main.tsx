import './index.css'
import { StrictMode } from 'react'
import { AppRouter } from './router'
import { createRoot } from 'react-dom/client'
import { AuthProvider } from './contexts/AuthContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <AppRouter />
    </AuthProvider>
  </StrictMode>,
)
