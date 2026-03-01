import Dexie, { Table } from 'dexie';
import { SessionTemplate, Exercise, SessionRun } from '../domain/types';

export class GetUpDatabase extends Dexie {
  templates!: Table<SessionTemplate>;
  exercises!: Table<Exercise>;
  runs!: Table<SessionRun>;

  constructor() {
    super('GetUpDB');
    this.version(1).stores({
      templates: 'id, name, createdAt, updatedAt',
      exercises: 'id, name, category',
      runs: 'id, templateId, startedAt, endedAt'
    });
  }
}

export const db = new GetUpDatabase();

// Seed data function
export async function seedDatabase() {
  const exerciseCount = await db.exercises.count();
  if (exerciseCount > 0) return;

  const initialExercises: Exercise[] = [
    { id: 'kb-press', name: 'KB Press', category: 'kettlebell' },
    { id: 'bent-row', name: 'Bent Row', category: 'kettlebell' },
    { id: 'goblet-squat', name: 'Goblet Squat', category: 'kettlebell' },
    { id: 'swing', name: 'Swing', category: 'kettlebell' },
    { id: 'tgu', name: 'Turkish Get Up', category: 'kettlebell' },
    { id: 'band-pull-apart', name: 'Band Pull Apart', category: 'band' },
    { id: 'push-up', name: 'Push Up', category: 'bodyweight' },
    { id: 'pull-up', name: 'Pull Up', category: 'bodyweight' },
    { id: 'lunges', name: 'Lunges', category: 'bodyweight' },
    { id: 'plank', name: 'Plank', category: 'bodyweight' },
    { id: 'cat-cow', name: 'Cat Cow', category: 'mobility' },
    { id: 'pigeon-stretch', name: 'Pigeon Stretch', category: 'stretch' },
  ];

  await db.exercises.bulkAdd(initialExercises);

  const defaultTemplate: SessionTemplate = {
    id: 'default-30',
    name: 'Full Body 30',
    totalMinutes: 30,
    phases: { warmupMin: 5, mainMin: 20, cooldownMin: 5 },
    items: [
      {
        id: 'item-1',
        exerciseId: 'cat-cow',
        phase: 'warmup',
        scheme: { type: 'time', sets: 1, targetSeconds: 60 },
      },
      {
        id: 'item-2',
        exerciseId: 'kb-press',
        phase: 'main',
        scheme: { type: 'reps', sets: 3, targetReps: 8 },
        defaultLoad: { unit: 'kg', value: 16 },
      },
      {
        id: 'item-3',
        exerciseId: 'bent-row',
        phase: 'main',
        scheme: { type: 'reps', sets: 3, targetReps: 8 },
        defaultLoad: { unit: 'kg', value: 20 },
      },
    ],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  await db.templates.add(defaultTemplate);
}
