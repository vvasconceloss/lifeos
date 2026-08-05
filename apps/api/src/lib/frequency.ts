import type { HabitFrequency } from "@lifeos/shared";
import {
  addDays,
  getBestStreak,
  getCurrentStreak,
  getDaysInMonth,
  parseDateKey,
  toDateKey,
} from "../modules/stats/stats.utils";

const MS_PER_DAY = 86400000;

export interface FrequencyParams {
  frequency: HabitFrequency;
  daysOfWeek: number[];
  timesPerWeek: number | null;
  timesPerMonth: number | null;
}

export function isScheduledDay(f: FrequencyParams, date: Date): boolean {
  if (f.frequency === "WEEKLY_DAYS") {
    return f.daysOfWeek.includes(date.getUTCDay());
  }
  return true;
}

export function isFullCalendarMonth(from: Date, to: Date): boolean {
  return (
    from.getUTCDate() === 1 &&
    to.getUTCDate() === getDaysInMonth(to.getUTCFullYear(), to.getUTCMonth() + 1) &&
    from.getUTCFullYear() === to.getUTCFullYear() &&
    from.getUTCMonth() === to.getUTCMonth()
  );
}

/** Expected completions for a habit over the inclusive window [from, to]. */
export function expectedCompletions(f: FrequencyParams, from: Date, to: Date): number {
  const days = Math.round((to.getTime() - from.getTime()) / MS_PER_DAY) + 1;

  switch (f.frequency) {
    case "DAILY":
      return days;
    case "WEEKLY_DAYS": {
      let count = 0;
      for (let d = from; d <= to; d = addDays(d, 1)) {
        if (f.daysOfWeek.includes(d.getUTCDay())) count++;
      }
      return count;
    }
    case "TIMES_PER_WEEK":
      return Math.round(((f.timesPerWeek ?? 1) * days) / 7);
    case "TIMES_PER_MONTH": {
      const m = f.timesPerMonth ?? 1;
      return isFullCalendarMonth(from, to) ? m : Math.round((m * days) / 30);
    }
  }
}

export function completionRate(actual: number, expected: number): number {
  if (expected <= 0) return 0;
  return Math.min(100, Math.round((actual / expected) * 100));
}

function countCompletedInRange(completedKeys: Set<string>, from: Date, to: Date): number {
  let count = 0;
  for (let d = from; d <= to; d = addDays(d, 1)) {
    if (completedKeys.has(toDateKey(d))) count++;
  }
  return count;
}

function mondayOf(date: Date): Date {
  const day = (date.getUTCDay() + 6) % 7;
  return addDays(new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())), -day);
}

function monthStart(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function monthEnd(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0));
}

function getWeeklyDaysCurrentStreak(f: FrequencyParams, completedKeys: Set<string>, reference: Date): number {
  let streak = 0;
  let guard = 0;
  for (let d = reference; guard < 10000; d = addDays(d, -1), guard++) {
    if (!isScheduledDay(f, d)) continue;
    if (completedKeys.has(toDateKey(d))) {
      streak++;
    } else if (toDateKey(d) === toDateKey(reference)) {
      // today is scheduled but still pending — skip, do not break
      continue;
    } else {
      break;
    }
  }
  return streak;
}

function getWeeklyDaysBestStreak(f: FrequencyParams, completedKeys: Set<string>): number {
  if (completedKeys.size === 0) return 0;
  const dates = [...completedKeys].map(parseDateKey).sort((a, b) => a.getTime() - b.getTime());
  const min = dates[0]!;
  const max = dates[dates.length - 1]!;
  let best = 0;
  let run = 0;
  for (let d = min; d <= max; d = addDays(d, 1)) {
    if (!isScheduledDay(f, d)) continue;
    if (completedKeys.has(toDateKey(d))) run++;
    else run = 0;
    if (run > best) best = run;
  }
  return best;
}

function getTimesPerWeekCurrentStreak(f: FrequencyParams, completedKeys: Set<string>, reference: Date): number {
  const target = f.timesPerWeek ?? 1;
  const currentKey = toDateKey(mondayOf(reference));
  let streak = 0;
  let guard = 0;
  for (let w = mondayOf(reference); guard < 10000; w = addDays(w, -7), guard++) {
    const count = countCompletedInRange(completedKeys, w, addDays(w, 6));
    if (count >= target) {
      streak++;
    } else if (toDateKey(w) === currentKey) {
      // current week in progress — skip, do not break
    } else {
      break;
    }
  }
  return streak;
}

