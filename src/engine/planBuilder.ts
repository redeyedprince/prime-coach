import type {
  BiologicalSex,
  BodyFocus,
  MovementPattern,
  PostureFocus,
  PrimaryGoal,
  ProgramConfig,
  WeeklySplitDay,
} from '../types/schemas';

export interface GoalResearchProfile {
  goal: PrimaryGoal;
  label: string;
  recommendedDays: number;
  repRange: [number, number];
  femaleRepRange: [number, number];
  restSeconds: number;
  femaleRestSeconds: number;
  targetRirRange: [number, number];
  rationale: string;
  citation: string;
}

export interface BodyFocusMetadata {
  id: BodyFocus;
  sex: 'female' | 'male' | 'both';
  label: string;
  shortLabel: string;
  summary: string;
  citation: string;
  defaultPrimaryGoal: PrimaryGoal;
  defaultPostureFocus: PostureFocus;
}

export const BODY_FOCUS_PROFILES: Record<BodyFocus, BodyFocusMetadata> = {
  glute_sculpt: {
    id: 'glute_sculpt',
    sex: 'female',
    label: 'Tighter, Rounder Butt (Glute Sculpt)',
    shortLabel: 'Glute Sculpt',
    summary:
      'Shapes and lifts your glutes from all 3 angles: top squeeze (bridges), deep stretch (lunges), and outer hip rounding (side lifts).',
    citation: 'Contreras & Schoenfeld Glute Hypertrophy Framework',
    defaultPrimaryGoal: 'hypertrophy',
    defaultPostureFocus: 'none',
  },
  chest_lift_posture: {
    id: 'chest_lift_posture',
    sex: 'female',
    label: 'Fuller, Lifted Chest & Upright Posture',
    shortLabel: 'Chest & Posture',
    summary:
      'Firms your upper chest muscles and strengthens your upper back to pull rounded shoulders back for a naturally lifted, upright posture.',
    citation: 'Clavicular Pectoralis EMG & Thoracic Posture Research',
    defaultPrimaryGoal: 'hypertrophy',
    defaultPostureFocus: 'rounded_shoulders',
  },
  hourglass_sculpt: {
    id: 'hourglass_sculpt',
    sex: 'female',
    label: 'Hourglass Sculpt (Glutes + Lifted Chest + Flat Waist)',
    shortLabel: 'Hourglass',
    summary:
      'Shapes rounder glutes, firms your upper chest & posture, and tightens your deep inner core for a flatter waist — without bulking up your sides.',
    citation: 'Contreras, Schoenfeld & Hunter/Ansdell Female Calibration',
    defaultPrimaryGoal: 'hypertrophy',
    defaultPostureFocus: 'rounded_shoulders',
  },
  core_waist_sculpt: {
    id: 'core_waist_sculpt',
    sex: 'both',
    label: 'Flat, Toned Waist & Deep Core',
    shortLabel: 'Core & Waist',
    summary:
      'Strengthens your deep inner core (the natural corset muscle around your waist) with dead bugs, reverse crunches, and planks for a flatter, tighter belly.',
    citation: 'TVA Intra-Abdominal Bracing & Core Biomechanics',
    defaultPrimaryGoal: 'conditioning',
    defaultPostureFocus: 'anterior_pelvic_tilt',
  },
  v_taper: {
    id: 'v_taper',
    sex: 'male',
    label: 'V-Taper (Broad Shoulders, Back & Upper Chest)',
    shortLabel: 'V-Taper',
    summary:
      'Builds wider shoulders, a broader upper back, and a fuller upper chest to create a strong athletic V-shape above a trim waist.',
    citation: 'Schoenfeld Regional Hypertrophy Principles',
    defaultPrimaryGoal: 'hypertrophy',
    defaultPostureFocus: 'none',
  },
  upper_hypertrophy: {
    id: 'upper_hypertrophy',
    sex: 'male',
    label: 'Bigger Chest, Arms & Upper Body',
    shortLabel: 'Upper Mass',
    summary:
      'Focuses on building noticeable size and strength in your chest, arms, shoulders, and upper back with steady weekly progression.',
    citation: 'Schoenfeld et al. (2016, 2019) Hypertrophy Volume',
    defaultPrimaryGoal: 'hypertrophy',
    defaultPostureFocus: 'none',
  },
  strength_skills: {
    id: 'strength_skills',
    sex: 'male',
    label: 'Max Strength & Bodyweight Skills',
    shortLabel: 'Strength & Skills',
    summary:
      'Trains impressive bodyweight skills (archer & pike push-ups, pull-ups, single-leg squats) with built-in 2–3 day recovery so your joints stay fresh.',
    citation: 'ACSM Progression Models (2009); Schoenfeld et al. (2017)',
    defaultPrimaryGoal: 'strength',
    defaultPostureFocus: 'none',
  },
  pelvic_sexual_health: {
    id: 'pelvic_sexual_health',
    sex: 'both',
    label: 'Pelvic Floor, Stamina & Sexual Function',
    shortLabel: 'Pelvic & Stamina',
    summary:
      'Boosts blood flow to the hips and pelvis, strengthens your pelvic floor muscles, and builds steady cardio stamina for better tone, control, and endurance.',
    citation: 'Clinical pelvic floor & vascular endurance training',
    defaultPrimaryGoal: 'conditioning',
    defaultPostureFocus: 'anterior_pelvic_tilt',
  },
  balanced: {
    id: 'balanced',
    sex: 'both',
    label: 'Balanced Athletic Full Body',
    shortLabel: 'Full Body',
    summary:
      'Equal emphasis across Push (chest/shoulders), Pull (back/posture), Legs (glutes/thighs), and Core for all-around strength, tone, and energy.',
    citation: 'ACSM & NSCA Resistance Training Guidelines',
    defaultPrimaryGoal: 'hypertrophy',
    defaultPostureFocus: 'none',
  },
};

