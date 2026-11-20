import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { COACH_ARTICLES, TERM_GLOSSARY } from '../data/coachArticles';
import {
  buildBalancePowerFlowBlocks,
  buildMobilityFlowBlocks,
  buildRestDayCardioMobilityBlocks,
  buildSessionBlocksForDay,
  FLOOR_EXERCISE_ALLOWLIST,
  formatReadableTempo,
  getHouseholdToolTip,
  isUnilateralExercise,
  resolveSafeExercise,
} from '../data/exerciseCatalog';
import { getLocalExerciseFrames } from '../data/svgAssets';
import {
  computeBodyMetricInsights,
  getTapeZoneGuide,
  isMonthlyWeightReminderDue,
  serializeBodyMetricsToCsv,
} from '../engine/bodyMetrics';
import { compareVersionStrings } from '../drive/driveSync';
import {
  buildCalibratedProgramConfig,
  buildDefaultProgramConfigFromProfile,
} from '../engine/calibration';
import {
  buildGeminiAssessmentPrompt,
  buildGeminiCoachPrompt,
  buildPrimeCoachContextMarkdown,
  getEligibleSlugsByPattern,
  parseCoachJsonInput,
} from '../engine/coachPrompt';
import { serializeWorkoutLogsToCsv } from '../engine/csvExport';
import {
  applyRecommendedPlanToConfig,
  generateRecommendedWeeklyPlan,
  getGoalsForSex,
} from '../engine/planBuilder';
import {
  applyReadinessScaling,
  computeDailyFuelTargets,
  scorePrimeAssessment,
} from '../engine/primeCondition';
import { computeWorkingSets, evaluateOfflineProgression } from '../engine/progression';
import { resolveRecoverySafePatterns } from '../engine/recoveryGuard';
import { extractReadableGeminiSummary } from '../services/geminiApi';
import { ProgramConfigSchema, type UserProfile, type WorkoutLogEntry } from '../types/schemas';

const baseProfile: UserProfile = {
  user_name: 'Sarah',
  biological_sex: 'female',
  age_bracket: '18_29',
  posture_focus: 'none',
  body_focus: 'glute_sculpt',
  training_mode: 'curated',
  preferred_workout_time: '18:00',
  active_location: 'home_calisthenics',
  primary_goal: 'hypertrophy',
  days_per_week: 4,
  session_duration_minutes: 25,
  pacing_mode: 'strict_time_cap',
  cue_style: 'audio_and_vibrate',
  zero_equipment_only: true,
  quiet_hotel_mode: false,
  joint_restrictions: ['none'],
  available_equipment: [],
  dumbbell_kg: null,
  starting_tier: 'intermediate',
  upper_starting_tier: 'intermediate',
  lower_starting_tier: 'intermediate',
  bodyweight_kg: 60,
  height_cm: 166,
  include_cardio_finisher: false,
  include_tendon_prep: false,
  kegel_level: 'foundation',
  kegel_reminder_enabled: true,
  kegel_reminder_times: ['10:30', '15:00', '20:30'],
  tour_completed: true,
  calibrated: true,
  onboarding_version: 2,
  updated_at: '2026-11-18',
};

