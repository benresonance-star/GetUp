// MOTION12 persistence contract — schemaVersion 1
// This file is normative for durable user training data.

export type Brand<T, B extends string> = T & { readonly __brand: B };

export type ExerciseId = Brand<string, "ExerciseId">;
export type SlotId = Brand<string, "SlotId">;
export type SessionId = Brand<string, "SessionId">;
export type SessionExerciseId = Brand<string, "SessionExerciseId">;
export type SetId = Brand<string, "SetId">;
export type MeasurementId = Brand<string, "MeasurementId">;
export type InstallationId = Brand<string, "InstallationId">;
export type ISODate = Brand<string, "ISODate">;
export type ISODateTime = Brand<string, "ISODateTime">;
export type ProgramVersion = Brand<string, "ProgramVersion">;

export type DayType =
  | "strength-a"
  | "restore-circuit"
  | "strength-b"
  | "power-circuit"
  | "strength-c"
  | "aerobic-power"
  | "aerobic-base";

export type SessionStatus = "planned" | "in-progress" | "completed" | "skipped" | "abandoned";
export type ExerciseStatus = "not-started" | "in-progress" | "completed" | "skipped";
export type SetStatus = "planned" | "completed" | "skipped";
export type Side = "left" | "right" | "both" | "alternating";

export type ExerciseCategory =
  | "strength"
  | "power"
  | "conditioning"
  | "carry"
  | "core"
  | "mobility"
  | "aerobic";

export type MeasurementType =
  | "load-reps"
  | "bodyweight-reps"
  | "load-time"
  | "bodyweight-time"
  | "distance"
  | "duration"
  | "interval";

export type Laterality = "bilateral" | "left-right" | "alternating" | "none";

export interface ExerciseDefinitionV1 {
  id: ExerciseId;
  name: string;
  category: ExerciseCategory;
  measurementType: MeasurementType;
  laterality: Laterality;
  deprecated?: boolean;
}

export interface PrescriptionV1 {
  sets?: number;
  repRange?: { min: number; max: number };
  durationRangeSeconds?: { min: number; max: number };
  fixedDurationSeconds?: number;
  restSeconds?: number;
  targetRir?: { min?: number; max?: number };
  rawText: string;
}

export interface ProgramExerciseSlotV1 {
  slotId: SlotId;
  exerciseId: ExerciseId;
  dayType: DayType;
  order: number;
  prescription: PrescriptionV1;
}

export interface PrescriptionSnapshotV1 extends PrescriptionV1 {}

export type LoadValueV1 =
  | { type: "external"; valueKg: number; display?: string }
  | { type: "bodyweight"; addedKg?: number; variation?: string; display?: string }
  | { type: "assisted"; assistanceKg?: number; method?: string; display?: string }
  | { type: "variation"; variation: string; display?: string };

export interface LegacyTraceV1 {
  sourceKey?: string;
  raw?: Record<string, unknown>;
}

export interface SetLogV1 {
  id: SetId;
  setNumber: number;
  status: SetStatus;
  side?: Side;
  load?: LoadValueV1;
  reps?: number;
  durationSeconds?: number;
  distanceMeters?: number;
  rir?: number;
  startedAt?: ISODateTime;
  completedAt?: ISODateTime;
  notes?: string;
  legacy?: LegacyTraceV1;
}

export interface SessionExerciseRecordV1 {
  id: SessionExerciseId;
  slotId: SlotId;
  exerciseId: ExerciseId;
  exerciseNameSnapshot: string;
  order: number;
  prescriptionSnapshot: PrescriptionSnapshotV1;
  status: ExerciseStatus;
  sets: SetLogV1[];
  startedAt?: ISODateTime;
  completedAt?: ISODateTime;
  notes?: string;
  legacy?: LegacyTraceV1;
}

export interface SessionSubjectiveV1 {
  rating?: "easy" | "good" | "hard" | "too-much";
  notes?: string;
}

export interface SessionRecordV1 {
  id: SessionId;
  programId: "motion12";
  programVersion: ProgramVersion;
  scheduledDate: ISODate;
  dayType: DayType;
  weekNumber: number;
  status: SessionStatus;
  exercises: SessionExerciseRecordV1[];
  startedAt?: ISODateTime;
  completedAt?: ISODateTime;
  subjective?: SessionSubjectiveV1;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
  legacy?: LegacyTraceV1;
}

export interface MeasurementRecordV1 {
  id: MeasurementId;
  recordedAt: ISODateTime;
  bodyweightKg?: number;
  waistCm?: number;
  bloodPressure?: { systolic: number; diastolic: number };
  restingHeartRateBpm?: number;
  walk2kmSeconds?: number;
  strictPushups?: number;
  notes?: string;
}