export function getGoalsForSex(sex: BiologicalSex): BodyFocusMetadata[] {
  if (sex === 'female') {
    return [
      BODY_FOCUS_PROFILES.glute_sculpt,
      BODY_FOCUS_PROFILES.chest_lift_posture,
      BODY_FOCUS_PROFILES.hourglass_sculpt,
      BODY_FOCUS_PROFILES.core_waist_sculpt,
      {
        ...BODY_FOCUS_PROFILES.pelvic_sexual_health,
        label: 'Pelvic Floor Tone, Sensation & Stamina',
      },
      {
        ...BODY_FOCUS_PROFILES.balanced,
        label: 'Full-Body Tone & Fitness',
        shortLabel: 'Full-Body Tone',
      },
    ];
  }
  return [
    BODY_FOCUS_PROFILES.v_taper,
    BODY_FOCUS_PROFILES.upper_hypertrophy,
    {
      ...BODY_FOCUS_PROFILES.core_waist_sculpt,
      label: 'Six-Pack & Core Control',
      shortLabel: 'Six-Pack Core',
      summary:
        'Builds crisp abdominal definition, strong hollow-body bracing, and total core control without straining your lower back.',
      defaultPrimaryGoal: 'hypertrophy',
      defaultPostureFocus: 'none',
    },
    BODY_FOCUS_PROFILES.strength_skills,
    {
      ...BODY_FOCUS_PROFILES.pelvic_sexual_health,
      label: 'Pelvic Stamina, Erection Control & Vitality',
    },
    BODY_FOCUS_PROFILES.balanced,
  ];
}

