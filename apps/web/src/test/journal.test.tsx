import { describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { server } from './server';
import { renderApp } from './utils';

const log = {
  id: 'l1',
  date: '2026-08-05',
  mood: 8,
  energy: 7,
  sleepHours: 7.5,
  notes: 'Good day',
  createdAt: '',
  updatedAt: '',
};

describe('Journal', () => {
  it('renders the daily form and the monthly calendar', async () => {
    server.use(
      http.get('/v1/daily-logs', () => HttpResponse.json({ logs: [log] })),
      http.get('/v1/daily-logs/correlations', () =>
        HttpResponse.json({ correlations: { sleep: [], mood: [], energy: [] } }),
      ),
    );

    renderApp('/journal');

    expect(await screen.findByText('Daily journal')).toBeInTheDocument();
    expect(screen.getByText(/Log entry/)).toBeInTheDocument();
    expect(screen.getByText('Monthly calendar')).toBeInTheDocument();
  });

  it('shows the logged-days distribution card by state bucket', async () => {
    server.use(
      http.get('/v1/daily-logs', () => HttpResponse.json({ logs: [] })),
      http.get('/v1/daily-logs/correlations', () =>
        HttpResponse.json({
          correlations: {
            sleep: [{ label: '7–9h', rate: 87, days: 12 }],
            mood: [{ label: '8–10', rate: 91, days: 9 }],
            energy: [{ label: '5–7', rate: 74, days: 6 }],
          },
        }),
      ),
    );

    renderApp('/journal');

    const card = await screen.findByTestId('logged-days-by-state');
    expect(within(card).getByText('Your logged days by state')).toBeInTheDocument();
    expect(within(card).getByText('9')).toBeInTheDocument();
    expect(within(card).getByText('6')).toBeInTheDocument();
    expect(within(card).getByText('12')).toBeInTheDocument();
    expect(within(card).queryByText(/%/)).not.toBeInTheDocument();
  });

  it('refetches the correlations after saving a journal entry', async () => {
    const user = userEvent.setup();
    let correlationsCalls = 0;
    server.use(
      http.get('/v1/daily-logs', () => HttpResponse.json({ logs: [] })),
      http.get('/v1/daily-logs/correlations', () => {
        correlationsCalls++;
        return HttpResponse.json({
          correlations: {
            sleep: [{ label: '7–9h', rate: 87, days: 12 }],
            mood: [{ label: '8–10', rate: 91, days: 9 }],
            energy: [{ label: '5–7', rate: 74, days: 6 }],
          },
        });
      }),
      http.post('/v1/daily-logs', () =>
        HttpResponse.json({
          log: {
            id: 'l2',
            date: '2026-08-10',
            mood: null,
            energy: null,
            sleepHours: null,
            notes: null,
            createdAt: '',
            updatedAt: '',
          },
        }),
      ),
    );

    renderApp('/journal');

    const card = await screen.findByTestId('logged-days-by-state');
    expect(within(card).getByText('12')).toBeInTheDocument();
    const initialCalls = correlationsCalls;

    await user.click(screen.getByRole('button', { name: 'Save entry' }));

    await waitFor(() => expect(correlationsCalls).toBeGreaterThan(initialCalls));
  });
});
