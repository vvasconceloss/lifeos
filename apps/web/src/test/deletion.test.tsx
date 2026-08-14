import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { loggedInUser, server } from './server';
import { renderApp } from './utils';

const verifiedUser = { ...loggedInUser, emailVerified: true };

describe('Account deletion', () => {
  it('schedules deletion, clears the session and redirects to sign in', async () => {
    const user = userEvent.setup();
    server.use(
      http.get('/v1/auth/me', () => HttpResponse.json({ user: verifiedUser })),
      http.post('/v1/account/delete', async ({ request }) => {
        const body = await request.json() as { currentPassword: string };
        expect(body.currentPassword).toBe('Test1234!');
        return HttpResponse.json({ message: 'ok' });
      }),
      http.post('/v1/auth/logout', () => HttpResponse.json({ ok: true })),
    );

    renderApp('/profile');

    await user.click(await screen.findByRole('button', { name: /Delete account/i }));
    await user.type(await screen.findByLabelText('Current password'), 'Test1234!');
    await user.click(screen.getByRole('button', { name: /Schedule deletion/i }));

    // Confirmation toast, then redirected to the login page.
    expect(
      await screen.findByText(/Account deletion scheduled/i),
    ).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: /Welcome back/i })).toBeInTheDocument();
  });

  it('shows the recovery screen for a PENDING_DELETION account after login', async () => {
    server.use(
      http.get('/v1/auth/me', () =>
        HttpResponse.json({
          user: {
            ...verifiedUser,
            status: 'PENDING_DELETION',
            scheduledDeletionAt: '2026-08-30T00:00:00.000Z',
          },
        }),
      ),
    );

    renderApp('/login');

    expect(
      await screen.findByText(/Your account is scheduled for deletion/i),
    ).toBeInTheDocument();
  });

  it('recovers the account from the recovery screen', async () => {
    const user = userEvent.setup();
    const pendingUser = {
      ...verifiedUser,
      status: 'PENDING_DELETION' as const,
      scheduledDeletionAt: '2026-08-30T00:00:00.000Z',
    };
    server.use(
      http.get('/v1/auth/me', () => {
        // After recovery the account is ACTIVE again.
        const active = { ...pendingUser, status: 'ACTIVE' as const, scheduledDeletionAt: null };
        return HttpResponse.json({ user: active });
      }),
      http.post('/v1/account/cancel-deletion', () => HttpResponse.json({ message: 'ok' })),
    );

    renderApp('/account/recovery');

    // Recovery screen renders for the pending user.
    const recoverBtn = await screen.findByRole('button', { name: /Recover account/i });
    await user.click(recoverBtn);

    // After recovery the user is ACTIVE → redirected to the dashboard.
    expect(await screen.findByText('Welcome to LifeOS')).toBeInTheDocument();
  });
});

describe('Recovery link page', () => {
  it('recovers via the email link token', async () => {
    server.use(
      http.post('/v1/account/recover', () => HttpResponse.json({ message: 'ok' })),
    );

    renderApp('/account/recover?token=valid');

    expect(await screen.findByText('Account recovered')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Go to sign in/i })).toBeInTheDocument();
  });

  it('shows an expired state for an expired recovery link', async () => {
    server.use(
      http.post('/v1/account/recover', () =>
        HttpResponse.json({ error: { code: 'RECOVERY_EXPIRED', message: 'x' } }, { status: 400 }),
      ),
    );

    renderApp('/account/recover?token=expired');

    expect(await screen.findByText('Link expired')).toBeInTheDocument();
  });

  it('shows an error state for a missing token', async () => {
    renderApp('/account/recover');

    expect(await screen.findByText('Could not recover')).toBeInTheDocument();
  });
});
