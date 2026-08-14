import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { server } from './server';
import { renderApp } from './utils';

describe('Password recovery', () => {
  it('sends a reset link from the forgot-password page and confirms generically', async () => {
    const user = userEvent.setup();
    const reset = http.post('/v1/auth/forgot-password', async ({ request }) => {
      const body = await request.json() as { email: string };
      expect(body.email).toBe('user@lifeos.com');
      return HttpResponse.json({ message: 'ok' });
    });
    server.use(reset);

    renderApp('/forgot-password');

    expect(await screen.findByRole('heading', { name: /Reset your password/i })).toBeInTheDocument();

    await user.type(screen.getByLabelText(/email/i), 'user@lifeos.com');
    await user.click(screen.getByRole('button', { name: /Send reset link/i }));

    expect(await screen.findByText('Check your inbox')).toBeInTheDocument();
  });

  it('shows an invalid-link state on /reset-password without a token', async () => {
    renderApp('/reset-password');

    expect(await screen.findByText('Invalid link')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Request a new link/i })).toBeInTheDocument();
  });

  it('resets the password with a valid token', async () => {
    const user = userEvent.setup();
    server.use(
      http.post('/v1/auth/reset-password', async ({ request }) => {
        const body = await request.json() as { token: string; password: string };
        expect(body.token).toBe('reset-token');
        expect(body.password).toBe('NewPass123!');
        return HttpResponse.json({ message: 'ok' });
      }),
    );

    renderApp('/reset-password?token=reset-token');

    expect(await screen.findByRole('heading', { name: /Set a new password/i })).toBeInTheDocument();

    await user.type(screen.getByLabelText(/new password/i), 'NewPass123!');
    await user.click(screen.getByRole('button', { name: /Reset password/i }));

    expect(await screen.findByRole('heading', { name: /Welcome back/i })).toBeInTheDocument();
  });

  it('shows a toast when the reset token is invalid or expired', async () => {
    const user = userEvent.setup();
    server.use(
      http.post('/v1/auth/reset-password', () =>
        HttpResponse.json({ error: { code: 'INVALID_RESET_TOKEN', message: 'x' } }, { status: 400 }),
      ),
    );

    renderApp('/reset-password?token=bad');

    await user.type(await screen.findByLabelText(/new password/i), 'NewPass123!');
    await user.click(screen.getByRole('button', { name: /Reset password/i }));

    expect(
      await screen.findByText(/reset link is invalid or has expired/i),
    ).toBeInTheDocument();
  });
});