describe('Exercise Catalog & Manifest Verification', () => {
  it('imports all 302 manifest exercises plus 16 custom vector exercises (318 total) with 3 frames each', () => {
    const manifestPath = path.resolve(
      process.cwd(),
      'node_modules/@bryllim/workout-guide/manifest.json',
    );
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as Array<{
      slug: string;
      equipment: string;
      frames: unknown[];
    }>;
    const bySlug = new Map(manifest.map((m) => [m.slug, m]));

    expect(FLOOR_EXERCISE_ALLOWLIST.length).toBe(318);
    expect(FLOOR_EXERCISE_ALLOWLIST.length).toBe(manifest.length + 16);

    for (const ex of FLOOR_EXERCISE_ALLOWLIST) {
      const localFrames = getLocalExerciseFrames(ex.slug);
      expect(localFrames[0], `Missing frame-1 URL for ${ex.slug}`).toBeTruthy();
      expect(localFrames[1], `Missing frame-2 URL for ${ex.slug}`).toBeTruthy();
      expect(localFrames[2], `Missing frame-3 URL for ${ex.slug}`).toBeTruthy();

      const item = bySlug.get(ex.slug);
      if (item) {
        if (!ex.required_equipment) {
          expect(['Bodyweight', 'Cardio']).toContain(item.equipment);
        } else if (ex.required_equipment === 'dumbbell') {
          expect(item.equipment).toBe('Dumbbell');
        } else if (ex.required_equipment === 'pull_up_bar') {
          expect(['Bodyweight', 'Pull-up Bar']).toContain(item.equipment);
        }
        expect(item.frames.length).toBe(3);
      } else {
        for (const frameNum of [1, 2, 3]) {
          const svgPath = path.resolve(
            process.cwd(),
            `src/assets/custom-exercises/${ex.slug}/frame-${frameNum}.svg`,
          );
          expect(fs.existsSync(svgPath), `Missing custom SVG: ${svgPath}`).toBe(true);
        }
      }
    }
  });

  it('never duplicates an exercise slug within a single session and supports cardio finishers', () => {
    const cfg = buildDefaultProgramConfigFromProfile(baseProfile);
    const scenarios: Array<{ patterns: ['push', 'pull'] | ['legs', 'core']; profile: UserProfile }> = [
      {
        patterns: ['push', 'pull'],
        profile: {
          ...baseProfile,
          body_focus: 'chest_lift_posture',
          posture_focus: 'rounded_shoulders',
          training_mode: 'free',
          active_location: 'gym',
        },
      },
      {
        patterns: ['legs', 'core'],
        profile: { ...baseProfile, body_focus: 'glute_sculpt', include_cardio_finisher: true },
      },
      {
        patterns: ['legs', 'core'],
        profile: { ...baseProfile, body_focus: 'pelvic_sexual_health' },
      },
      {
        patterns: ['push', 'pull'],
        profile: {
          ...baseProfile,
          biological_sex: 'male',
          body_focus: 'v_taper',
          training_mode: 'free',
          active_location: 'gym',
          include_cardio_finisher: true,
        },
      },
    ];

    for (const s of scenarios) {
      for (let seed = 0; seed < 4; seed += 1) {
        const blocks = buildSessionBlocksForDay(s.patterns, cfg, s.profile, {}, seed);
        const slugs = blocks.map((b) => b.exercise.slug);
        expect(new Set(slugs).size, `Duplicate in ${s.profile.body_focus} seed=${seed}: ${slugs.join(',')}`).toBe(
          slugs.length,
        );
        if (s.profile.include_cardio_finisher || s.profile.body_focus === 'pelvic_sexual_health') {
          expect(blocks.some((b) => b.role === 'cardio')).toBe(true);
        }
      }
    }

    const restBlocks = buildRestDayCardioMobilityBlocks(baseProfile, 0);
    expect(restBlocks.length).toBe(3);
    expect(restBlocks.some((b) => b.role === 'cardio')).toBe(true);

    const tendonBlocks = buildSessionBlocksForDay(
      ['legs', 'core'],
      cfg,
      { ...baseProfile, include_tendon_prep: true },
      {},
      0,
    );
    expect(tendonBlocks.some((b) => b.role === 'tendon')).toBe(true);
    expect(COACH_ARTICLES.length).toBe(10);
    expect(TERM_GLOSSARY.tendon_armor.plainExplanation).toContain('tendons');
    expect(TERM_GLOSSARY.zone2_cardio.plainExplanation).toContain('sentences');
    expect(TERM_GLOSSARY.vo2_max.plainExplanation).toContain('oxygen');
    expect(TERM_GLOSSARY.physiological_sigh.plainExplanation).toContain('exhale');
    expect(TERM_GLOSSARY.bolt_score.plainExplanation).toContain('urge');
    expect(TERM_GLOSSARY.prime_score.plainExplanation).toContain('Strength');
  });

  it('builds Prime Condition Mobility/Balance flows, fuel targets, tired-day scaling, and 6-pillar scores', () => {
    const cfg = buildDefaultProgramConfigFromProfile(baseProfile);

    const mobBlocks = buildMobilityFlowBlocks(baseProfile, 0);
    expect(mobBlocks.length).toBe(4);
    expect(mobBlocks.map((b) => b.exercise.slug)).toContain('neck-thoracic-reset');
    expect(mobBlocks.map((b) => b.exercise.slug)).toContain('foot-arch-toe-spread');

    const quietBalBlocks = buildBalancePowerFlowBlocks(
      { ...baseProfile, quiet_hotel_mode: true },
      0,
    );
    expect(quietBalBlocks.length).toBe(3);
    expect(quietBalBlocks.map((b) => b.exercise.slug)).toContain('single-leg-balance-hold');
    expect(quietBalBlocks.every((b) => b.exercise.impact_level === 'low')).toBe(true);

    // Fuel targets for 60 kg female vs 60 kg male vs missing weight (never guesses!)
    const fuel = computeDailyFuelTargets(baseProfile);
    expect(fuel.hasWeight).toBe(true);
    expect(fuel.proteinMinGrams).toBe(90); // 60 * 1.5
    expect(fuel.proteinMaxGrams).toBe(108); // 60 * 1.8
    expect(fuel.waterBaseLiters).toBe(2.1);
    expect(fuel.waterWorkoutLiters).toBe(2.5);

    const maleFuel = computeDailyFuelTargets({ ...baseProfile, biological_sex: 'male' });
    expect(maleFuel.proteinMinGrams).toBe(96); // 60 * 1.6
    expect(maleFuel.proteinMaxGrams).toBe(120); // 60 * 2.0

    // Sex-specific tape guides (female bust & natural waist vs male chest & navel waist)
    expect(getTapeZoneGuide('chest', 'female').label).toBe('Bust / Chest (cm)');
    expect(getTapeZoneGuide('chest', 'female').howToMeasure).toContain('unpadded bra');
    expect(getTapeZoneGuide('waist', 'female').howToMeasure).toContain('narrowest');
    expect(getTapeZoneGuide('waist', 'male').howToMeasure).toContain('navel');

    // GitHub release version comparator
    expect(compareVersionStrings('v2.4', '2.3')).toBeGreaterThan(0);
    expect(compareVersionStrings('v2.3', '2.3')).toBe(0);
    expect(compareVersionStrings('2.2', '2.3')).toBeLessThan(0);

    const noWeightFuel = computeDailyFuelTargets({ ...baseProfile, bodyweight_kg: null });
    expect(noWeightFuel.hasWeight).toBe(false);
    expect(noWeightFuel.proteinMinGrams).toBeNull();
    expect(noWeightFuel.waterBaseLiters).toBeNull();

    // Dynamic PRIME_COACH_CONTEXT.md & Gemini Coach Prompt verification
    const eligible = getEligibleSlugsByPattern(baseProfile);
    const catalogSet = new Set(FLOOR_EXERCISE_ALLOWLIST.map((e) => e.slug));
    for (const list of Object.values(eligible)) {
      expect(list.length).toBeGreaterThan(0);
      for (const slug of list) {
        expect(catalogSet.has(slug), `Unknown slug in context: ${slug}`).toBe(true);
      }
    }
    const ctxMd = buildPrimeCoachContextMarkdown(baseProfile, null);
    expect(ctxMd).toContain('Prime — AI Coach Context');

    const oauthPrompt = buildGeminiCoachPrompt({
      profile: baseProfile,
      config: cfg,
      logs: [],
      meta: {
        id: 'singleton',
        coachContextFileId: 'ctx123',
        userProfileFileId: 'prof123',
        programConfigFileId: 'cfg123',
        workoutLogFileId: 'csv123',
      },
      userNote: 'Left shoulder feels tight on push-ups',
    });
    expect(oauthPrompt).toContain('https://drive.google.com/file/d/ctx123/view');
    expect(oauthPrompt).toContain('PRIME_COACH_CONTEXT.md');
    expect(oauthPrompt).toContain('Left shoulder feels tight on push-ups');

    // Way 2 In-App API must ALWAYS inline full context even when Drive IDs exist
    const inlineApiPrompt = buildGeminiCoachPrompt({
      profile: baseProfile,
      config: cfg,
      logs: [],
      meta: {
        id: 'singleton',
        coachContextFileId: 'ctx123',
        userProfileFileId: 'prof123',
        programConfigFileId: 'cfg123',
        workoutLogFileId: 'csv123',
      },
      userNote: 'Make legs harder',
      forceInlineContext: true,
    });
    expect(inlineApiPrompt).not.toContain('https://drive.google.com/file/d/ctx123/view');
    expect(inlineApiPrompt).toContain('Prime — AI Coach Context');
    expect(inlineApiPrompt).toContain('"movement_tracks"');
    expect(inlineApiPrompt).toContain('Make legs harder');

    const wrappedReply = `Here is your updated plan!\n\n\`\`\`json\n${JSON.stringify(cfg, null, 2)}\n\`\`\`\nGood luck!`;
    const parsedFromProse = parseCoachJsonInput(wrappedReply);
    expect(parsedFromProse.meta.version).toBe(cfg.meta.version);
    expect(extractReadableGeminiSummary(wrappedReply)).toContain('Here is your updated plan!');
    expect(extractReadableGeminiSummary(wrappedReply)).not.toContain('"movement_tracks"');

    // Bare un-fenced plaintext JSON embedded in Gemini prose (even with stray braces)
    const unfencedReply = `Great progress {kept consistent}!\n\n${JSON.stringify(cfg)}\n\nKeep drinking water!`;
    const parsedFromUnfenced = parseCoachJsonInput(unfencedReply);
    expect(parsedFromUnfenced.meta.version).toBe(cfg.meta.version);
    const cleanUnfencedSummary = extractReadableGeminiSummary(unfencedReply);
    expect(cleanUnfencedSummary).toContain('Great progress');
    expect(cleanUnfencedSummary).toContain('Keep drinking water!');
    expect(cleanUnfencedSummary).not.toContain('"movement_tracks"');

    // Monthly weight reminder (30-day trigger + 7-day snooze)
    expect(
      isMonthlyWeightReminderDue(
        { ...baseProfile, last_weight_updated_at: '2026-11-05' },
        '2026-11-20',
      ).due,
    ).toBe(false);
    expect(
      isMonthlyWeightReminderDue(
        { ...baseProfile, last_weight_updated_at: '2026-10-15' },
        '2026-11-20',
      ).due,
    ).toBe(true);
    expect(
      isMonthlyWeightReminderDue(
        {
          ...baseProfile,
          last_weight_updated_at: '2026-10-15',
          weight_reminder_snoozed_until: '2026-11-27',
        },
        '2026-11-20',
      ).due,
    ).toBe(false);

    // Metric Body Insights (WHtR, Navy BF%, Day-1 deltas, L/R symmetry)
    const bodyHistory = [
      {
        date: '2026-10-20',
        created_at: '2026-10-20T08:00:00Z',
        weight_kg: 62,
        neck_cm: 33,
        waist_cm: 76,
        hips_cm: 96,
        arm_left_cm: 27,
        arm_right_cm: 29,
      },
      {
        date: '2026-11-20',
        created_at: '2026-11-20T08:00:00Z',
        weight_kg: 60.5,
        neck_cm: 33,
        waist_cm: 72,
        hips_cm: 97,
        arm_left_cm: 27.5,
        arm_right_cm: 29.5,
      },
    ];
    const insights = computeBodyMetricInsights(bodyHistory, baseProfile);
    expect(insights.weightDeltaKg).toBe(-1.5);
    expect(insights.waistDeltaCm).toBe(-4);
    expect(insights.whtr).toBeCloseTo(0.43, 2);
    expect(insights.navyBodyFatPct).not.toBeNull();
    expect(insights.symmetryNotes.some((n) => n.includes('Left arm'))).toBe(true);

    const bodyCsv = serializeBodyMetricsToCsv(bodyHistory);
    expect(bodyCsv).toContain('weight_kg,neck_cm');
    expect(bodyCsv).toContain('60.5,33');

    const assessPrompt = buildGeminiAssessmentPrompt({
      profile: baseProfile,
      logs: [],
      bodyMetrics: bodyHistory,
      meta: { id: 'singleton' },
      userNote: 'Check my waist drop and arm balance',
    });
    expect(assessPrompt).toContain('Monthly Fitness Assessment');
    expect(assessPrompt).toContain('Waist:72cm');
    expect(assessPrompt).toContain('Check my waist drop and arm balance');

    // Tired-day readiness scaling reduces 3+ set strength blocks by 1 set
    const normalBlocks = buildSessionBlocksForDay(['legs', 'core'], cfg, baseProfile, {}, 0);
    const tiredBlocks = applyReadinessScaling(normalBlocks, 'poor');
    const normalPrimary = normalBlocks.find((b) => b.role === 'primary')!;
    const tiredPrimary = tiredBlocks.find((b) => b.role === 'primary')!;
    if (normalPrimary.sets >= 3) {
      expect(tiredPrimary.sets).toBe(normalPrimary.sets - 1);
    }
    expect(tiredPrimary.rest_seconds).toBe(normalPrimary.rest_seconds + 15);

    // 6-Pillar Prime Assessment scoring
    const scored = scorePrimeAssessment(
      {
        pushups_max: 20,
        pushup_variant: 'full',
        plank_seconds: 90,
        balance_seconds: 12,
        balance_eyes_closed: false,
        mobility_rating: 4,
        heart_recovery_rating: 4,
        bolt_seconds: 30,
      },
      'female',
    );
    expect(scored.pillar_scores.strength).toBeGreaterThanOrEqual(80);
    expect(scored.weakest_pillar).toBe('balance');
    expect(scored.overall_score).toBeGreaterThan(50);
    expect(scored.overall_score).toBeLessThanOrEqual(100);
  });

  it('rotates exercise variations across days and shuffle seeds', () => {
    const cfg = buildDefaultProgramConfigFromProfile(baseProfile);
    const day0 = buildSessionBlocksForDay(['legs', 'core'], cfg, baseProfile, {}, 0);
    const day1 = buildSessionBlocksForDay(['legs', 'core'], cfg, baseProfile, {}, 1);
    const day2 = buildSessionBlocksForDay(['legs', 'core'], cfg, baseProfile, {}, 2);

    const slugs0 = day0.map((b) => b.exercise.slug).join(',');
    const slugs1 = day1.map((b) => b.exercise.slug).join(',');
    const slugs2 = day2.map((b) => b.exercise.slug).join(',');

    expect(slugs0).not.toBe(slugs1);
    expect(slugs1).not.toBe(slugs2);
  });

  it('unlocks dumbbell and pull-up bar exercises only when equipment is available', () => {
    const floorPush = resolveSafeExercise('push-up', false, ['none'], []);
    expect(floorPush.slug).toBe('push-up');

    const dbPush = resolveSafeExercise('push-up', false, ['none'], ['dumbbell']);
    expect(dbPush.required_equipment).toBe('dumbbell');

    const barPull = resolveSafeExercise('superman', false, ['none'], ['pull_up_bar']);
    expect(barPull.required_equipment).toBe('pull_up_bar');

    expect(getHouseholdToolTip(dbPush, 5)).toContain('water gallon');
    expect(getHouseholdToolTip(dbPush, 10)).toContain('backpack');
    expect(formatReadableTempo('3-1-1-0')).toBe('3s down · 1s hold · 1s up');

    const lungeEx = FLOOR_EXERCISE_ALLOWLIST.find((e) => e.slug === 'curtsy-lunge')!;
    expect(isUnilateralExercise(lungeEx)).toBe(true);
  });

  it('quiet_hotel_mode substitutes explosive exercises with low-impact alternatives', () => {
    const pushSub = resolveSafeExercise('explosive-push-up', true, ['none']);
    expect(pushSub.impact_level).toBe('low');
    expect(pushSub.slug).toBe('archer-push-up');

    const legSub = resolveSafeExercise('jump-squat', true, ['none']);
    expect(legSub.impact_level).toBe('low');
    expect(legSub.slug).toBe('cossack-squat');
  });
});

