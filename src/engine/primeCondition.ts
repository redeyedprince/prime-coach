import type { SessionBlock } from '../data/exerciseCatalog';
import type {
  BiologicalSex,
  PrimeAssessmentInput,
  PrimePillarKey,
  PrimePillarScores,
  SleepQuality,
  UserProfile,
} from '../types/schemas';

export interface DailyFuelTargets {
  hasWeight: boolean;
  weightKgUsed: number | null;
  proteinMinGrams: number | null;
  proteinMaxGrams: number | null;
  waterBaseLiters: number | null;
  waterWorkoutLiters: number | null;
  sleepRange: string;
  stepsRange: string;
  proteinMealTip: string | null;
  citation: string;
}

/**
 * Computes simple, research-backed daily recovery fuel guidelines from user weight:
 * - Never fabricates guessed protein/water numbers when bodyweight_kg is missing.
 * - Protein: 1.6-2.0 g/kg/day (Morton et al., 2018 BJSM; Jäger et al., 2017 JISSN)
 * - Water: ~35 ml/kg/day + 0.4L workout sweat buffer (NASEM/EFSA & ACSM)
 * - Sleep: 7-9 hours (Watson et al., 2015 AASM/SRS Consensus; Dattilo et al., 2011)
 * - Daily Movement (NEAT): 7,500-10,000 steps/day (Paluch et al., 2022 The Lancet Public Health)
 */
export function computeDailyFuelTargets(profile: UserProfile): DailyFuelTargets {
  const hasWeight = typeof profile.bodyweight_kg === 'number' && profile.bodyweight_kg >= 30;
  const citation =
    'Morton et al. (2018, BJSM), Jäger et al. (2017, JISSN), Watson et al. (2015, AASM/SRS), Paluch et al. (2022, Lancet Public Health), & ACSM Fluid Guidelines.';

  if (!hasWeight) {
    return {
      hasWeight: false,
      weightKgUsed: null,
      proteinMinGrams: null,
      proteinMaxGrams: null,
      waterBaseLiters: null,
      waterWorkoutLiters: null,
      sleepRange: '7–9 hrs',
      stepsRange: '7,500–10,000',
      proteinMealTip: null,
      citation,
    };
  }

  const weightKg = profile.bodyweight_kg!;
  const isFemale = profile.biological_sex === 'female';
  // Lean-mass-adjusted relative protein ranges (Female 1.5–1.8 g/kg vs Male 1.6–2.0 g/kg)
  const proteinMinGrams = Math.round(weightKg * (isFemale ? 1.5 : 1.6));
  const proteinMaxGrams = Math.round(weightKg * (isFemale ? 1.8 : 2.0));
  const perMeal = Math.round(proteinMinGrams / 3);
  const waterBaseLiters = Number(((weightKg * 35) / 1000).toFixed(1));
  const waterWorkoutLiters = Number((waterBaseLiters + 0.4).toFixed(1));

  return {
    hasWeight: true,
    weightKgUsed: weightKg,
    proteinMinGrams,
    proteinMaxGrams,
    waterBaseLiters,
    waterWorkoutLiters,
    sleepRange: '7–9 hrs',
    stepsRange: '7,500–10,000',
    proteinMealTip: `~${perMeal}g per main meal (e.g. eggs, yogurt, chicken, fish, tofu, or lentils)`,
    citation,
  };
}

/**
 * Automatically softens today's working strength volume (~25% fewer sets)
 * when the user checks in as "Slept poorly / tired", preventing burnout
 * and injury while preserving form practice and mobility.
 */
export function applyReadinessScaling(
  blocks: SessionBlock[],
  sleepQuality: SleepQuality,
): SessionBlock[] {
  if (sleepQuality !== 'poor') return blocks;
  return blocks.map((b) => {
    if (b.role === 'primary' || b.role === 'accessory' || b.role === 'finisher') {
      const reducedSets = b.sets >= 3 ? b.sets - 1 : b.sets;
      return {
        ...b,
        sets: reducedSets,
        rest_seconds: b.rest_seconds + 15,
      };
    }
    return b;
  });
}

export interface PrimePillarMetadata {
  key: PrimePillarKey;
  label: string;
  shortLabel: string;
  whatItMeasures: string;
  nextStepTip: string;
  citation: string;
}

