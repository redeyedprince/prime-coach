import { ALLOWLIST_BY_SLUG, getLadderForPattern, getTierRepresentative, resolveSafeExercise } from '../data/exerciseCatalog';
import type { MovementPattern, ProgramConfig, UserProfile } from '../types/schemas';
import {
  BODY_FOCUS_PROFILES,
  generateRecommendedWeeklyPlan,
  GOAL_RESEARCH_PROFILES,
} from './planBuilder';

export interface CalibrationResult {
  pattern: MovementPattern;
  slug: string;
  completed_value: number;
}

export function buildDefaultProgramConfigFromProfile(profile: UserProfile): ProgramConfig {
  const patterns: MovementPattern[] = ['push', 'pull', 'legs', 'core'];
  const defaultResults: CalibrationResult[] = patterns.map((pattern) => {
    const tier =
      pattern === 'push' || pattern === 'pull'
        ? profile.upper_starting_tier ?? profile.starting_tier
        : profile.lower_starting_tier ?? profile.starting_tier;
    const rep = getTierRepresentative(pattern, tier);
    const safe = resolveSafeExercise(
      rep.slug,
      profile.quiet_hotel_mode,
      profile.joint_restrictions,
      profile.available_equipment ?? [],
      false,
      profile.body_focus ?? 'balanced',
    );
    return {
      pattern,
      slug: safe.slug,
      completed_value: safe.unit === 'seconds' ? 25 : 10,
    };
  });
  return buildCalibratedProgramConfig(profile, defaultResults);
}

export function buildCalibratedProgramConfig(
  profile: UserProfile,
  results: CalibrationResult[],
): ProgramConfig {
  const today = new Date().toISOString().slice(0, 10);
  const tempoByGoal: Record<UserProfile['primary_goal'], string> = {
    hypertrophy: '3-1-1-0',
    strength: '2-1-1-0',
    conditioning: '2-0-1-0',
    skill: '3-2-1-0',
  };
  const research = GOAL_RESEARCH_PROFILES[profile.primary_goal];
  const restSeconds =
    profile.biological_sex === 'female' ? research.femaleRestSeconds : research.restSeconds;
  const bodyFocus = profile.body_focus ?? 'balanced';
  const tracks = {} as ProgramConfig['movement_tracks'];

  for (const res of results) {
    const ladder = getLadderForPattern(
      res.pattern,
      profile.available_equipment ?? [],
      profile.active_location === 'gym',
    ).filter((ex) => !profile.quiet_hotel_mode || ex.impact_level === 'low');

    const ladderSlugs = ladder.map((ex) => ex.slug);
    const testedEx = resolveSafeExercise(
      res.slug,
      profile.quiet_hotel_mode,
      profile.joint_restrictions,
      profile.available_equipment ?? [],
      false,
      bodyFocus,
    );

    let selectedEx = testedEx;
    const currentIdx = ladder.findIndex((ex) => ex.slug === testedEx.slug);
    if (
      currentIdx >= 0 &&
      currentIdx < ladder.length - 1 &&
      ((testedEx.unit === 'reps' && res.completed_value >= 16) ||
        (testedEx.unit === 'seconds' && res.completed_value >= 45))
    ) {
      selectedEx = resolveSafeExercise(
        ladder[currentIdx + 1].slug,
        profile.quiet_hotel_mode,
        profile.joint_restrictions,
        profile.available_equipment ?? [],
        false,
        bodyFocus,
      );
    }

    const goalReps =
      profile.biological_sex === 'female' ? research.femaleRepRange : research.repRange;

    const baseMin =
      selectedEx.unit === 'seconds'
        ? Math.max(15, Math.min(45, Math.round(res.completed_value * 0.85)))
        : Math.max(goalReps[0], Math.min(goalReps[1], res.completed_value));

    const baseMax =
      selectedEx.unit === 'seconds'
        ? Math.max(baseMin + 15, 60)
        : Math.max(baseMin + 4, goalReps[1]);

    tracks[res.pattern] = {
      active_slug: ALLOWLIST_BY_SLUG[selectedEx.slug]?.slug ?? selectedEx.slug,
      bw_load_factor: selectedEx.bw_load_factor,
      progression_ladder: ladderSlugs.length > 0 ? ladderSlugs : [selectedEx.slug],
      prescription: {
        sets: profile.session_duration_minutes <= 15 ? 2 : 3,
        min_target: baseMin,
        max_target: baseMax,
        unit: selectedEx.unit,
        target_rir_range: research.targetRirRange,
        rest_seconds: restSeconds,
        tempo: tempoByGoal[profile.primary_goal],
      },
      auto_rules: {
        level_up_consecutive_sessions: 2,
        level_up_min_rir: 2,
        min_conditioning_weeks: 3,
        hold_progression: false,
      },
    };
  }

  return {
    meta: {
      version: 1,
      updated_at: today,
      active_phase: `${bodyFocus}_${profile.primary_goal}`,
      coach_summary: `Calibrated for ${profile.user_name} (${BODY_FOCUS_PROFILES[bodyFocus].shortLabel}). ${research.citation}.`,
    },
    global_modifiers: {
      deload_active: false,
      volume_multiplier: 1.0,
      rest_adjustment_seconds: 0,
      quiet_hotel_mode: profile.quiet_hotel_mode,
      restricted_tags: profile.joint_restrictions.filter((j) => j !== 'none'),
    },
    weekly_split: generateRecommendedWeeklyPlan(
      profile.primary_goal,
      profile.days_per_week,
      profile.session_duration_minutes,
      bodyFocus,
    ),
    movement_tracks: tracks,
  };
}