describe('Research-Guaranteed Plan Builder & Sex Physiology Calibration', () => {
  it('Strength 4d/wk schedule never places identical patterns on consecutive days', () => {
    const split = generateRecommendedWeeklyPlan('strength', 4, 25, 'balanced');
    expect(split).toHaveLength(7);
    for (let i = 0; i < split.length - 1; i++) {
      const today = split[i].focus.filter((f) => f !== 'rest');
      const tomorrow = split[i + 1].focus.filter((f) => f !== 'rest');
      const overlap = today.filter((p) => tomorrow.includes(p));
      expect(overlap).toEqual([]);
    }
  });

  it('Hypertrophy 4d/wk trains every pattern at least 2x/week', () => {
    const split = generateRecommendedWeeklyPlan('hypertrophy', 4, 25, 'balanced');
    const counts: Record<string, number> = { push: 0, pull: 0, legs: 0, core: 0 };
    for (const day of split) {
      for (const p of day.focus) {
        if (p in counts) counts[p] += 1;
      }
    }
    expect(counts.push).toBe(2);
    expect(counts.pull).toBe(2);
    expect(counts.legs).toBe(2);
    expect(counts.core).toBe(2);
  });

  it('calibrates shorter intra-session rest for female hypertrophy/glute sculpt (Hunter/Ansdell)', () => {
    const baseCfg = buildCalibratedProgramConfig(baseProfile, [
      { pattern: 'push', slug: 'push-up', completed_value: 10 },
      { pattern: 'pull', slug: 'superman', completed_value: 12 },
      { pattern: 'legs', slug: 'glute-bridge', completed_value: 15 },
      { pattern: 'core', slug: 'dead-bug', completed_value: 12 },
    ]);
    const femaleCfg = applyRecommendedPlanToConfig(baseCfg, 'hypertrophy', 4, 25, 'female', 'glute_sculpt');
    const maleCfg = applyRecommendedPlanToConfig(baseCfg, 'hypertrophy', 4, 25, 'male', 'balanced');

    expect(femaleCfg.movement_tracks.legs?.prescription.rest_seconds).toBe(60);
    expect(maleCfg.movement_tracks.legs?.prescription.rest_seconds).toBe(90);
  });

  it('filters goals strictly by biological sex and generates valid skip-calibration defaults', () => {
    const maleGoalIds = getGoalsForSex('male').map((g) => g.id);
    expect(maleGoalIds).not.toContain('chest_lift_posture');
    expect(maleGoalIds).not.toContain('hourglass_sculpt');
    expect(maleGoalIds).not.toContain('glute_sculpt');
    expect(maleGoalIds).toContain('v_taper');
    expect(maleGoalIds).toContain('pelvic_sexual_health');

    const femaleGoalIds = getGoalsForSex('female').map((g) => g.id);
    expect(femaleGoalIds).toContain('glute_sculpt');
    expect(femaleGoalIds).toContain('chest_lift_posture');
    expect(femaleGoalIds).toContain('pelvic_sexual_health');
    expect(femaleGoalIds).not.toContain('v_taper');

    const defaultCfg = buildDefaultProgramConfigFromProfile({
      ...baseProfile,
      calibrated: false,
    });
    expect(ProgramConfigSchema.safeParse(defaultCfg).success).toBe(true);
    expect(defaultCfg.weekly_split).toHaveLength(7);

    const fiveDay = generateRecommendedWeeklyPlan('hypertrophy', 5, 25, 'balanced');
    expect(fiveDay[2].focus).toEqual(['rest']); // Wed rest
    expect(fiveDay[6].focus).toEqual(['rest']); // Sun rest
  });
});

