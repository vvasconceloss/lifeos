import {
  buildHistoryDays,
  completionRate,
  expectedCompletions,
  getBestStreakForFrequency,
  getCurrentStreakForFrequency,
  isScheduledDay,
  type FrequencyParams,
} from "./frequency";
import { describe, expect, it } from "vitest";

function day(key: string): Date {
  return new Date(`${key}T00:00:00.000Z`);
}

function keysOf(...dates: string[]): Set<string> {
  return new Set(dates);
}

function freq(p: Partial<FrequencyParams> & { frequency: FrequencyParams["frequency"] }): FrequencyParams {
  return {
    daysOfWeek: [],
    timesPerWeek: null,
    timesPerMonth: null,
    ...p,
  };
}

describe("isScheduledDay", () => {
  it("schedules every day for DAILY / volume frequencies", () => {
    expect(isScheduledDay(freq({ frequency: "DAILY" }), day("2026-06-01"))).toBe(true);
    expect(isScheduledDay(freq({ frequency: "TIMES_PER_WEEK", timesPerWeek: 4 }), day("2026-06-07"))).toBe(true);
  });

  it("schedules only configured weekdays for WEEKLY_DAYS", () => {
    const f = freq({ frequency: "WEEKLY_DAYS", daysOfWeek: [1, 3, 5] });
    expect(isScheduledDay(f, day("2026-06-01"))).toBe(true); // Mon
    expect(isScheduledDay(f, day("2026-06-02"))).toBe(false); // Tue
    expect(isScheduledDay(f, day("2026-06-06"))).toBe(false); // Sat
  });
});

describe("expectedCompletions", () => {
  it("counts every day for DAILY", () => {
    expect(expectedCompletions(freq({ frequency: "DAILY" }), day("2026-06-01"), day("2026-06-30"))).toBe(30);
  });

  it("counts scheduled weekdays for WEEKLY_DAYS", () => {
    expect(expectedCompletions(freq({ frequency: "WEEKLY_DAYS", daysOfWeek: [1, 3, 5] }), day("2026-06-01"), day("2026-06-30"))).toBe(13);
    expect(expectedCompletions(freq({ frequency: "WEEKLY_DAYS", daysOfWeek: [0, 6] }), day("2026-06-01"), day("2026-06-30"))).toBe(8);
  });

  it("scales TIMES_PER_WEEK by window length", () => {
    expect(expectedCompletions(freq({ frequency: "TIMES_PER_WEEK", timesPerWeek: 4 }), day("2026-06-01"), day("2026-06-30"))).toBe(17);
    expect(expectedCompletions(freq({ frequency: "TIMES_PER_WEEK", timesPerWeek: 7 }), day("2026-06-01"), day("2026-06-07"))).toBe(7);
  });

  it("uses the exact target for a full calendar month (TIMES_PER_MONTH)", () => {
    expect(expectedCompletions(freq({ frequency: "TIMES_PER_MONTH", timesPerMonth: 15 }), day("2026-06-01"), day("2026-06-30"))).toBe(15);
  });

  it("scales TIMES_PER_MONTH for arbitrary windows", () => {
    expect(expectedCompletions(freq({ frequency: "TIMES_PER_MONTH", timesPerMonth: 15 }), day("2026-05-20"), day("2026-06-18"))).toBe(15);
    expect(expectedCompletions(freq({ frequency: "TIMES_PER_MONTH", timesPerMonth: 15 }), day("2026-06-01"), day("2026-06-10"))).toBe(5);
  });
});

describe("completionRate", () => {
  it("computes the ratio as a percentage", () => {
    expect(completionRate(15, 30)).toBe(50);
  });

  it("caps at 100", () => {
    expect(completionRate(40, 30)).toBe(100);
  });

  it("returns 0 when expected is zero", () => {
    expect(completionRate(5, 0)).toBe(0);
  });
});

describe("WEEKLY_DAYS streaks", () => {
  const f = freq({ frequency: "WEEKLY_DAYS", daysOfWeek: [1, 3, 5] });

  it("counts consecutive scheduled days (skipping non-scheduled)", () => {
    const keys = keysOf("2026-06-01", "2026-06-03", "2026-06-05", "2026-06-08");
    expect(getCurrentStreakForFrequency(f, keys, day("2026-06-08"))).toBe(4);
  });

  it("keeps the streak when today is scheduled but pending", () => {
    const keys = keysOf("2026-06-01", "2026-06-03", "2026-06-05");
    expect(getCurrentStreakForFrequency(f, keys, day("2026-06-08"))).toBe(3);
  });

  it("breaks the streak on a missed scheduled day", () => {
    const keys = keysOf("2026-06-01");
    expect(getCurrentStreakForFrequency(f, keys, day("2026-06-08"))).toBe(0);
  });

  it("computes the best run of scheduled days", () => {
    expect(getBestStreakForFrequency(f, keysOf("2026-06-01", "2026-06-03", "2026-06-05", "2026-06-08", "2026-06-10"))).toBe(5);
    expect(getBestStreakForFrequency(f, keysOf("2026-06-01", "2026-06-03", "2026-06-10"))).toBe(2);
    expect(getBestStreakForFrequency(f, keysOf("2026-06-01", "2026-06-03", "2026-06-05", "2026-06-06"))).toBe(3);
    expect(getBestStreakForFrequency(f, new Set())).toBe(0);
  });
});

