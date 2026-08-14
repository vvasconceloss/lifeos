import { describe, expect, it, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { renderApp } from './utils';
import { server } from './server';
import i18n, { LOCALE_STORAGE_KEY } from '@/i18n';

describe('i18n E2E smoke — key screens in all languages', () => {
  beforeEach(() => {
    window.localStorage.removeItem(LOCALE_STORAGE_KEY);
    void i18n.changeLanguage('en');
  });

  /** Renders /login with an unauthenticated session (no redirect to the app). */
  function renderUnauthed(path: string) {
    server.use(
      http.get('/v1/auth/me', () => HttpResponse.json({ error: 'Unauthorized' }, { status: 401 })),
    );
    renderApp(path);
  }

  async function setLocale(code: string) {
    await i18n.changeLanguage(code);
  }

  it('renders the login screen in English', async () => {
    renderUnauthed('/login');
    expect(await screen.findByRole('heading', { name: /Welcome back/i })).toBeInTheDocument();
  });

  it('renders the login screen in Portuguese', async () => {
    await setLocale('pt');
    renderUnauthed('/login');
    expect(await screen.findByRole('heading', { name: /Bem-vindo de volta/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Iniciar sessão/i })).toBeInTheDocument();
  });

  it('renders the login screen in Ukrainian', async () => {
    await setLocale('uk');
    renderUnauthed('/login');
    expect(await screen.findByRole('heading', { name: /З поверненням/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Увійти/i })).toBeInTheDocument();
  });

  it('renders the profile screen in English', async () => {
    renderApp('/profile');
    expect(await screen.findByText('Preferences')).toBeInTheDocument();
  });

  it('renders the profile screen in Portuguese', async () => {
    await setLocale('pt');
    renderApp('/profile');
    expect(await screen.findByText('Preferências')).toBeInTheDocument();
  });

  it('renders the profile screen in Ukrainian', async () => {
    await setLocale('uk');
    renderApp('/profile');
    expect(await screen.findByText('Налаштування')).toBeInTheDocument();
  });

  it('renders the goals screen in English', async () => {
    renderApp('/goals');
    expect(await screen.findByText('No goals yet')).toBeInTheDocument();
  });

  it('renders the goals screen in Portuguese', async () => {
    await setLocale('pt');
    renderApp('/goals');
    expect(await screen.findByText('Ainda não há objetivos')).toBeInTheDocument();
  });

  it('renders the goals screen in Ukrainian', async () => {
    await setLocale('uk');
    renderApp('/goals');
    expect(await screen.findByText('Ще немає цілей')).toBeInTheDocument();
  });

  it('switches the landing page language from the footer dropdown', async () => {
    renderUnauthed('/');

    // The landing hero renders in English by default (the title appears in a
    // few places, e.g. hero + meta/title — any occurrence confirms it renders).
    await screen.findAllByText(/Build a life you can measure/i);

    // The footer language switcher exposes all three languages.
    const trigger = screen.getByRole('combobox', { name: 'Language' });
    await userEvent.click(trigger);
    const option = await screen.findByRole('option', { name: 'Português' });
    await userEvent.click(option);

    // The same landing text now renders in Portuguese (instant switch).
    await screen.findAllByText(/Constrói uma vida que possas medir/i);
    expect(window.localStorage.getItem(LOCALE_STORAGE_KEY)).toBe('pt');
  });
});
