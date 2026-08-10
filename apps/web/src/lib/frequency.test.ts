import { describe, expect, it } from 'vitest';
import { expectedForMonth, expectedForMonthUpto } from './frequency';

describe('expectedForMonthUpto', () => {
  it('matches the full-month expectation when the month has elapsed', () => {
    const params = {
      daysOfWeek: [] as number[],
      timesPerWeek: null,
      timesPerMonth: null,
    };
    expect(expectedForMonthUpto('DAILY', params.daysOfWeek, null, null, 2026, 8, 31)).toBe(
      expectedForMonth('DAILY', [], null, null, 2026, 8),
    );
  });

  it('counts only the elapsed days for a daily habit', () => {
    expect(expectedForMonthUpto('DAILY', [], null, null, 2026, 8, 10)).toBe(10);
    expect(expectedForMonthUpto('DAILY', [], null, null, 2026, 8, 0)).toBe(0);
  });

  it('counts only the scheduled days that have elapsed for WEEKLY_DAYS', () => {
    // August 2026: Mon=3,10,17,24,31. Up to the 10th → Mon 3 and 10.
    expect(expectedForMonthUpto('WEEKLY_DAYS', [1], null, null, 2026, 8, 10)).toBe(2);
    expect(expectedForMonthUpto('WEEKLY_DAYS', [1], null, null, 2026, 8, 2)).toBe(0);
  });

  it('scales TIMES_PER_WEEK and TIMES_PER_MONTH proportionally to elapsed days', () => {
    expect(expectedForMonthUpto('TIMES_PER_WEEK', [], 4, null, 2026, 8, 7)).toBe(4);
    expect(expectedForMonthUpto('TIMES_PER_WEEK', [], 4, null, 2026, 8, 14)).toBe(8);
    expect(expectedForMonthUpto('TIMES_PER_MONTH', [], null, 12, 2026, 8, 10)).toBe(4);
  });

  it('returns the exact monthly target when the whole month has elapsed', () => {
    expect(expectedForMonthUpto('TIMES_PER_MONTH', [], null, 12, 2026, 8, 31)).toBe(12);
  });
});
