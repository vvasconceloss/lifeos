import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { loggedInUser, server } from './server';
import { renderApp } from './utils';

const unverifiedUser = { ...loggedInUser, emailVerified: false };

describe('Email verification', () => {
  it('shows a request-email state when no token is present', async () => {
    server.use(http.get('/v1/auth/me', () => HttpResponse.json({ user: unverifiedUser })));

    renderApp('/verify-email');

    expect(await screen.findByText(/Enter your email address below/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Send verification email/i })).toBeInTheDocument();
  });

  it('includes the redirect path when requesting a verification email', async () => {
    const user = userEvent.setup();
    let sentRedirect: string | undefined;
    server.use(
      http.get('/v1/auth/me', () => HttpResponse.json({ user: unverifiedUser })),
      http.post('/v1/auth/resend-verification', async ({ request }) => {
        const body = await request.json() as { redirect?: string };
        sentRedirect = body.redirect;
        return HttpResponse.json({ message: 'ok' });
      }),
    );

    renderApp('/verify-email?redirect=/settings/habits');

    await user.type(screen.getByPlaceholderText('your@email.com'), 'user@lifeos.com');
    await user.click(screen.getByRole('button', { name: /Send verification email/i }));

    await screen.findByRole('button', { name: /Resend in \d+s/i });
    expect(sentRedirect).toBe('/settings/habits');
  });

  it('verifies a valid token and returns to the requested redirect page', async () => {
    server.use(
      http.get('/v1/auth/me', () => HttpResponse.json({ user: unverifiedUser })),
      http.post('/v1/auth/verify-email', () => HttpResponse.json({ emailVerified: true })),
    );

    renderApp('/verify-email?token=valid-token&redirect=/settings/habits');

    // After verification the user lands on the habits settings page (not /app).
    expect(await screen.findByText(/No active habits/i)).toBeInTheDocument();
  });

  it('redirects an already-verified user away from /verify-email', async () => {
    renderApp('/verify-email');

    // loggedInUser has emailVerified: true → redirected straight to the dashboard.
    expect(await screen.findByText('Welcome to LifeOS')).toBeInTheDocument();
  });

  it('shows an expired state and offers a resend form with cooldown', async () => {
    const user = userEvent.setup();
    server.use(
      http.get('/v1/auth/me', () => HttpResponse.json({ user: unverifiedUser })),
      http.post('/v1/auth/verify-email', () =>
        HttpResponse.json({ error: { code: 'VERIFICATION_EXPIRED', message: 'x' } }, { status: 400 }),
      ),
      http.post('/v1/auth/resend-verification', () =>
        HttpResponse.json({ message: 'ok' }),
      ),
    );

    renderApp('/verify-email?token=expired-token');

    expect(await screen.findByText('Link expired')).toBeInTheDocument();

    await user.type(screen.getByPlaceholderText('your@email.com'), 'user@lifeos.com');
    await user.click(screen.getByRole('button', { name: /Send verification email/i }));

    expect(
      await screen.findByRole('button', { name: /Resend in \d+s/i }),
    ).toBeInTheDocument();
  });

  it('shows an error state for an invalid token', async () => {
    server.use(
      http.get('/v1/auth/me', () => HttpResponse.json({ user: unverifiedUser })),
      http.post('/v1/auth/verify-email', () =>
        HttpResponse.json({ error: { code: 'INVALID_VERIFICATION_TOKEN', message: 'Invalid' } }, { status: 400 }),
      ),
    );

    renderApp('/verify-email?token=garbage');

    expect(await screen.findByText('Could not verify')).toBeInTheDocument();
  });
});