describe('72-Hour Muscle Recovery Guard & Free Mode Gym vs Home', () => {
  it('blocks lower-body prescription 2 days after an intense lower-body workout', () => {
    const intenseLegsLogs: WorkoutLogEntry[] = [1, 2, 3].map((setNum) => ({
      date: '2026-11-16',
      session_id: 's_legs',
      readiness: 'normal',
      bodyweight_kg: 60,
      pattern: 'legs',
      exercise_slug: 'single-leg-glute-bridge',
      set_number: setNum,
      target_value: 12,
      completed_value: 12,
      unit: 'reps',
      rir: 1,
      soreness_tag: 'none',
      notes: '',
    }));

    // 2 days later (2026-11-18): legs MUST NOT be prescribed
    const twoDaysLater = resolveRecoverySafePatterns(
      ['legs', 'core'],
      intenseLegsLogs,
      '2026-11-18',
    );
    expect(twoDaysLater.recoveryMap.legs.status).toBe('recovering');
    expect(twoDaysLater.activePatterns).not.toContain('legs');
    expect(twoDaysLater.rotatedFrom).toContain('legs');
    expect(twoDaysLater.explanation).toBeTruthy();

    // 3 days later (2026-11-19): legs is fresh again
    const threeDaysLater = resolveRecoverySafePatterns(
      ['legs', 'core'],
      intenseLegsLogs,
      '2026-11-19',
    );
    expect(threeDaysLater.recoveryMap.legs.status).toBe('fresh');
    expect(threeDaysLater.activePatterns).toContain('legs');
  });

  it('switches curated session blocks between Home Calisthenics and Gym in Free Mode', () => {
    const cfg = buildCalibratedProgramConfig(baseProfile, [
      { pattern: 'push', slug: 'push-up', completed_value: 10 },
      { pattern: 'pull', slug: 'superman', completed_value: 12 },
      { pattern: 'legs', slug: 'glute-bridge', completed_value: 15 },
      { pattern: 'core', slug: 'dead-bug', completed_value: 12 },
    ]);

    const homeBlocks = buildSessionBlocksForDay(
      ['legs', 'core'],
      cfg,
      { ...baseProfile, training_mode: 'free', active_location: 'home_calisthenics' },
    );
    expect(homeBlocks.some((b) => b.exercise.required_equipment === 'gym')).toBe(false);

    const gymBlocks = buildSessionBlocksForDay(
      ['legs', 'core'],
      cfg,
      { ...baseProfile, training_mode: 'free', active_location: 'gym' },
    );
    expect(gymBlocks.some((b) => b.exercise.slug === 'hip-thrust')).toBe(true);
  });
});