export const PRIME_PILLAR_META: Record<PrimePillarKey, PrimePillarMetadata> = {
  strength: {
    key: 'strength',
    label: 'Upper & Full-Body Strength',
    shortLabel: 'Strength',
    whatItMeasures: 'Push-up muscular strength & endurance — linked to long-term heart and metabolic vitality.',
    nextStepTip: 'Stay consistent with your weekly Push/Pull/Legs sessions and level up once reps feel "Just Right."',
    citation: 'Yang et al. (2019, JAMA Network Open) & ACSM Fitness Norms.',
  },
  mobility: {
    key: 'mobility',
    label: 'Joint Mobility & Freedom',
    shortLabel: 'Mobility',
    whatItMeasures: 'Flat-foot deep squat & overhead reach — tracks hip, ankle, and upper-back freedom.',
    nextStepTip: 'Run the 4-Min Mobility & Desk Reset flow on Today after workouts or after long sitting.',
    citation: 'Behm et al. (2016, APNM) & Page (2012, IJSPT).',
  },
  balance: {
    key: 'balance',
    label: 'Balance & Foot Stability',
    shortLabel: 'Balance',
    whatItMeasures: 'Single-leg stability — a strong clinical marker of neuromuscular coordination and healthy aging.',
    nextStepTip: 'Do the 3-Min Balance & Athletic Pop flow on Today 3× this week (barefoot if possible).',
    citation: 'Araujo et al. (2022, BJSM) & Springer et al. (2007, JGPT).',
  },
  heart: {
    key: 'heart',
    label: 'Heart & Stamina Recovery',
    shortLabel: 'Heart',
    whatItMeasures: 'How fast your breathing & heart calm down after 3 minutes of brisk movement.',
    nextStepTip: 'Open Heart & Stamina on Today for 20-min easy Zone-2 walks + one 8-min VO2 Max session weekly.',
    citation: 'Mandsager et al. (2018, JAMA Network Open) & Helgerud et al. (2007, MSSE).',
  },
  breath: {
    key: 'breath',
    label: 'Breath & Calm Efficiency',
    shortLabel: 'Breath',
    whatItMeasures: 'Comfortable nasal breath-hold (BOLT score) — reflects oxygen efficiency and calm stress control.',
    nextStepTip: 'Use the 2-Min Breathwork Pacer (Physiological Sigh or Box Breathing) after workouts or before bed.',
    citation: 'Balban et al. (2023, Cell Reports Medicine) & Courtney & Cohen (2008).',
  },
  core: {
    key: 'core',
    label: 'Core & Spine Resilience',
    shortLabel: 'Core',
    whatItMeasures: 'Clean forearm plank endurance — measures spine-protecting trunk stability.',
    nextStepTip: 'Focus on hollow-body bracing during Core blocks and turn ON Tendon Armor for stronger joints.',
    citation: 'McGill (2010, Strength & Conditioning Journal) Core Endurance Norms.',
  },
};

function clampScore(v: number): number {
  return Math.max(10, Math.min(100, Math.round(v)));
}

/**
 * Scores the 6-Pillar Prime Condition check-up on a clear 0–100 scale
 * calibrated to sex-specific & peer-reviewed functional longevity norms.
 */
export function scorePrimeAssessment(
  input: PrimeAssessmentInput,
  sex: BiologicalSex,
): {
  pillar_scores: PrimePillarScores;
  overall_score: number;
  strongest_pillar: PrimePillarKey;
  weakest_pillar: PrimePillarKey;
} {
  // 1. Strength (Yang et al., 2019 JAMA: 40+ push-ups top bracket for men; ACSM norms for women/knee variant)
  const effectivePushups =
    input.pushup_variant === 'knee' ? input.pushups_max * 0.65 : input.pushups_max;
  const pushupTargetFor100 = sex === 'female' ? 24 : 40;
  const strength = clampScore((effectivePushups / pushupTargetFor100) * 100);

  // 2. Core (McGill Core Endurance Norms: 120s clean plank = 100)
  const core = clampScore((input.plank_seconds / 120) * 100);

  // 3. Balance (Araujo et al., 2022 BJSM >=10s minimum longevity threshold; Springer et al., 2007: 30s eyes closed or 45s eyes open = 100)
  const balanceTarget = input.balance_eyes_closed ? 30 : 45;
  const balance = clampScore((input.balance_seconds / balanceTarget) * 100);

  // 4. Mobility (1-5 plain-English deep squat + overhead reach check)
  const mobility = clampScore(input.mobility_rating * 20);

  // 5. Heart recovery (1-5 plain-English 3-min brisk march breath recovery check)
  const heart = clampScore(input.heart_recovery_rating * 20);

  // 6. Breath efficiency (BOLT score: 40s comfortable nasal hold = 100, 20s = 50)
  const breath = clampScore((input.bolt_seconds / 40) * 100);

  const pillar_scores: PrimePillarScores = {
    strength,
    mobility,
    balance,
    heart,
    breath,
    core,
  };

  const keys: PrimePillarKey[] = ['strength', 'mobility', 'balance', 'heart', 'breath', 'core'];
  const overall_score = Math.round(
    keys.reduce((acc, k) => acc + pillar_scores[k], 0) / keys.length,
  );

  let strongest_pillar: PrimePillarKey = keys[0];
  let weakest_pillar: PrimePillarKey = keys[0];
  for (const k of keys) {
    if (pillar_scores[k] > pillar_scores[strongest_pillar]) strongest_pillar = k;
    if (pillar_scores[k] < pillar_scores[weakest_pillar]) weakest_pillar = k;
  }

  return {
    pillar_scores,
    overall_score,
    strongest_pillar,
    weakest_pillar,
  };
}
