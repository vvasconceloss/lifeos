import { describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { server } from './server';
import { renderApp } from './utils';

const pillar = { id: 'p1', name: 'Health', color: '#ef4444', createdAt: '', updatedAt: '' };

const habit = {
  id: 'h1',
  name: 'Morning run',
  description: null,
  pillarId: 'p1',
  pillarName: 'Health',
  isActive: true,
  frequency: 'DAILY' as const,
  daysOfWeek: [] as number[],
  timesPerWeek: null,
  timesPerMonth: null,
  icon: null,
  color: '#ef4444',
  sortOrder: 0,
  archivedAt: null,
};

function useDashboardData() {
  server.use(
    http.get('/v1/pillars', () => HttpResponse.json({ pillars: [pillar] })),
    http.get('/v1/habits', () => HttpResponse.json({ habits: [habit] })),
    http.get('/v1/completions', () => HttpResponse.json({ completions: [] })),
  );
}

describe('Dashboard', () => {
  it('renders the greeting and the user\'s habits', async () => {
    useDashboardData();
    renderApp('/app');

    const names = await screen.findAllByText('Morning run');
    expect(names.length).toBeGreaterThan(0);
    expect(screen.getByText(/Good (morning|afternoon|evening), Test User/)).toBeInTheDocument();
    expect(screen.getAllByText('Health').length).toBeGreaterThan(0);
  });

  it('marks a habit complete for today', async () => {
    const user = userEvent.setup();
    useDashboardData();

    const complete = vi.fn();
    server.use(
      http.put('/v1/habits/:id/completions/:date', async ({ params }) => {
        complete({ id: params.id, date: params.date });
        return HttpResponse.json({
          completion: {
            id: 'c1',
            habitId: params.id,
            date: `${params.date}T00:00:00.000Z`,
            createdAt: new Date().toISOString(),
          },
        });
      }),
    );

    renderApp('/app');
    const names = await screen.findAllByText('Morning run');
    expect(names.length).toBeGreaterThan(0);;

    const today = new Date();
    const label = `Mark Morning run on ${today.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
    await user.click(screen.getByRole('button', { name: label }));

    await waitFor(() => {
      expect(complete).toHaveBeenCalledWith({ id: 'h1', date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/) });
    });
  });

  it('shows the empty-state guidance when there are no habits', async () => {
    renderApp('/app');

    expect(await screen.findByText('Welcome to LifeOS')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Create pillar/i })).toBeInTheDocument();
  });
});