describe('Readiness, Offline Progression & CSV Export', () => {
  it('computes working sets from readiness and deload modifiers', () => {
    const mods = {
      deload_active: false,
      volume_multiplier: 1,
      rest_adjustment_seconds: 0,
      quiet_hotel_mode: false,
      restricted_tags: [],
    };
    expect(computeWorkingSets(3, 'fresh', mods)).toBe(4);
    expect(computeWorkingSets(3, 'normal', mods)).toBe(3);
    expect(computeWorkingSets(3, 'fatigued', mods)).toBe(2);
    expect(computeWorkingSets(1, 'fatigued', mods)).toBe(1);
  });

  it('auto-progresses +1 rep after 2 consecutive sessions meeting target with rir >= 2', () => {
    const config = buildCalibratedProgramConfig(baseProfile, [
      { pattern: 'push', slug: 'push-up', completed_value: 10 },
      { pattern: 'pull', slug: 'superman', completed_value: 12 },
      { pattern: 'legs', slug: 'forward-lunge', completed_value: 10 },
      { pattern: 'core', slug: 'side-plank', completed_value: 30 },
    ]);
    expect(ProgramConfigSchema.safeParse(config).success).toBe(true);

    const logs: WorkoutLogEntry[] = [
      {
        date: '2026-11-16',
        session_id: 's1',
        readiness: 'normal',
        bodyweight_kg: 60,
        pattern: 'push',
        exercise_slug: 'push-up',
        set_number: 1,
        target_value: 10,
        completed_value: 10,
        unit: 'reps',
        rir: 2,
        soreness_tag: 'none',
        notes: '',
      },
      {
        date: '2026-11-18',
        session_id: 's2',
        readiness: 'normal',
        bodyweight_kg: 60,
        pattern: 'push',
        exercise_slug: 'push-up',
        set_number: 1,
        target_value: 10,
        completed_value: 11,
        unit: 'reps',
        rir: 2,
        soreness_tag: 'none',
        notes: '',
      },
    ];

    const { updatedConfig, progressedPatterns } = evaluateOfflineProgression(config, logs);
    expect(progressedPatterns).toContain('push');
    expect(updatedConfig.movement_tracks.push!.prescription.min_target).toBe(11);
  });

  it('produces the exact 13-column header and properly escapes notes', () => {
    const csv = serializeWorkoutLogsToCsv([
      {
        date: '2026-11-18',
        session_id: 'sess_1',
        readiness: 'fresh',
        bodyweight_kg: 60.5,
        pattern: 'push',
        exercise_slug: 'push-up',
        set_number: 1,
        target_value: 10,
        completed_value: 12,
        unit: 'reps',
        rir: 3,
        soreness_tag: 'none',
        notes: 'felt strong, crisp tempo',
      },
    ]);
    const lines = csv.split('\n');
    expect(lines[0]).toBe(
      'date,session_id,readiness,bodyweight_kg,pattern,exercise_slug,set_number,target_value,completed_value,unit,rir,soreness_tag,notes',
    );
    expect(lines[1]).toBe(
      '2026-11-18,sess_1,fresh,60.5,push,push-up,1,10,12,reps,3+,none,"felt strong, crisp tempo"',
    );
  });
});
