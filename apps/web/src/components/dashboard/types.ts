export interface Pillar { id: string; name: string; color: string | null }
export interface Habit { id: string; name: string; pillarId: string; pillarName: string; isActive: boolean; monthlyGoal: number | null }
export interface Completion { habitId: string; date: string }
export interface HabitProgress { habitId: string; habitName: string; completed: number; goal: number }
export interface ChartData { day: number; completions: number }
export type HabitsGrouped = Record<string, (Habit & { color: string })[]>;