function getTimesPerWeekBestStreak(f: FrequencyParams, completedKeys: Set<string>): number {
  if (completedKeys.size === 0) return 0;
  const target = f.timesPerWeek ?? 1;
  const dates = [...completedKeys].map(parseDateKey);
  const first = dates.reduce((a, b) => (a.getTime() < b.getTime() ? a : b));
  const last = dates.reduce((a, b) => (a.getTime() > b.getTime() ? a : b));
  let best = 0;
  let run = 0;
  for (let w = mondayOf(first); w <= last; w = addDays(w, 7)) {
    if (countCompletedInRange(completedKeys, w, addDays(w, 6)) >= target) run++;
    else run = 0;
    if (run > best) best = run;
  }
  return best;
}

function getTimesPerMonthCurrentStreak(f: FrequencyParams, completedKeys: Set<string>, reference: Date): number {
  const target = f.timesPerMonth ?? 1;
  const currentKey = toDateKey(monthStart(reference));
  let streak = 0;
  let m = monthStart(reference);
  let guard = 0;
  while (guard < 10000) {
    const count = countCompletedInRange(completedKeys, m, monthEnd(m));
    if (count >= target) {
      streak++;
    } else if (toDateKey(m) === currentKey) {
      // current month in progress — skip, do not break
    } else {
      break;
    }
    m = new Date(Date.UTC(m.getUTCFullYear(), m.getUTCMonth() - 1, 1));
    guard++;
  }
  return streak;
}

function getTimesPerMonthBestStreak(f: FrequencyParams, completedKeys: Set<string>): number {
  if (completedKeys.size === 0) return 0;
  const target = f.timesPerMonth ?? 1;
  const dates = [...completedKeys].map(parseDateKey);
  const first = dates.reduce((a, b) => (a.getTime() < b.getTime() ? a : b));
  const last = dates.reduce((a, b) => (a.getTime() > b.getTime() ? a : b));
  let best = 0;
  let run = 0;
  for (let m = monthStart(first); m <= last; ) {
    if (countCompletedInRange(completedKeys, m, monthEnd(m)) >= target) run++;
    else run = 0;
    if (run > best) best = run;
    m = new Date(Date.UTC(m.getUTCFullYear(), m.getUTCMonth() + 1, 1));
  }
  return best;
}

export function getCurrentStreakForFrequency(
  f: FrequencyParams,
  completedKeys: Set<string>,
  reference: Date,
): number {
  switch (f.frequency) {
    case "DAILY":
      return getCurrentStreak(completedKeys, reference);
    case "WEEKLY_DAYS":
      return getWeeklyDaysCurrentStreak(f, completedKeys, reference);
    case "TIMES_PER_WEEK":
      return getTimesPerWeekCurrentStreak(f, completedKeys, reference);
    case "TIMES_PER_MONTH":
      return getTimesPerMonthCurrentStreak(f, completedKeys, reference);
  }
}

export function getBestStreakForFrequency(f: FrequencyParams, completedKeys: Set<string>): number {
  switch (f.frequency) {
    case "DAILY":
      return getBestStreak(completedKeys);
    case "WEEKLY_DAYS":
      return getWeeklyDaysBestStreak(f, completedKeys);
    case "TIMES_PER_WEEK":
      return getTimesPerWeekBestStreak(f, completedKeys);
    case "TIMES_PER_MONTH":
      return getTimesPerMonthBestStreak(f, completedKeys);
  }
}

export interface HistoryDay {
  date: string;
  weekday: number;
  scheduled: boolean;
  completed: boolean;
}

export function buildHistoryDays(
  f: FrequencyParams,
  from: Date,
  to: Date,
  completedKeys: Set<string>,
): HistoryDay[] {
  const days: HistoryDay[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) {
    days.push({
      date: toDateKey(d),
      weekday: d.getUTCDay(),
      scheduled: isScheduledDay(f, d),
      completed: completedKeys.has(toDateKey(d)),
    });
  }
  return days;
}
