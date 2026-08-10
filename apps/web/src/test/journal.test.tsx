import { describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
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
});
