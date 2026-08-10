import type { ProgressionLevelInfo } from "@lifeos/shared";

export const PROGRESSION_WEIGHTS = {
  habit: 40,
  goal: 30,
  project: 20,
  consistency: 10,
} as const;

export const MAX_PILLAR_XP = 10000;

export function thresholdForLevel(level: number): number {
  return 250 * (level - 1) * (level + 2);
}

export function xpToNextLevel(level: number): number {
  return 500 * (level + 1);
}

export function levelFromXp(xp: number): number {
  let level = 1;
  while (thresholdForLevel(level + 1) <= xp) level++;
  return level;
}

export function rankForLevel(level: number): string {
  if (level >= 6) return "S";
  if (level === 5) return "A";
  if (level === 4) return "B";
  if (level === 3) return "C";
  if (level === 2) return "D";
  return "E";
}

export function levelInfoOf(xp: number): ProgressionLevelInfo {
  const level = levelFromXp(xp);
  const threshold = thresholdForLevel(level);
  return {
    level,
    xp,
    xpIntoLevel: xp - threshold,
    xpToNext: xpToNextLevel(level),
    rank: rankForLevel(level),
  };
}

export interface ProgressionRates {
  habits: number;
  goals: number;
  projects: number;
  consistency: number;
}

export function pillarXp(rates: ProgressionRates): number {
  return Math.round(
    rates.habits * PROGRESSION_WEIGHTS.habit +
      rates.goals * PROGRESSION_WEIGHTS.goal +
      rates.projects * PROGRESSION_WEIGHTS.project +
      rates.consistency * PROGRESSION_WEIGHTS.consistency,
  );
}

export function xpBreakdown(rates: ProgressionRates): Record<keyof ProgressionRates, number> {
  return {
    habits: Math.round(rates.habits * PROGRESSION_WEIGHTS.habit),
    goals: Math.round(rates.goals * PROGRESSION_WEIGHTS.goal),
    projects: Math.round(rates.projects * PROGRESSION_WEIGHTS.project),
    consistency: Math.round(rates.consistency * PROGRESSION_WEIGHTS.consistency),
  };
}