export const GOAL_RESEARCH_PROFILES: Record<PrimaryGoal, GoalResearchProfile> = {
  strength: {
    goal: 'strength',
    label: 'Strength',
    recommendedDays: 3,
    repRange: [4, 8],
    femaleRepRange: [5, 10],
    restSeconds: 120,
    femaleRestSeconds: 90,
    targetRirRange: [2, 3],
    rationale:
      '3–4 days/week with built-in 2–3 day recovery between the same muscles. Longer rests let your muscles fully recharge for maximum power.',
    citation: 'ACSM Progression Models (2009); Schoenfeld et al. (2017)',
  },
  hypertrophy: {
    goal: 'hypertrophy',
    label: 'Muscle Sculpt',
    recommendedDays: 4,
    repRange: [8, 15],
    femaleRepRange: [10, 18],
    restSeconds: 90,
    femaleRestSeconds: 60,
    targetRirRange: [1, 2],
    rationale:
      '4 days/week trains each muscle group twice a week with balanced rest days. Shorter 60s rests match female recovery speed; 90s rests suit heavier male sets.',
    citation: 'Schoenfeld et al. (2016, 2019); Hunter & Ansdell',
  },
  conditioning: {
    goal: 'conditioning',
    label: 'Conditioning',
    recommendedDays: 5,
    repRange: [12, 20],
    femaleRepRange: [15, 22],
    restSeconds: 45,
    femaleRestSeconds: 40,
    targetRirRange: [1, 2],
    rationale:
      '4–6 days/week alternating upper and lower body with crisp 40–45s rests keeps your heart rate elevated for stamina and calorie burn without burnout.',
    citation: 'ACSM Endurance & Circuit Resistance Guidelines',
  },
  skill: {
    goal: 'skill',
    label: 'Skill',
    recommendedDays: 4,
    repRange: [4, 8],
    femaleRepRange: [4, 8],
    restSeconds: 90,
    femaleRestSeconds: 75,
    targetRirRange: [3, 4],
    rationale:
      '4–5 days/week of clean, fresh practice (stopping 3+ reps before exhaustion) helps your body master harder bodyweight moves safely.',
    citation: 'Schmidt & Lee Motor Control Principles',
  },
};

export const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

const TRAINING_INDICES_BY_COUNT: Record<number, number[]> = {
  3: [0, 2, 4], // Mon, Wed, Fri (Rest: Tue, Thu, Sat, Sun)
  4: [0, 1, 3, 4], // Mon, Tue, Thu, Fri (Rest: Wed, Sat, Sun)
  5: [0, 1, 3, 4, 5], // Mon, Tue, Thu, Fri, Sat (Rest: Wed, Sun)
  6: [0, 1, 2, 4, 5, 6], // Mon, Tue, Wed, Fri, Sat, Sun (Rest: Thu)
  7: [0, 1, 2, 3, 4, 5, 6],
};

function getAlternatingRotation(
  goal: PrimaryGoal,
  daysPerWeek: number,
  bodyFocus: BodyFocus,
): Array<MovementPattern[]> {
  if (bodyFocus === 'pelvic_sexual_health') {
    return [
      ['legs', 'core'],
      ['push', 'pull'],
    ];
  }
  if (bodyFocus === 'glute_sculpt' && daysPerWeek <= 4) {
    return [
      ['legs', 'core'],
      ['push', 'pull'],
      ['legs', 'core'],
      ['legs', 'pull'],
    ];
  }
  if (bodyFocus === 'chest_lift_posture' || bodyFocus === 'upper_hypertrophy' || bodyFocus === 'v_taper') {
    return [
      ['push', 'pull'],
      ['legs', 'core'],
    ];
  }
  if (goal === 'strength' || bodyFocus === 'strength_skills') {
    if (daysPerWeek === 3) {
      return [
        ['push', 'pull', 'legs', 'core'],
        ['push', 'pull', 'legs', 'core'],
        ['push', 'pull', 'legs', 'core'],
      ];
    }
    return [
      ['push', 'pull'],
      ['legs', 'core'],
    ];
  }
  if (goal === 'hypertrophy') {
    return [
      ['push', 'pull'],
      ['legs', 'core'],
    ];
  }
  if (goal === 'conditioning') {
    return [
      ['push', 'legs'],
      ['pull', 'core'],
    ];
  }
  return [
    ['push', 'pull'],
    ['legs', 'core'],
  ];
}

