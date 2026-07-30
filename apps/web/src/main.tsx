import './index.css'
import { Toaster } from 'sonner'
import { StrictMode } from 'react'
import { AppRouter } from './router'
import { createRoot } from 'react-dom/client'
import { AuthProvider } from './contexts/AuthContext'
import { TooltipProvider } from '@/components/ui/tooltip'

const savedTheme = localStorage.getItem('theme');
if (savedTheme === 'light') {
  document.documentElement.classList.remove('dark');
} else {
  document.documentElement.classList.add('dark');
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
