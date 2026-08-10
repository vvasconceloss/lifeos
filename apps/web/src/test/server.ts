import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

export const loggedInUser = {
  id: 'user-1',
  email: 'user@lifeos.com',
  name: 'Test User',
  timezone: null,
  weekStart: 1,
  theme: 'system',
  onboarded: true,
  gamification: false,
  isDemo: false,
  createdAt: '2026-01-01T00:00:00.000Z',
};

const handlers = [
  http.get('/v1/auth/me', () => HttpResponse.json({ user: loggedInUser })),
  http.get('/v1/pillars', () => HttpResponse.json({ pillars: [] })),
  http.get('/v1/habits', () => HttpResponse.json({ habits: [] })),
  http.get('/v1/completions', () => HttpResponse.json({ completions: [] })),
  http.get('/v1/goals', () => HttpResponse.json({ goals: [] })),
];

export const server = setupServer(...handlers);
