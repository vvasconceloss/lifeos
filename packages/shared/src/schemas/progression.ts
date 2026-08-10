export interface ProgressionLevelInfo {
  level: number;
  xp: number;
  xpIntoLevel: number;
  xpToNext: number;
  rank: string;
}

export interface PillarProgression extends ProgressionLevelInfo {
  pillarId: string;
  pillarName: string;
  color: string | null;
  rates: {
    habits: number;
    goals: number;
    projects: number;
    consistency: number;
  };
  breakdown: {
    habits: number;
    goals: number;
    projects: number;
    consistency: number;
  };
}

export interface ProgressionResponse {
  enabled: boolean;
  overall: ProgressionLevelInfo | null;
  pillars: PillarProgression[];
}
