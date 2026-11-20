import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import {
  UserProfileSchema,
  type BodyMetricEntry,
  type DailyCheckIn,
  type DriveSyncMeta,
  type PrimeAssessmentEntry,
  type ProgramConfig,
  type UserProfile,
  type WorkoutLogEntry,
} from '../types/schemas';

interface CalisthenicsDB extends DBSchema {
  user_profile: {
    key: 'singleton';
    value: UserProfile;
  };
  program_config: {
    key: 'singleton';
    value: ProgramConfig;
  };
  workout_logs: {
    key: number;
    value: WorkoutLogEntry;
    indexes: { 'by-date': string; 'by-session': string; 'by-pattern': string };
  };
  drive_sync_meta: {
    key: 'singleton';
    value: DriveSyncMeta;
  };
  daily_checkins: {
    key: string;
    value: DailyCheckIn;
  };
  prime_assessments: {
    key: number;
    value: PrimeAssessmentEntry;
    indexes: { 'by-date': string };
  };
  body_metrics: {
    key: number;
    value: BodyMetricEntry;
    indexes: { 'by-date': string };
  };
}

let dbPromise: Promise<IDBPDatabase<CalisthenicsDB>> | null = null;

function getDb(): Promise<IDBPDatabase<CalisthenicsDB>> {
  if (!dbPromise) {
    dbPromise = openDB<CalisthenicsDB>('prime-coach-db', 2, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('user_profile')) {
          db.createObjectStore('user_profile');
        }
        if (!db.objectStoreNames.contains('program_config')) {
          db.createObjectStore('program_config');
        }
        if (!db.objectStoreNames.contains('workout_logs')) {
          const logStore = db.createObjectStore('workout_logs', {
            keyPath: 'id',
            autoIncrement: true,
          });
          logStore.createIndex('by-date', 'date');
          logStore.createIndex('by-session', 'session_id');
          logStore.createIndex('by-pattern', 'pattern');
        }
        if (!db.objectStoreNames.contains('drive_sync_meta')) {
          db.createObjectStore('drive_sync_meta');
        }
        if (!db.objectStoreNames.contains('daily_checkins')) {
          db.createObjectStore('daily_checkins', { keyPath: 'date' });
        }
        if (!db.objectStoreNames.contains('prime_assessments')) {
          const assessStore = db.createObjectStore('prime_assessments', {
            keyPath: 'id',
            autoIncrement: true,
          });
          assessStore.createIndex('by-date', 'date');
        }
        if (!db.objectStoreNames.contains('body_metrics')) {
          const bodyStore = db.createObjectStore('body_metrics', {
            keyPath: 'id',
            autoIncrement: true,
          });
          bodyStore.createIndex('by-date', 'date');
        }
      },
    });
  }
  return dbPromise;
}

export async function loadUserProfile(): Promise<UserProfile | undefined> {
  const db = await getDb();
  const raw = await db.get('user_profile', 'singleton');
  if (!raw) return undefined;
  const parsed = UserProfileSchema.safeParse(raw);
  if (!parsed.success || parsed.data.onboarding_version !== 2) {
    return undefined;
  }
  return parsed.data;
}

export async function resetAllAppData(): Promise<void> {
  const db = await getDb();
  await Promise.all([
    db.delete('user_profile', 'singleton'),
    db.delete('program_config', 'singleton'),
  ]);
}

export async function saveUserProfile(profile: UserProfile): Promise<void> {
  const db = await getDb();
  await db.put('user_profile', profile, 'singleton');
}

export async function loadProgramConfig(): Promise<ProgramConfig | undefined> {
  const db = await getDb();
  return db.get('program_config', 'singleton');
}

export async function saveProgramConfig(config: ProgramConfig): Promise<void> {
  const db = await getDb();
  await db.put('program_config', config, 'singleton');
}

export async function appendWorkoutLog(entry: Omit<WorkoutLogEntry, 'id'>): Promise<number> {
  const db = await getDb();
  return db.add('workout_logs', entry as WorkoutLogEntry);
}

export async function loadAllWorkoutLogs(): Promise<WorkoutLogEntry[]> {
  const db = await getDb();
  return db.getAll('workout_logs');
}

/**
 * Deletes local IndexedDB workout logs strictly older than `keepDays` days
 * once safely offloaded to Google Drive, keeping recent 72h recovery + 14d
 * progression windows fast and compact on-device.
 */
export async function pruneOldWorkoutLogs(
  keepDays = 14,
): Promise<{ deleted: number; remaining: number }> {
  const db = await getDb();
  const cutoffDate = new Date(Date.now() - keepDays * 86_400_000).toISOString().slice(0, 10);
  const all = await db.getAll('workout_logs');
  const toDelete = all.filter((entry) => entry.date < cutoffDate && typeof entry.id === 'number');
  if (toDelete.length === 0) {
    return { deleted: 0, remaining: all.length };
  }
  const tx = db.transaction('workout_logs', 'readwrite');
  for (const entry of toDelete) {
    if (typeof entry.id === 'number') {
      await tx.store.delete(entry.id);
    }
  }
  await tx.done;
  return { deleted: toDelete.length, remaining: all.length - toDelete.length };
}

export async function loadDriveSyncMeta(): Promise<DriveSyncMeta> {
  const db = await getDb();
  const meta = await db.get('drive_sync_meta', 'singleton');
  return meta ?? { id: 'singleton' };
}

export async function saveDriveSyncMeta(meta: DriveSyncMeta): Promise<void> {
  const db = await getDb();
  await db.put('drive_sync_meta', meta, 'singleton');
}

export async function loadDailyCheckIn(date: string): Promise<DailyCheckIn | undefined> {
  const db = await getDb();
  return db.get('daily_checkins', date);
}

export async function saveDailyCheckIn(entry: DailyCheckIn): Promise<void> {
  const db = await getDb();
  await db.put('daily_checkins', entry);
}

export async function loadAllDailyCheckIns(): Promise<DailyCheckIn[]> {
  const db = await getDb();
  return db.getAll('daily_checkins');
}

export async function appendPrimeAssessment(
  entry: Omit<PrimeAssessmentEntry, 'id'>,
): Promise<number> {
  const db = await getDb();
  return db.add('prime_assessments', entry as PrimeAssessmentEntry);
}

export async function loadAllPrimeAssessments(): Promise<PrimeAssessmentEntry[]> {
  const db = await getDb();
  const all = await db.getAll('prime_assessments');
  return all.sort((a, b) => a.created_at.localeCompare(b.created_at));
}

export async function appendBodyMetric(
  entry: Omit<BodyMetricEntry, 'id'>,
): Promise<number> {
  const db = await getDb();
  return db.add('body_metrics', entry as BodyMetricEntry);
}

export async function loadAllBodyMetrics(): Promise<BodyMetricEntry[]> {
  const db = await getDb();
  const all = await db.getAll('body_metrics');
  return all.sort((a, b) => a.created_at.localeCompare(b.created_at));
}
