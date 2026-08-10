import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { loggedInUser, server } from './server';
import { renderApp } from './utils';

describe('Authentication flows', () => {
  it('logs in an existing user and lands on the dashboard', async () => {
    const user = userEvent.setup();
    server.use(
      http.get('/v1/auth/me', () => HttpResponse.json({ error: 'Unauthorized' }, { status: 401 })),
      http.post('/v1/auth/login', async ({ request }) => {
        const body = await request.json();
        expect(body).toEqual({ email: 'user@lifeos.com', password: 'secret123' });
        return HttpResponse.json({ user: loggedInUser, token: 'jwt' });
      }),
    );

    renderApp('/login');

    expect(await screen.findByRole('heading', { name: /Welcome back/i })).toBeInTheDocument();

    await user.type(screen.getByLabelText(/email/i), 'user@lifeos.com');
    await user.type(screen.getByLabelText("Password"), 'secret123');
    await user.click(screen.getByRole('button', { name: /Sign in/i }));

    expect(await screen.findByText('Welcome to LifeOS')).toBeInTheDocument();
  });

  it('shows an error for invalid credentials', async () => {
    const user = userEvent.setup();
    server.use(
      http.get('/v1/auth/me', () => HttpResponse.json({ error: 'Unauthorized' }, { status: 401 })),
      http.post('/v1/auth/login', () =>
        HttpResponse.json({ error: 'Invalid email or password' }, { status: 401 }),
      ),
    );

    renderApp('/login');
    await screen.findByRole('heading', { name: /Welcome back/i });

    await user.type(screen.getByLabelText(/email/i), 'user@lifeos.com');
    await user.type(screen.getByLabelText("Password"), 'wrongpass');
    await user.click(screen.getByRole('button', { name: /Sign in/i }));

    expect(await screen.findByText('Invalid email or password')).toBeInTheDocument();
  });

  it('registers a new user and starts the onboarding', async () => {
    const user = userEvent.setup();
    const newUser = { ...loggedInUser, id: 'user-2', email: 'new@lifeos.com', onboarded: false };
    server.use(
      http.get('/v1/auth/me', () => HttpResponse.json({ error: 'Unauthorized' }, { status: 401 })),
      http.post('/v1/auth/register', async ({ request }) => {
        const body = await request.json();
        expect(body).toMatchObject({
          email: 'new@lifeos.com',
          password: 'newpass123',
          name: 'New User',
        });
        return HttpResponse.json({ user: newUser, token: 'jwt' }, { status: 201 });
      }),
    );

    renderApp('/register');
    await screen.findByRole('heading', { name: /Create your account/i });

    await user.type(screen.getByLabelText(/name/i), 'New User');
    await user.type(screen.getByLabelText(/email/i), 'new@lifeos.com');
    await user.type(screen.getByLabelText("Password"), 'newpass123');
    await user.click(screen.getByRole('button', { name: /Create account/i }));

    expect(await screen.findByRole('heading', { name: /Welcome to LifeOS/i })).toBeInTheDocument();
  });

  it('blocks a weak password during registration', async () => {
    const user = userEvent.setup();
    server.use(
      http.get('/v1/auth/me', () => HttpResponse.json({ error: 'Unauthorized' }, { status: 401 })),
    );

    renderApp('/register');
    await screen.findByRole('heading', { name: /Create your account/i });

    await user.type(screen.getByLabelText(/email/i), 'new@lifeos.com');
    await user.type(screen.getByLabelText("Password"), 'short');
    await user.click(screen.getByRole('button', { name: /Create account/i }));

    expect((await screen.findAllByText(/at least 8 characters/i)).length).toBeGreaterThan(0);
  });

  it('logs into the public demo account from the landing page', async () => {
    const user = userEvent.setup();
    server.use(
      http.get('/v1/auth/me', () => HttpResponse.json({ error: 'Unauthorized' }, { status: 401 })),
      http.post('/v1/auth/demo', () =>
        HttpResponse.json({ user: loggedInUser, token: 'jwt' }),
      ),
    );

    renderApp('/');

    const demoButtons = await screen.findAllByRole('button', { name: /View Demo/i });
    await user.click(demoButtons[0]!);

    expect(await screen.findByText('Welcome to LifeOS')).toBeInTheDocument();
  });
});
