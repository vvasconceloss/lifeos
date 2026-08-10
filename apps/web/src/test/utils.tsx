import { render } from '@testing-library/react';
import { Toaster } from 'sonner';
import { AuthProvider } from '@/contexts/AuthContext';
import { AppRouter } from '@/router';

export function renderApp(path: string) {
  window.history.pushState({}, '', path);
  return render(
    <AuthProvider>
      <AppRouter />
      <Toaster />
    </AuthProvider>,
  );
}