describe("TIMES_PER_WEEK streaks", () => {
  const f = freq({ frequency: "TIMES_PER_WEEK", timesPerWeek: 4 });

  it("counts consecutive weeks meeting the target (forgiving current week)", () => {
    const keys = keysOf(
      "2026-06-01", "2026-06-02", "2026-06-03", "2026-06-04", // W1 met
      "2026-06-08", "2026-06-09", "2026-06-10", "2026-06-11", // W2 met
      "2026-06-15", "2026-06-16", // current week pending
    );
    expect(getCurrentStreakForFrequency(f, keys, day("2026-06-17"))).toBe(2);
  });

  it("counts the current week once its target is met", () => {
    const keys = keysOf(
      "2026-06-01", "2026-06-02", "2026-06-03", "2026-06-04", // W1 met
      "2026-06-08", "2026-06-09", "2026-06-10", "2026-06-11", // W2 met
      "2026-06-15", "2026-06-16", "2026-06-17", "2026-06-18", // W3 met
    );
    expect(getCurrentStreakForFrequency(f, keys, day("2026-06-20"))).toBe(3);
  });

  it("returns 0 when a past week missed the target", () => {
    const keys = keysOf(
      "2026-06-01", "2026-06-02", "2026-06-03", "2026-06-04", // W1 met
      "2026-06-08", "2026-06-09", // W2 missed
      "2026-06-15", "2026-06-16", // current week pending
    );
    expect(getCurrentStreakForFrequency(f, keys, day("2026-06-17"))).toBe(0);
  });

  it("computes the best run of consecutive weeks", () => {
    const keys = keysOf(
      "2026-06-01", "2026-06-02", "2026-06-03", "2026-06-04", // met
      "2026-06-08", "2026-06-09", "2026-06-10", "2026-06-11", // met
      "2026-06-15", "2026-06-16", // missed
      "2026-06-22", "2026-06-23", "2026-06-24", "2026-06-25", // met
    );
    expect(getBestStreakForFrequency(f, keys)).toBe(2);
    expect(getBestStreakForFrequency(f, new Set())).toBe(0);
  });
});

describe("TIMES_PER_MONTH streaks", () => {
  const f = freq({ frequency: "TIMES_PER_MONTH", timesPerMonth: 12 });

  function twelveDays(monthStart: string): string[] {
    const [y, m] = monthStart.split("-").map(Number);
    return Array.from({ length: 12 }, (_, i) => `${y}-${String(m).padStart(2, "0")}-${String(i + 1).padStart(2, "0")}`);
  }

  it("counts consecutive months meeting the target (forgiving current month)", () => {
    const keys = keysOf(
      ...twelveDays("2026-04-01"),
      ...twelveDays("2026-05-01"),
      "2026-06-01", "2026-06-02", "2026-06-03", // current month pending
    );
    expect(getCurrentStreakForFrequency(f, keys, day("2026-06-10"))).toBe(2);
  });

  it("counts the current month once its target is met", () => {
    const keys = keysOf(
      ...twelveDays("2026-04-01"),
      ...twelveDays("2026-05-01"),
      ...twelveDays("2026-06-01"),
    );
    expect(getCurrentStreakForFrequency(f, keys, day("2026-06-10"))).toBe(3);
  });

  it("returns 0 when a past month missed the target", () => {
    const keys = keysOf(
      ...twelveDays("2026-04-01"),
      "2026-05-01", "2026-05-02", // May missed
      "2026-06-01", "2026-06-02", // current month pending
    );
    expect(getCurrentStreakForFrequency(f, keys, day("2026-06-10"))).toBe(0);
  });

  it("computes the best run of consecutive months", () => {
    const keys = keysOf(
      ...twelveDays("2026-03-01"),
      ...twelveDays("2026-04-01"),
      ...twelveDays("2026-05-01"),
      ...twelveDays("2026-06-01"),
    );
    expect(getBestStreakForFrequency(f, keys)).toBe(4);
  });
});

describe("buildHistoryDays", () => {
  it("flags scheduled vs non-scheduled and completed days", () => {
    const f = freq({ frequency: "WEEKLY_DAYS", daysOfWeek: [1] });
    const days = buildHistoryDays(f, day("2026-06-01"), day("2026-06-07"), keysOf("2026-06-01"));
    expect(days).toEqual([
      { date: "2026-06-01", weekday: 1, scheduled: true, completed: true },
      { date: "2026-06-02", weekday: 2, scheduled: false, completed: false },
      { date: "2026-06-03", weekday: 3, scheduled: false, completed: false },
      { date: "2026-06-04", weekday: 4, scheduled: false, completed: false },
      { date: "2026-06-05", weekday: 5, scheduled: false, completed: false },
      { date: "2026-06-06", weekday: 6, scheduled: false, completed: false },
      { date: "2026-06-07", weekday: 0, scheduled: false, completed: false },
    ]);
  });
});
