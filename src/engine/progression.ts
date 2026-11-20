import type { MovementPattern, ProgramConfig, ReadinessLevel, WorkoutLogEntry } from '../types/schemas';

export function computeWorkingSets(
  baseSets: number,
  readiness: ReadinessLevel,
  globalModifiers: ProgramConfig['global_modifiers'],
): number {
  const readinessDelta = readiness === 'fresh' ? 1 : readiness === 'fatigued' ? -1 : 0;
  const deloadMultiplier = globalModifiers.deload_active ? 0.6 : 1.0;
  const scaled = Math.round(baseSets * globalModifiers.volume_multiplier * deloadMultiplier);
  return Math.max(1, scaled + readinessDelta);
}

/**
 * Evaluates offline autonomous progression after a session finishes.
 * If hold_progression is false and the last `level_up_consecutive_sessions`
 * sessions for a pattern all met target_value with rir >= level_up_min_rir,
 * increments min_target by +1 rep (or +5 seconds for timed holds), capped at max_target.
 */
export function evaluateOfflineProgression(
  config: ProgramConfig,
  allLogs: WorkoutLogEntry[],
): { updatedConfig: ProgramConfig; progressedPatterns: MovementPattern[] } {
  const progressedPatterns: MovementPattern[] = [];
  const nextTracks = { ...config.movement_tracks };

  for (const pattern of Object.keys(nextTracks) as MovementPattern[]) {
    const track = nextTracks[pattern];
    if (!track || track.auto_rules.hold_progression) continue;

    const patternLogs = allLogs.filter(
      (log) => log.pattern === pattern && log.exercise_slug === track.active_slug,
    );
    if (patternLogs.length === 0) continue;

    // Group logs by session_id in chronological order
    const sessionOrder: string[] = [];
    const bySession = new Map<string, WorkoutLogEntry[]>();
    for (const log of patternLogs) {
      if (!bySession.has(log.session_id)) {
        sessionOrder.push(log.session_id);
        bySession.set(log.session_id, []);
      }
      bySession.get(log.session_id)!.push(log);
    }

    const requiredSessions = track.auto_rules.level_up_consecutive_sessions;
    if (sessionOrder.length < requiredSessions) continue;

    const recentSessionIds = sessionOrder.slice(-requiredSessions);
    const allMet = recentSessionIds.every((sid) => {
      const sets = bySession.get(sid) ?? [];
      return (
        sets.length > 0 &&
        sets.every(
          (s) => s.completed_value >= s.target_value && s.rir >= track.auto_rules.level_up_min_rir,
        )
      );
    });

    if (allMet && track.prescription.min_target < track.prescription.max_target) {
      const step = track.prescription.unit === 'seconds' ? 5 : 1;
      const nextTarget = Math.min(track.prescription.max_target, track.prescription.min_target + step);
      if (nextTarget > track.prescription.min_target) {
        nextTracks[pattern] = {
          ...track,
          prescription: {
            ...track.prescription,
            min_target: nextTarget,
          },
        };
        progressedPatterns.push(pattern);
      }
    }
  }

  return {
    updatedConfig: {
      ...config,
      movement_tracks: nextTracks,
    },
    progressedPatterns,
  };
}
