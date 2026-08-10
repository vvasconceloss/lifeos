import { describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { server } from './server';
import { renderApp } from './utils';

const pillar = { id: 'p1', name: 'Health', color: '#ef4444', createdAt: '', updatedAt: '' };

const createdHabit = {
  id: 'h2',
  name: 'Drink water',
  description: null,
  pillarId: 'p1',
  pillarName: 'Health',
  isActive: true,
  frequency: 'DAILY' as const,
  daysOfWeek: [] as number[],
  timesPerWeek: null,
  timesPerMonth: null,
  icon: null,
  color: null,
  sortOrder: 0,
  archivedAt: null,
};

describe('Create flows', () => {
  it('creates a habit from the habits page', async () => {
    const user = userEvent.setup();
    const create = vi.fn();
    server.use(
      http.get('/v1/pillars', () => HttpResponse.json({ pillars: [pillar] })),
      http.get('/v1/habits', () => HttpResponse.json({ habits: [] })),
      http.post('/v1/habits', async ({ request }) => {
        const body = await request.json();
        create(body);
        return HttpResponse.json({ habit: createdHabit }, { status: 201 });
      }),
    );

    renderApp('/settings/habits');
    await screen.findByText(/No active habits/i);

    await user.click(screen.getAllByRole('button', { name: /New Habit/i })[0]!);
    await user.type(screen.getByLabelText(/habit name/i), 'Drink water');
    await user.click(screen.getByLabelText('Pillar'));
    await user.click(await screen.findByRole('option', { name: /Health/ }));
    await user.click(screen.getByRole('button', { name: /Save Habit/i }));

    await waitFor(() => {
      expect(create).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Drink water', pillarId: 'p1', frequency: 'DAILY' }),
      );
    });
    expect(await screen.findByText('Drink water')).toBeInTheDocument();
  });

  it('creates a goal from the goals page', async () => {
    const user = userEvent.setup();
    const create = vi.fn();
    const createdGoal = {
      id: 'g1',
      title: 'Read more',
      description: null,
      pillarId: 'p1',
      pillarName: 'Health',
      pillarColor: '#ef4444',
      status: 'ACTIVE' as const,
      deadline: null,
      completedAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      progress: 0,
      habitCount: 0,
    };
    server.use(
      http.get('/v1/pillars', () => HttpResponse.json({ pillars: [pillar] })),
      http.get('/v1/goals', () => HttpResponse.json({ goals: [] })),
      http.post('/v1/goals', async ({ request }) => {
        const body = await request.json();
        create(body);
        return HttpResponse.json({ goal: createdGoal }, { status: 201 });
      }),
    );

    renderApp('/goals');
    await screen.findByText(/No goals yet/i);

    await user.click(screen.getAllByRole('button', { name: /New Goal/i })[0]!);
    await user.type(screen.getByLabelText(/title/i), 'Read more');
    await user.click(screen.getByLabelText('Pillar'));
    await user.click(await screen.findByRole('option', { name: /Health/ }));
    await user.click(screen.getByRole('button', { name: /Create Goal/i }));

    await waitFor(() => {
      expect(create).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Read more', pillarId: 'p1' }),
      );
    });
    expect(await screen.findByText('Read more')).toBeInTheDocument();
  });
});
