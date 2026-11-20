import type { MovementPattern, WorkoutLogEntry } from '../types/schemas';

export interface PatternRecoveryStatus {
  pattern: MovementPattern;
  status: 'fresh' | 'recovering';
  daysSince: number | null;
  lastDate: string | null;
  lastExercises: string[];
  isIntense: boolean;
  cooldownHours: 48 | 72;
}

export interface RecentSessionSummary {
  sessionId: string;
  date: string;
  patterns: MovementPattern[];
  exercises: string[];
  totalSets: number;
  isIntense: boolean;
}

const ALL_PATTERNS: MovementPattern[] = ['push', 'pull', 'legs', 'core'];

function parseUtcDayMs(dateStr: string): number {
  const [y, m, d] = dateStr.slice(0, 10).split('-').map(Number);
  return Date.UTC(y, (m || 1) - 1, d || 1);
}

function isSessionIntense(sets: WorkoutLogEntry[]): boolean {
  return (
    sets.length >= 3 ||
    sets.some((s) => s.rir <= 1 || s.soreness_tag !== 'none' || s.location === 'gym')
  );
}

export function evaluatePatternRecovery(
  logs: WorkoutLogEntry[],
  referenceDateStr: string = new Date().toISOString().slice(0, 10),
): Record<MovementPattern, PatternRecoveryStatus> {
  const refMs = parseUtcDayMs(referenceDateStr);
  const result = {} as Record<MovementPattern, PatternRecoveryStatus>;

  for (const pattern of ALL_PATTERNS) {
    const patternLogs = logs.filter((l) => l.pattern === pattern && l.date <= referenceDateStr);
    if (patternLogs.length === 0) {
      result[pattern] = {
        pattern,
        status: 'fresh',
        daysSince: null,
        lastDate: null,
        lastExercises: [],
        isIntense: false,
        cooldownHours: 48,
      };
      continue;
    }

    // Find most recent session date for this pattern
    let latestDate = patternLogs[0].date;
    for (const l of patternLogs) {
      if (l.date > latestDate) latestDate = l.date;
    }
    const latestDaySets = patternLogs.filter((l) => l.date === latestDate);
    const intense = isSessionIntense(latestDaySets);
    const cooldownDays = intense ? 2 : 1; // >2 days (72h) after intense, >1 day (48h) after moderate
    const daysSince = Math.max(0, Math.round((refMs - parseUtcDayMs(latestDate)) / 86_400_000));
    const recovering = daysSince <= cooldownDays;

    result[pattern] = {
      pattern,
      status: recovering ? 'recovering' : 'fresh',
      daysSince,
      lastDate: latestDate,
      lastExercises: Array.from(new Set(latestDaySets.map((s) => s.exercise_slug))),
      isIntense: intense,
      cooldownHours: intense ? 72 : 48,
    };
  }

  return result;
}

export function resolveRecoverySafePatterns(
  plannedPatterns: MovementPattern[],
  logs: WorkoutLogEntry[],
  referenceDateStr: string = new Date().toISOString().slice(0, 10),
): {
  activePatterns: MovementPattern[];
  rotatedFrom: MovementPattern[];
  explanation: string | null;
  recoveryMap: Record<MovementPattern, PatternRecoveryStatus>;
} {
  const recoveryMap = evaluatePatternRecovery(logs, referenceDateStr);
  const recoveringPlanned = plannedPatterns.filter((p) => recoveryMap[p]?.status === 'recovering');

  if (recoveringPlanned.length === 0) {
    return {
      activePatterns: plannedPatterns,
      rotatedFrom: [],
      explanation: null,
      recoveryMap,
    };
  }

  const freshPlanned = plannedPatterns.filter((p) => recoveryMap[p]?.status === 'fresh');
  const substitutePool: MovementPattern[] = ['push', 'pull', 'core', 'legs'];
  const activePatterns: MovementPattern[] = [...freshPlanned];

  for (const cand of substitutePool) {
    if (activePatterns.length >= Math.max(1, plannedPatterns.length)) break;
    if (!activePatterns.includes(cand) && recoveryMap[cand]?.status === 'fresh') {
      activePatterns.push(cand);
    }
  }

  if (activePatterns.length === 0) {
    activePatterns.push('core');
  }

  const details = recoveringPlanned
    .map((p) => {
      const st = recoveryMap[p];
      const ago = st.daysSince === 0 ? 'today' : `${st.daysSince}d ago`;
      return `${p.toUpperCase()} (${st.isIntense ? 'intense ' : ''}${ago})`;
    })
    .join(', ');

  return {
    activePatterns,
    rotatedFrom: recoveringPlanned,
    explanation: `Recovery Guard rotated away from ${details} to prevent overtraining; training ${activePatterns
      .map((p) => p.toUpperCase())
      .join(' + ')} instead.`,
    recoveryMap,
  };
}

export function getRecentWorkoutHistory(
  logs: WorkoutLogEntry[],
  limit = 5,
): RecentSessionSummary[] {
  const bySession = new Map<string, WorkoutLogEntry[]>();
  for (const log of logs) {
    const key = `${log.date}__${log.session_id}`;
    if (!bySession.has(key)) bySession.set(key, []);
    bySession.get(key)!.push(log);
  }

  const summaries: RecentSessionSummary[] = [];
  for (const [, sets] of bySession) {
    summaries.push({
      sessionId: sets[0].session_id,
      date: sets[0].date,
      patterns: Array.from(new Set(sets.map((s) => s.pattern))),
      exercises: Array.from(new Set(sets.map((s) => s.exercise_slug))),
      totalSets: sets.length,
      isIntense: isSessionIntense(sets),
    });
  }

  return summaries.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0)).slice(0, limit);
}
