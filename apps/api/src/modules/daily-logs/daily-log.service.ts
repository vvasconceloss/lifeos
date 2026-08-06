import { prisma } from "../../db/client";
import type {
  CreateDailyLogBody,
  DailyLogCorrelations,
  DailyLogResponse,
  UpdateDailyLogBody,
} from "./daily-log.schemas";
import { toDateKey } from "../stats/stats.utils";

function utcMidnight(dateKey: string): Date {
  return new Date(`${dateKey}T00:00:00.000Z`);
}

function toResponse(log: {
  id: string;
  date: Date;
  mood: number | null;
  energy: number | null;
  sleepHours: number | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}): DailyLogResponse {
  return {
    id: log.id,
    date: toDateKey(log.date),
    mood: log.mood,
    energy: log.energy,
    sleepHours: log.sleepHours,
    notes: log.notes,
    createdAt: log.createdAt,
    updatedAt: log.updatedAt,
  };
}

export async function listDailyLogs(
  userId: string,
  from?: string,
  to?: string,
): Promise<DailyLogResponse[]> {
  const logs = await prisma.dailyLog.findMany({
    where: {
      userId,
      ...(from || to
        ? {
            date: {
              ...(from ? { gte: utcMidnight(from) } : {}),
              ...(to ? { lte: utcMidnight(to) } : {}),
            },
          }
        : {}),
    },
    orderBy: { date: "asc" },
  });

  return logs.map(toResponse);
}

export async function upsertDailyLog(
  userId: string,
  data: CreateDailyLogBody,
): Promise<{ log: DailyLogResponse } | { error: string; status: number }> {
  const date = utcMidnight(data.date);
  const today = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate()));

  if (date > today) {
    return { error: "Cannot log future dates", status: 400 };
  }

  const log = await prisma.dailyLog.upsert({
    where: { userId_date: { userId, date } },
    create: {
      userId,
      date,
      mood: data.mood ?? null,
      energy: data.energy ?? null,
      sleepHours: data.sleepHours ?? null,
      notes: data.notes ?? null,
    },
    update: {
      mood: data.mood ?? null,
      energy: data.energy ?? null,
      sleepHours: data.sleepHours ?? null,
      notes: data.notes ?? null,
    },
  });

  return { log: toResponse(log) };
}

export async function getDailyLogByDate(
  userId: string,
  date: string,
): Promise<DailyLogResponse | null> {
  const log = await prisma.dailyLog.findUnique({
    where: { userId_date: { userId, date: utcMidnight(date) } },
  });

  return log ? toResponse(log) : null;
}

export async function updateDailyLog(
  id: string,
  userId: string,
  data: UpdateDailyLogBody,
): Promise<{ log: DailyLogResponse } | { error: string; status: number }> {
  const existing = await prisma.dailyLog.findFirst({ where: { id, userId } });
  if (!existing) return { error: "Daily log not found", status: 404 };

  const log = await prisma.dailyLog.update({
    where: { id },
    data: {
      ...(data.mood !== undefined && { mood: data.mood }),
      ...(data.energy !== undefined && { energy: data.energy }),
      ...(data.sleepHours !== undefined && { sleepHours: data.sleepHours }),
      ...(data.notes !== undefined && { notes: data.notes }),
    },
  });

  return { log: toResponse(log) };
}

export async function deleteDailyLog(
  id: string,
  userId: string,
): Promise<true | { error: string; status: number }> {
  const existing = await prisma.dailyLog.findFirst({ where: { id, userId } });
  if (!existing) return { error: "Daily log not found", status: 404 };

  await prisma.dailyLog.delete({ where: { id } });
  return true;
}

type Bucket = { label: string; test: (v: number) => boolean };
type Accumulator = Record<string, { sum: number; count: number }>;

function accumulate(
  acc: Accumulator,
  value: number,
  buckets: Bucket[],
  rate: number,
): void {
  const bucket = buckets.find((b) => b.test(value));
  if (!bucket) return;
  const entry = acc[bucket.label] ?? { sum: 0, count: 0 };
  entry.sum += rate;
  entry.count += 1;
  acc[bucket.label] = entry;
}

function toSeries(acc: Accumulator, order: string[]): { label: string; rate: number; days: number }[] {
  return order
    .map((label) => {
      const entry = acc[label];
      if (!entry) return null;
      return {
        label,
        rate: Math.round(entry.sum / entry.count),
        days: entry.count,
      };
    })
    .filter((x): x is { label: string; rate: number; days: number } => x !== null);
}

const SLEEP_BUCKETS: Bucket[] = [
  { label: "<6h", test: (v) => v < 6 },
  { label: "6–7h", test: (v) => v >= 6 && v < 7 },
  { label: "7–9h", test: (v) => v >= 7 && v <= 9 },
  { label: ">9h", test: (v) => v > 9 },
];
const SLEEP_ORDER = ["<6h", "6–7h", "7–9h", ">9h"];

const RATING_BUCKETS: Bucket[] = [
  { label: "1–4", test: (v) => v <= 4 },
  { label: "5–7", test: (v) => v >= 5 && v <= 7 },
  { label: "8–10", test: (v) => v >= 8 },
];
const RATING_ORDER = ["1–4", "5–7", "8–10"];

export async function getCorrelations(
  userId: string,
  from?: string,
  to?: string,
): Promise<DailyLogCorrelations> {
  const start = from ? utcMidnight(from) : new Date(Date.UTC(1970, 0, 1));
  const end = to ? utcMidnight(to) : new Date();

  const [logs, habits, completions] = await Promise.all([
    prisma.dailyLog.findMany({ where: { userId, date: { gte: start, lte: end } } }),
    prisma.habit.findMany({ where: { userId, isActive: true }, select: { id: true } }),
    prisma.habitCompletion.findMany({
      where: { date: { gte: start, lte: end } },
      select: { habitId: true, date: true },
    }),
  ]);

  const habitIds = new Set(habits.map((h) => h.id));

  const completedByDay = new Map<string, number>();
  for (const c of completions) {
    if (!habitIds.has(c.habitId)) continue;
    const key = toDateKey(c.date);
    completedByDay.set(key, (completedByDay.get(key) ?? 0) + 1);
  }

  const sleep: Accumulator = {};
  const mood: Accumulator = {};
  const energy: Accumulator = {};

  for (const log of logs) {
    const key = toDateKey(log.date);
    const completed = completedByDay.get(key) ?? 0;
    const rate = habits.length > 0 ? Math.round((completed / habits.length) * 100) : 0;

    if (log.sleepHours != null) accumulate(sleep, log.sleepHours, SLEEP_BUCKETS, rate);
    if (log.mood != null) accumulate(mood, log.mood, RATING_BUCKETS, rate);
    if (log.energy != null) accumulate(energy, log.energy, RATING_BUCKETS, rate);
  }

  return {
    sleep: toSeries(sleep, SLEEP_ORDER),
    mood: toSeries(mood, RATING_ORDER),
    energy: toSeries(energy, RATING_ORDER),
  };
}
