import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { loggedInUser, server } from './server';
import { renderApp } from './utils';

describe('Profile page email verification badge', () => {
  it('shows a "Verified" badge next to a verified email', async () => {
    server.use(
      http.get('/v1/auth/me', () => HttpResponse.json({ user: { ...loggedInUser, emailVerified: true } })),
    );

    renderApp('/profile');

    expect((await screen.findAllByText(loggedInUser.email)).length).toBeGreaterThan(0);
    expect(screen.getByText('Verified')).toBeInTheDocument();
  });

  it('does not show the badge for an unverified email', async () => {
    server.use(
      http.get('/v1/auth/me', () => HttpResponse.json({ user: { ...loggedInUser, emailVerified: false } })),
    );

    renderApp('/profile');

    expect((await screen.findAllByText(loggedInUser.email)).length).toBeGreaterThan(0);
    expect(screen.queryByText('Verified')).not.toBeInTheDocument();
  });

  it('hides premium navigation for an unverified user', async () => {
    server.use(
      http.get('/v1/auth/me', () => HttpResponse.json({ user: { ...loggedInUser, emailVerified: false } })),
    );

    renderApp('/profile');

    // Pillars/Habits (setup) remain visible.
    expect(await screen.findByText('Pillars')).toBeInTheDocument();
    expect(screen.getByText('Habits')).toBeInTheDocument();
    // Premium modules are hidden until the email is verified.
    expect(screen.queryByText('Goals')).not.toBeInTheDocument();
    expect(screen.queryByText('Statistics')).not.toBeInTheDocument();
    expect(screen.queryByText('Journal')).not.toBeInTheDocument();
  });

  it('shows premium navigation for a verified user', async () => {
    renderApp('/profile');

    expect(await screen.findByText('Pillars')).toBeInTheDocument();
    expect(screen.getByText('Goals')).toBeInTheDocument();
    expect(screen.getByText('Statistics')).toBeInTheDocument();
  });
});
