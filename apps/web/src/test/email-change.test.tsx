import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { loggedInUser, server } from './server';
import { renderApp } from './utils';

const verifiedUser = { ...loggedInUser, emailVerified: true };

describe('Email change confirmation', () => {
  it('confirms an email change, clears the session and shows success', async () => {
    server.use(
      http.get('/v1/auth/me', () => HttpResponse.json({ user: verifiedUser })),
      http.post('/v1/account/change-email/confirm', () =>
        HttpResponse.json({ message: 'ok' }),
      ),
      http.post('/v1/auth/logout', () => HttpResponse.json({ ok: true })),
    );

    renderApp('/account/email/confirm?token=valid');

    expect(await screen.findByText('Email updated')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Go to sign in/i })).toBeInTheDocument();
  });

  it('shows an expired state for an expired confirmation link', async () => {
    server.use(
      http.get('/v1/auth/me', () => HttpResponse.json({ user: verifiedUser })),
      http.post('/v1/account/change-email/confirm', () =>
        HttpResponse.json({ error: { code: 'EMAIL_CHANGE_EXPIRED', message: 'x' } }, { status: 400 }),
      ),
    );

    renderApp('/account/email/confirm?token=expired');

    expect(await screen.findByText('Link expired')).toBeInTheDocument();
  });

  it('shows an error state for a missing token', async () => {
    renderApp('/account/email/confirm');

    expect(await screen.findByText('Could not confirm')).toBeInTheDocument();
  });

  it('cancels an email change via the old-email link', async () => {
    server.use(
      http.get('/v1/auth/me', () => HttpResponse.json({ user: verifiedUser })),
      http.post('/v1/account/change-email/cancel', () =>
        HttpResponse.json({ message: 'ok' }),
      ),
    );

    renderApp('/account/email/cancel?token=cancel-token');

    expect(await screen.findByText('Change cancelled')).toBeInTheDocument();
  });
});

describe('Account settings', () => {
  it('changes the password from the profile', async () => {
    const user = userEvent.setup();
    server.use(
      http.get('/v1/auth/me', () => HttpResponse.json({ user: verifiedUser })),
      http.post('/v1/account/change-password', async ({ request }) => {
        const body = await request.json() as { currentPassword: string; newPassword: string };
        expect(body.currentPassword).toBe('OldPass123!');
        expect(body.newPassword).toBe('NewPass123!');
        return HttpResponse.json({ message: 'ok' });
      }),
    );

    renderApp('/profile');

    await user.click(await screen.findByRole('button', { name: /Change password/i }));
    await user.type(await screen.findByLabelText('Current password'), 'OldPass123!');
    await user.type(screen.getByLabelText('New password'), 'NewPass123!');
    await user.type(screen.getByLabelText('Confirm new password'), 'NewPass123!');
    await user.click(screen.getByRole('button', { name: /Change password/i }));

    expect(await screen.findByText('Password updated')).toBeInTheDocument();
  });

  it('shows an error when the current password is incorrect', async () => {
    const user = userEvent.setup();
    server.use(
      http.get('/v1/auth/me', () => HttpResponse.json({ user: verifiedUser })),
      http.post('/v1/account/change-password', () =>
        HttpResponse.json({ error: { code: 'INCORRECT_PASSWORD', message: 'x' } }, { status: 400 }),
      ),
    );

    renderApp('/profile');

    await user.click(await screen.findByRole('button', { name: /Change password/i }));
    await user.type(await screen.findByLabelText('Current password'), 'Wrong123!');
    await user.type(screen.getByLabelText('New password'), 'NewPass123!');
    await user.type(screen.getByLabelText('Confirm new password'), 'NewPass123!');
    await user.click(screen.getByRole('button', { name: /Change password/i }));

    expect(await screen.findByText('Current password is incorrect')).toBeInTheDocument();
  });

  it('requests an email change from the profile', async () => {
    const user = userEvent.setup();
    server.use(
      http.get('/v1/auth/me', () => HttpResponse.json({ user: verifiedUser })),
      http.post('/v1/account/change-email/request', async ({ request }) => {
        const body = await request.json() as { currentPassword: string; newEmail: string };
        expect(body.currentPassword).toBe('Test1234!');
        expect(body.newEmail).toBe('new@lifeos.com');
        return HttpResponse.json({ message: 'ok' });
      }),
    );

    renderApp('/profile');

    await user.click(await screen.findByRole('button', { name: /Change email/i }));
    await user.type(await screen.findByLabelText('Current password'), 'Test1234!');
    await user.type(screen.getByLabelText('New email'), 'new@lifeos.com');
    await user.click(screen.getByRole('button', { name: /Change email/i }));

    expect(await screen.findByText(/We sent a confirmation link/i)).toBeInTheDocument();
  });
});
