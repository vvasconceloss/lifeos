import { describe, expect, it } from 'vitest';
import { expectedForMonth, expectedForMonthUpto, frequencyLabel } from './frequency';

describe('frequencyLabel', () => {
  it('labels each frequency type', () => {
    expect(frequencyLabel('DAILY', [], null, null)).toBe('Every day');
    expect(frequencyLabel('WEEKLY_DAYS', [1, 3, 5], null, null)).toBe('Mon · Wed · Fri');
    expect(frequencyLabel('TIMES_PER_WEEK', [], 4, null)).toBe('4× / week');
    expect(frequencyLabel('TIMES_PER_MONTH', [], null, 12)).toBe('12× / month');
  });

  it('sorts and formats the scheduled days', () => {
    expect(frequencyLabel('WEEKLY_DAYS', [5, 1, 3], null, null)).toBe('Mon · Wed · Fri');
  });

  it('falls back gracefully for missing values', () => {
    expect(frequencyLabel('TIMES_PER_WEEK', [], null, null)).toBe('—× / week');
    expect(frequencyLabel('TIMES_PER_MONTH', [], null, null)).toBe('—× / month');
  });
});

describe('expectedForMonth', () => {
  it('counts scheduled weekdays including gaps', () => {
    // August 2026: Mon = 3,10,17,24,31; Wed = 5,12,19,26.
    expect(expectedForMonth('WEEKLY_DAYS', [1, 3], null, null, 2026, 8)).toBe(9);
  });

  it('falls back to defaults when volume params are missing', () => {
    expect(expectedForMonth('TIMES_PER_WEEK', [], null, null, 2026, 8)).toBe(
      Math.round(31 / 7),
    );
    expect(expectedForMonth('TIMES_PER_MONTH', [], null, null, 2026, 8)).toBe(31);
  });
});

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
