export interface SessionTemplate {
  id: string;
  name: string;
  totalMinutes: number;
  phases: {
    warmupMin: number;
    mainMin: number;
    cooldownMin: number;
  };
  items: RoutineItem[];
  createdAt: number;
  updatedAt: number;
}

export interface RoutineItem {
  id: string;
  exerciseId: string;
  phase: 'warmup' | 'main' | 'cooldown';
  scheme: {
    type: 'reps' | 'time' | 'mixed';
    sets: number;
    targetReps?: number;
    repRange?: [number, number];
    targetSeconds?: number;
  };
  restSeconds?: number;
  supersetGroupId?: string;
  defaultLoad?: {
    unit: 'kg' | 'bw' | 'band';
    value?: number;
    bandLabel?: string;
  };
  videoUrl?: string;
  notes?: string;
}

export interface Exercise {
  id: string;
  name: string;
  category: 'kettlebell' | 'band' | 'bodyweight' | 'mobility' | 'stretch';
  aliases?: string[];
  defaultVideoUrl?: string;
}

export interface SessionRun {
  id: string;
  templateId: string;
  templateSnapshot: SessionTemplate;
  startedAt: number;
  endedAt?: number;
  totalMinutesPlanned: number;
  events: RunEvent[];
  sessionNote?: string;
}

export interface RunEvent {
  t: number; // timestamp ms
  type: 'RUN_STARTED' | 'RUN_PAUSED' | 'RUN_RESUMED' | 'RUN_FINISHED' | 'SET_STARTED' | 'SET_COMPLETED' | 'ITEM_SKIPPED' | 'NOTE_ADDED';
  payload: {
    routineItemId?: string;
    setIndex?: number;
    load?: { unit: string; value?: number; bandLabel?: string };
    reps?: number;
    seconds?: number;
    rpe?: number;
    note?: string;
  };
}
