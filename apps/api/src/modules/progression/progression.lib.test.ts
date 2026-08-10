import { describe, expect, it } from 'vitest';
import {
  levelFromXp,
  levelInfoOf,
  pillarXp,
  PROGRESSION_WEIGHTS,
  rankForLevel,
  thresholdForLevel,
  xpBreakdown,
  xpToNextLevel,
} from './progression.lib';

describe('progression level curve', () => {
  it('computes cumulative thresholds', () => {
    expect(thresholdForLevel(1)).toBe(0);
    expect(thresholdForLevel(2)).toBe(1000);
    expect(thresholdForLevel(3)).toBe(2500);
    expect(thresholdForLevel(4)).toBe(4500);
    expect(thresholdForLevel(5)).toBe(7000);
    expect(thresholdForLevel(6)).toBe(10000);
  });

  it('computes per-level requirements', () => {
    expect(xpToNextLevel(1)).toBe(1000);
    expect(xpToNextLevel(2)).toBe(1500);
    expect(xpToNextLevel(5)).toBe(3000);
  });

  it('derives the level from a total XP', () => {
    expect(levelFromXp(0)).toBe(1);
    expect(levelFromXp(999)).toBe(1);
    expect(levelFromXp(1000)).toBe(2);
    expect(levelFromXp(2500)).toBe(3);
    expect(levelFromXp(10000)).toBe(6);
    expect(levelFromXp(60000)).toBe(15);
  });

  it('reports progress within the current level', () => {
    expect(levelInfoOf(0)).toMatchObject({ level: 1, xp: 0, xpIntoLevel: 0, xpToNext: 1000 });
    expect(levelInfoOf(8240)).toMatchObject({ level: 5, xp: 8240, xpIntoLevel: 1240, xpToNext: 3000 });
    expect(levelInfoOf(10000)).toMatchObject({ level: 6, xpIntoLevel: 0 });
  });

  it('maps levels to ranks', () => {
    expect(rankForLevel(1)).toBe('E');
    expect(rankForLevel(2)).toBe('D');
    expect(rankForLevel(3)).toBe('C');
    expect(rankForLevel(4)).toBe('B');
    expect(rankForLevel(5)).toBe('A');
    expect(rankForLevel(6)).toBe('S');
    expect(rankForLevel(30)).toBe('S');
  });
});

describe('pillar XP formula', () => {
  it('uses transparent weights', () => {
    expect(PROGRESSION_WEIGHTS).toEqual({ habit: 40, goal: 30, project: 20, consistency: 10 });
  });

  it('is zero for an untouched pillar', () => {
    expect(pillarXp({ habits: 0, goals: 0, projects: 0, consistency: 0 })).toBe(0);
  });

  it('caps a perfect pillar at the maximum', () => {
    expect(pillarXp({ habits: 100, goals: 100, projects: 100, consistency: 100 })).toBe(10000);
  });

  it('scales linearly per source', () => {
    expect(pillarXp({ habits: 50, goals: 0, projects: 0, consistency: 0 })).toBe(2000);
    expect(pillarXp({ habits: 0, goals: 50, projects: 0, consistency: 0 })).toBe(1500);
    expect(pillarXp({ habits: 0, goals: 0, projects: 50, consistency: 0 })).toBe(1000);
    expect(pillarXp({ habits: 0, goals: 0, projects: 0, consistency: 50 })).toBe(500);
  });

  it('breaks down XP per source', () => {
    expect(xpBreakdown({ habits: 100, goals: 100, projects: 100, consistency: 100 })).toEqual({
      habits: 4000,
      goals: 3000,
      projects: 2000,
      consistency: 1000,
    });
  });
});
