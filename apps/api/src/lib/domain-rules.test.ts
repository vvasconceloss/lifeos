import {
  completionRate,
  expectedCompletions,
  getBestStreakForFrequency,
  getCurrentStreakForFrequency,
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

type RateCase = {
  name: string;
  f: FrequencyParams;
  from: string;
  to: string;
  completed: number;
  expected: number;
  rate: number;
};

describe("completion rate (table-driven)", () => {
  const cases: RateCase[] = [
    {
      name: "DAILY — 8 of 10 days",
      f: freq({ frequency: "DAILY" }),
      from: "2026-06-01",
      to: "2026-06-10",
      completed: 8,
      expected: 10,
      rate: 80,
    },
    {
      name: "WEEKLY_DAYS Mon/Wed/Fri — 2 of 3 scheduled",
      f: freq({ frequency: "WEEKLY_DAYS", daysOfWeek: [1, 3, 5] }),
      from: "2026-06-01",
      to: "2026-06-07",
      completed: 2,
      expected: 3,
      rate: 67,
    },
    {
      name: "TIMES_PER_WEEK x3 — 5 of 6 over two weeks",
      f: freq({ frequency: "TIMES_PER_WEEK", timesPerWeek: 3 }),
      from: "2026-06-01",
      to: "2026-06-14",
      completed: 5,
      expected: 6,
      rate: 83,
    },
    {
      name: "TIMES_PER_MONTH x10 — full month met",
      f: freq({ frequency: "TIMES_PER_MONTH", timesPerMonth: 10 }),
      from: "2026-06-01",
      to: "2026-06-30",
      completed: 10,
      expected: 10,
      rate: 100,
    },
    {
      name: "non-scheduled completions cap at 100",
      f: freq({ frequency: "WEEKLY_DAYS", daysOfWeek: [1] }),
      from: "2026-06-01",
      to: "2026-06-07",
      completed: 2,
      expected: 1,
      rate: 100,
    },
  ];

  it.each(cases)(
    "$name → $completed of $expected expected → $rate%",
    ({ f, from, to, completed, expected, rate }) => {
      expect(expectedCompletions(f, day(from), day(to))).toBe(expected);
      expect(completionRate(completed, expected)).toBe(rate);
    },
  );
});

type CurrentStreakCase = {
  name: string;
  f: FrequencyParams;
  reference: string;
  keys: string[];
  streak: number;
};

describe("current streak (table-driven)", () => {
  const cases: CurrentStreakCase[] = [
    {
      name: "DAILY — consecutive through yesterday (today pending)",
      f: freq({ frequency: "DAILY" }),
      reference: "2026-06-10",
      keys: ["2026-06-08", "2026-06-09"],
      streak: 2,
    },
    {
      name: "DAILY — broken by a gap",
      f: freq({ frequency: "DAILY" }),
      reference: "2026-06-10",
      keys: ["2026-06-06", "2026-06-07", "2026-06-09"],
      streak: 1,
    },
    {
      name: "WEEKLY_DAYS — skips rest days",
      f: freq({ frequency: "WEEKLY_DAYS", daysOfWeek: [1, 3, 5] }),
      reference: "2026-06-05",
      keys: ["2026-06-01", "2026-06-03", "2026-06-05"],
      streak: 3,
    },
    {
      name: "TIMES_PER_WEEK — one full week met",
      f: freq({ frequency: "TIMES_PER_WEEK", timesPerWeek: 3 }),
      reference: "2026-06-12",
      keys: ["2026-06-02", "2026-06-03", "2026-06-04"],
      streak: 1,
    },
  ];

  it.each(cases)("$name → $streak", ({ f, reference, keys, streak }) => {
    expect(getCurrentStreakForFrequency(f, keysOf(...keys), day(reference), 1)).toBe(streak);
  });
});

type BestStreakCase = {
  name: string;
  f: FrequencyParams;
  keys: string[];
  streak: number;
};

describe("best streak (table-driven)", () => {
  const cases: BestStreakCase[] = [
    {
      name: "DAILY — longest historical run",
      f: freq({ frequency: "DAILY" }),
      keys: ["2026-06-01", "2026-06-02", "2026-06-03", "2026-06-10", "2026-06-11"],
      streak: 3,
    },
    {
      name: "WEEKLY_DAYS — best run of scheduled days",
      f: freq({ frequency: "WEEKLY_DAYS", daysOfWeek: [1, 3, 5] }),
      keys: ["2026-06-01", "2026-06-03", "2026-06-05", "2026-06-10", "2026-06-12"],
      streak: 3,
    },
    {
      name: "TIMES_PER_WEEK — two consecutive weeks met",
      f: freq({ frequency: "TIMES_PER_WEEK", timesPerWeek: 2 }),
      keys: ["2026-06-01", "2026-06-02", "2026-06-08", "2026-06-09"],
      streak: 2,
    },
  ];

  it.each(cases)("$name → $streak", ({ f, keys, streak }) => {
    expect(getBestStreakForFrequency(f, keysOf(...keys), 1)).toBe(streak);
  });
});