export function generateRecommendedWeeklyPlan(
  goal: PrimaryGoal,
  daysPerWeek: number,
  targetMinutes: number,
  bodyFocus: BodyFocus = 'balanced',
): WeeklySplitDay[] {
  const clampedDays = Math.min(7, Math.max(3, daysPerWeek));
  const trainIndices = new Set(
    bodyFocus === 'glute_sculpt' && clampedDays === 3
      ? [0, 2, 4]
      : TRAINING_INDICES_BY_COUNT[clampedDays] ?? TRAINING_INDICES_BY_COUNT[4],
  );
  const rotations = getAlternatingRotation(goal, clampedDays, bodyFocus);

  let trainCounter = 0;
  return Array.from({ length: 7 }, (_, idx) => {
    if (!trainIndices.has(idx)) {
      return {
        day: idx + 1,
        focus: ['rest'],
        target_minutes: 10,
      };
    }
    const focus = rotations[trainCounter % rotations.length];
    trainCounter += 1;
    return {
      day: idx + 1,
      focus,
      target_minutes: targetMinutes,
    };
  });
}

export function applyRecommendedPlanToConfig(
  config: ProgramConfig,
  goal: PrimaryGoal,
  daysPerWeek: number,
  targetMinutes: number,
  biologicalSex: BiologicalSex = 'female',
  bodyFocus: BodyFocus = 'balanced',
): ProgramConfig {
  const research = GOAL_RESEARCH_PROFILES[goal];
  const nextSplit = generateRecommendedWeeklyPlan(goal, daysPerWeek, targetMinutes, bodyFocus);
  const nextTracks = { ...config.movement_tracks };

  const repRange = biologicalSex === 'female' ? research.femaleRepRange : research.repRange;
  const restSeconds =
    biologicalSex === 'female' ? research.femaleRestSeconds : research.restSeconds;

  for (const pattern of Object.keys(nextTracks) as MovementPattern[]) {
    const track = nextTracks[pattern];
    if (!track) continue;
    const isSeconds = track.prescription.unit === 'seconds';
    nextTracks[pattern] = {
      ...track,
      prescription: {
        ...track.prescription,
        min_target: isSeconds ? track.prescription.min_target : repRange[0],
        max_target: isSeconds ? track.prescription.max_target : repRange[1],
        rest_seconds: restSeconds,
        target_rir_range: research.targetRirRange,
      },
    };
  }

  return {
    ...config,
    meta: {
      ...config.meta,
      updated_at: new Date().toISOString().slice(0, 10),
      active_phase: `${bodyFocus}_${goal}`,
      coach_summary: `${BODY_FOCUS_PROFILES[bodyFocus].shortLabel} · ${research.label} (${daysPerWeek}d/wk). ${research.citation}.`,
    },
    weekly_split: nextSplit,
    movement_tracks: nextTracks,
  };
}

export interface MesocycleWeek {
  weekNumber: number;
  label: string;
  isDeload: boolean;
  volumeNote: string;
  days: WeeklySplitDay[];
}

export function buildMonthlyMesocycle(weeklySplit: WeeklySplitDay[]): MesocycleWeek[] {
  const normalized =
    weeklySplit.length === 7
      ? weeklySplit
      : Array.from(
          { length: 7 },
          (_, i) => weeklySplit[i] ?? { day: i + 1, focus: ['rest'], target_minutes: 10 },
        );

  return [
    {
      weekNumber: 1,
      label: 'Week 1 · Foundation',
      isDeload: false,
      volumeNote: '100% baseline sets · Establish crisp tempo & RIR',
      days: normalized,
    },
    {
      weekNumber: 2,
      label: 'Week 2 · Build',
      isDeload: false,
      volumeNote: '100% sets · +1 rep / +5s where 2+ RIR met',
      days: normalized,
    },
    {
      weekNumber: 3,
      label: 'Week 3 · Peak Overload',
      isDeload: false,
      volumeNote: '100% sets · Push top of target rep range',
      days: normalized,
    },
    {
      weekNumber: 4,
      label: 'Week 4 · Deload & Recover',
      isDeload: true,
      volumeNote: '~60% volume · Dissipate fatigue for supercompensation',
      days: normalized,
    },
  ];
}