export interface UserProfileV1 {
  displayName?: string;
}

export interface UserSettingsV1 {
  programStartDate?: ISODate;
  bodyweightKg?: number;
  dailyStepTarget?: number;
  compactMode?: boolean;
  units: { mass: "kg" | "lb"; distance: "metric" | "imperial" };
  timer: { soundEnabled: boolean; vibrationEnabled: boolean };
}

export interface MigrationRecordV1 {
  id: string;
  fromSchemaVersion: number;
  toSchemaVersion: number;
  startedAt: ISODateTime;
  completedAt: ISODateTime;
  source: "legacy-localstorage" | "import" | "schema-migration";
  recordsRead: number;
  recordsWritten: number;
  warnings?: string[];
}

export interface Motion12DataV1 {
  schemaVersion: 1;
  meta: {
    installationId: InstallationId;
    createdAt: ISODateTime;
    updatedAt: ISODateTime;
    lastMigrationAt?: ISODateTime;
  };
  profile: UserProfileV1;
  settings: UserSettingsV1;
  sessions: Record<string, SessionRecordV1>;
  measurements: MeasurementRecordV1[];
  migrationHistory: MigrationRecordV1[];
}

export interface ValidationIssue {
  path: string;
  code: string;
  message: string;
  severity: "error" | "warning";
}

export interface ValidationResult<T> {
  valid: boolean;
  value?: T;
  issues: ValidationIssue[];
}

export interface Motion12AppStateV1 {
  version: 1;

  /**
   * Compatibility-only application preferences that are not part of
   * durable training history (nutrition portions, display preferences, etc.).
   * Persisted in IndexedDB, never localStorage after migration.
   */
  compatSettings: Record<string, unknown>;

  /**
   * Non-training checklist/log entries such as meal completion.
   */
  miscLogs: Record<string, unknown>;

  /**
   * Current measurement form projection. Historical measurements remain
   * append-only in Motion12DataV1.measurements.
   */
  measurementsCurrent: Record<string, unknown>;

  /**
   * Runtime state is persisted in IndexedDB so an active timer can recover
   * after a reload, but it is not part of the training-history schema.
   */
  smartTimer: Record<string, unknown> | null;
  inlineTimer: Record<string, unknown> | null;
}

export interface Motion12BackupV1 {
  format: "motion12-backup";
  backupVersion: 1;
  exportedAt: ISODateTime;
  data: Motion12DataV1;
  appState: Motion12AppStateV1;
}

export interface Motion12Repository {
  load(): Promise<Motion12DataV1>;
  save(data: Motion12DataV1): Promise<void>;
  getSession(id: SessionId): Promise<SessionRecordV1 | null>;
  getSessionForDate(date: ISODate, dayType: DayType): Promise<SessionRecordV1 | null>;
  putSession(session: SessionRecordV1): Promise<void>;
  appendMeasurement(measurement: MeasurementRecordV1): Promise<void>;
  exportBackup(): Promise<string>;
  importBackup(json: string): Promise<ValidationResult<Motion12DataV1>>;
}

/**
 * Production implementation uses IndexedDB database "motion12".
 * localStorage is read only during the one-time bootstrap migration.
 */
export interface IndexedDBMotion12Repository extends Motion12Repository {
  loadAppState(): Promise<Motion12AppStateV1 | null>;
  saveState(
    data: Motion12DataV1,
    appState: Motion12AppStateV1
  ): Promise<void>;
}

export const VALID_SESSION_TRANSITIONS = {
  planned: ["in-progress", "skipped"],
  "in-progress": ["completed", "abandoned"],
  completed: [],
  skipped: [],
  abandoned: []
} as const;

export const VALID_EXERCISE_TRANSITIONS = {
  "not-started": ["in-progress", "skipped"],
  "in-progress": ["completed", "skipped"],
  completed: [],
  skipped: []
} as const;

export const VALID_SET_TRANSITIONS = {
  planned: ["completed", "skipped"],
  completed: [],
  skipped: []
} as const;

// Runtime validation is implemented in persistence-v1.js.
// Mandatory invariants:
// - schemaVersion === 1.
// - Stable IDs never derive identity from array order.
// - UUID instance IDs are unique.
// - Historical prescription/name snapshots are not reconstructed silently.
// - Numeric performance values are finite and non-negative; RIR is integer 0..10.
// - Migration/validation failure must never clear or overwrite source legacy data.
