export function toDateKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

export function parseDateKey(key: string): Date {
  return new Date(`${key}T00:00:00.000Z`);
}

export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

export function weekStartOf(date: Date, weekStart: number): Date {
  const day = (date.getUTCDay() - weekStart + 7) % 7;
  return addDays(new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())), -day);
}

export function daysBetween(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / 86400000);
}

export function getMonthRange(year: number, month: number): { from: Date; to: Date } {
  return {
    from: new Date(Date.UTC(year, month - 1, 1)),
    to: new Date(Date.UTC(year, month, 0, 23, 59, 59, 999)),
  };
}

export function getYearRange(year: number): { from: Date; to: Date } {
  return {
    from: new Date(Date.UTC(year, 0, 1)),
    to: new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999)),
  };
}

export function getDaysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function getDaysInYear(year: number): number {
  const start = new Date(Date.UTC(year, 0, 1)).getTime();
  const end = new Date(Date.UTC(year, 11, 31)).getTime();
  return Math.round((end - start) / 86400000) + 1;
}

export function getMonthReference(year: number, month: number): Date {
  const monthEnd = new Date(Date.UTC(year, month, 0, 0, 0, 0, 0));
  const todayMidnight = parseDateKey(toDateKey(new Date()));
  return todayMidnight < monthEnd ? todayMidnight : monthEnd;
}

export function buildDailyKeySet(dates: Date[], maxDate: Date): Set<string> {
  const maxKey = toDateKey(maxDate);
  const keys = new Set<string>();
  for (const date of dates) {
    const key = toDateKey(date);
    if (key <= maxKey) keys.add(key);
  }
  return keys;
}

export function getCurrentStreak(
  completedKeys: Set<string>,
  reference: Date,
): number {
  const todayKey = toDateKey(reference);

  if (completedKeys.has(todayKey)) {
    let streak = 1;
    let cursor = addDays(reference, -1);
    while (completedKeys.has(toDateKey(cursor))) {
      streak++;
      cursor = addDays(cursor, -1);
    }
    return streak;
  }

  const yesterday = addDays(reference, -1);
  if (!completedKeys.has(toDateKey(yesterday))) return 0;

  let streak = 1;
  let cursor = addDays(yesterday, -1);
  while (completedKeys.has(toDateKey(cursor))) {
    streak++;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

export function getBestStreak(completedKeys: Set<string>): number {
  if (completedKeys.size === 0) return 0;

  const sorted = [...completedKeys].sort();
  let best = 1;
  let run = 1;
  let prev = parseDateKey(sorted[0]!);

  for (let i = 1; i < sorted.length; i++) {
    const current = parseDateKey(sorted[i]!);
    if (daysBetween(prev, current) === 1) {
      run++;
    } else {
      best = Math.max(best, run);
      run = 1;
    }
    prev = current;
  }

  return Math.max(best, run);
}

export function calculateCompletionRate(
  completed: number,
  goal: number | null,
  daysInPeriod: number,
): number {
  const expected = goal ?? daysInPeriod;
  if (expected <= 0) return 0;
  return Math.min(100, Math.round((completed / expected) * 100));
}

export function classifyIntensity(count: number): number {
  if (count <= 0) return 0;
  if (count === 1) return 1;
  if (count === 2) return 2;
  return 3;
}

export function buildHeatmapDays(
  completions: Date[],
  year: number,
  month: number | null,
): { days: { date: string; count: number; level: number }[]; maxCount: number } {
  const { from, to } = month ? getMonthRange(year, month) : getYearRange(year);
  const daysInPeriod = month ? getDaysInMonth(year, month) : getDaysInYear(year);

  const counts = new Map<string, number>();

  for (const completion of completions) {
    if (completion < from || completion > to) continue;
    const key = toDateKey(completion);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const days: { date: string; count: number; level: number }[] = [];
  let maxCount = 0;

  if (month) {
    for (let day = 1; day <= daysInPeriod; day++) {
      const key = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const count = counts.get(key) ?? 0;
      if (count > maxCount) maxCount = count;
      days.push({ date: key, count, level: classifyIntensity(count) });
    }
  } else {
    for (let dayOfYear = 1; dayOfYear <= daysInPeriod; dayOfYear++) {
      const key = toDateKey(new Date(Date.UTC(year, 0, dayOfYear)));
      const count = counts.get(key) ?? 0;
      if (count > maxCount) maxCount = count;
      days.push({ date: key, count, level: classifyIntensity(count) });
    }
  }

  return { days, maxCount };
}
