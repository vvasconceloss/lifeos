import './index.css'
import './i18n'
import { Toaster } from 'sonner'
import { StrictMode } from 'react'
import { AppRouter } from './router'
import { createRoot } from 'react-dom/client'
import { AuthProvider } from './contexts/AuthContext'
import { TooltipProvider } from '@/components/ui/tooltip'

if (import.meta.env.VITE_SENTRY_DSN) {
  void import('@sentry/react').then(({ init }) => {
    init({
      dsn: import.meta.env.VITE_SENTRY_DSN,
      environment: import.meta.env.MODE,
      tracesSampleRate: 0,
    })
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <TooltipProvider>
      <AuthProvider>
        <AppRouter />
        <Toaster richColors closeButton position="bottom-right" />
      </AuthProvider>
    </TooltipProvider>
  </StrictMode>,
)
