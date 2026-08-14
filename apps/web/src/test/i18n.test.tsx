import { describe, expect, it, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { renderApp } from './utils';
import { server } from './server';
import i18n, { LOCALE_STORAGE_KEY, normalizeLocale } from '@/i18n';

/** Renders /login with an unauthenticated session (no redirect). */
function renderLogin() {
  server.use(
    http.get('/v1/auth/me', () => HttpResponse.json({ error: 'Unauthorized' }, { status: 401 })),
  );
  renderApp('/login');
}

describe('i18n language switching', () => {
  beforeEach(() => {
    window.localStorage.removeItem(LOCALE_STORAGE_KEY);
    // Reset to the default language for a clean slate between tests.
    void i18n.changeLanguage('en');
    document.documentElement.setAttribute('lang', 'en');
  });

  it('renders the login screen in English by default', async () => {
    renderLogin();

    expect(await screen.findByRole('heading', { name: /Welcome back/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Sign in/i })).toBeInTheDocument();
  });

  it('switches the whole interface to Portuguese instantly without reload', async () => {
    renderLogin();

    await screen.findByRole('heading', { name: /Welcome back/i });
    await i18n.changeLanguage('pt');
    await waitFor(() => {
      expect(document.documentElement.getAttribute('lang')).toBe('pt');
    });

    expect(screen.getByRole('heading', { name: /Bem-vindo de volta/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Iniciar sessão/i })).toBeInTheDocument();
  });

  it('persists the manual choice to localStorage', async () => {
    renderLogin();
    await screen.findByRole('heading', { name: /Welcome back/i });

    await i18n.changeLanguage('uk');

    expect(window.localStorage.getItem(LOCALE_STORAGE_KEY)).toBe('uk');
  });

  it('normalizes browser locales to a supported language', () => {
    expect(normalizeLocale('pt-PT')).toBe('pt');
    expect(normalizeLocale('en-US')).toBe('en');
    expect(normalizeLocale('uk-UA')).toBe('uk');
    expect(normalizeLocale('fr-FR')).toBe('en');
    expect(normalizeLocale(null)).toBe('en');
  });

  it('keeps the app usable after switching back to English', async () => {
    renderLogin();
    await screen.findByRole('heading', { name: /Welcome back/i });

    await i18n.changeLanguage('pt');
    await i18n.changeLanguage('en');

    expect(await screen.findByRole('heading', { name: /Welcome back/i })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /Bem-vindo de volta/i })).not.toBeInTheDocument();
  });
});
