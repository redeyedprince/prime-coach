import { z } from 'zod';

export const APP_VERSION = '2.8';
export const APP_BUILD_NUMBER = 18;

export const MovementPatternSchema = z.enum(['push', 'pull', 'legs', 'core']);
export type MovementPattern = z.infer<typeof MovementPatternSchema>;

export const PrimaryGoalSchema = z.enum(['hypertrophy', 'strength', 'conditioning', 'skill']);
export type PrimaryGoal = z.infer<typeof PrimaryGoalSchema>;

export const PacingModeSchema = z.enum(['strict_time_cap', 'fixed_volume']);
export type PacingMode = z.infer<typeof PacingModeSchema>;

export const CueStyleSchema = z.enum(['audio_and_vibrate', 'vibrate_only', 'silent_visual']);
export type CueStyle = z.infer<typeof CueStyleSchema>;

export const JointTagSchema = z.enum(['none', 'wrist', 'shoulder', 'elbow', 'knee', 'lower_back']);
export type JointTag = z.infer<typeof JointTagSchema>;

export const StartingTierSchema = z.enum(['foundation', 'intermediate', 'advanced']);
export type StartingTier = z.infer<typeof StartingTierSchema>;

export const ReadinessLevelSchema = z.enum(['fresh', 'normal', 'fatigued']);
export type ReadinessLevel = z.infer<typeof ReadinessLevelSchema>;

export const UnitSchema = z.enum(['reps', 'seconds']);
export type ExerciseUnit = z.infer<typeof UnitSchema>;

export const EquipmentItemSchema = z.enum(['dumbbell', 'pull_up_bar', 'chair_bench']);
export type EquipmentItem = z.infer<typeof EquipmentItemSchema>;

export const BiologicalSexSchema = z.enum(['female', 'male']);
export type BiologicalSex = z.infer<typeof BiologicalSexSchema>;

export const AgeBracketSchema = z.enum(['18_29', '30_39', '40_49', '50_plus']);
export type AgeBracket = z.infer<typeof AgeBracketSchema>;

export const PostureFocusSchema = z.enum(['none', 'rounded_shoulders', 'anterior_pelvic_tilt']);
export type PostureFocus = z.infer<typeof PostureFocusSchema>;

export const BodyFocusSchema = z.enum([
  // Female-tailored goals
  'glute_sculpt',
  'chest_lift_posture',
  'hourglass_sculpt',
  'core_waist_sculpt',
  // Male-tailored goals
  'v_taper',
  'upper_hypertrophy',
  'strength_skills',
  // Shared
  'pelvic_sexual_health',
  'balanced',
]);
export type BodyFocus = z.infer<typeof BodyFocusSchema>;

export const KegelLevelSchema = z.enum(['foundation', 'intermediate', 'advanced']);
export type KegelLevel = z.infer<typeof KegelLevelSchema>;

export const TrainingModeSchema = z.enum(['curated', 'free']);
export type TrainingMode = z.infer<typeof TrainingModeSchema>;

export const WorkoutLocationSchema = z.enum(['home_calisthenics', 'gym']);
export type WorkoutLocation = z.infer<typeof WorkoutLocationSchema>;

export const UserProfileSchema = z.object({
  user_name: z.string().min(1).default('Athlete'),
  biological_sex: BiologicalSexSchema.default('female'),
  age_bracket: AgeBracketSchema.default('18_29'),
  posture_focus: PostureFocusSchema.default('none'),
  body_focus: BodyFocusSchema.default('balanced'),
  training_mode: TrainingModeSchema.default('curated'),
  preferred_workout_time: z.string().default('18:00'),
  active_location: WorkoutLocationSchema.default('home_calisthenics'),
  primary_goal: PrimaryGoalSchema,
  days_per_week: z.number().int().min(3).max(7),
  session_duration_minutes: z.number().int().min(10).max(45),
  pacing_mode: PacingModeSchema,
  cue_style: CueStyleSchema,
  zero_equipment_only: z.literal(true),
  quiet_hotel_mode: z.boolean(),
  joint_restrictions: z.array(JointTagSchema).min(1),
  available_equipment: z.array(EquipmentItemSchema).default([]),
  dumbbell_kg: z.number().positive().max(200).nullable().optional(),
  dumbbell_count: z.number().int().min(1).max(2).default(1),
  starting_tier: StartingTierSchema,
  upper_starting_tier: StartingTierSchema.default('intermediate'),
  lower_starting_tier: StartingTierSchema.default('intermediate'),
  bodyweight_kg: z.number().positive().max(300).nullable().optional(),
  height_cm: z.number().positive().max(260).nullable().optional(),
  last_weight_updated_at: z.string().optional(),
  weight_reminder_snoozed_until: z.string().optional(),
  include_cardio_finisher: z.boolean().default(false),
  include_tendon_prep: z.boolean().default(false),
  kegel_level: KegelLevelSchema.default('foundation'),
  kegel_reminder_enabled: z.boolean().default(true),
  kegel_reminder_times: z.array(z.string()).default(['10:30', '15:00', '20:30']),
  tour_completed: z.boolean().default(false),
  calibrated: z.boolean().default(false),
  onboarding_version: z.number().int().default(1),
  updated_at: z.string(),
});
export type UserProfile = z.infer<typeof UserProfileSchema>;

export const PrescriptionSchema = z.object({
  sets: z.number().int().min(1).max(10),
  min_target: z.number().int().min(1),
  max_target: z.number().int().min(1),
  unit: UnitSchema,
  target_rir_range: z.tuple([z.number().int().min(0).max(5), z.number().int().min(0).max(5)]),
  rest_seconds: z.number().int().min(15).max(300),
  tempo: z.string().regex(/^\d+-\d+-\d+-\d+$/),
});
export type Prescription = z.infer<typeof PrescriptionSchema>;

export const AutoRulesSchema = z.object({
  level_up_consecutive_sessions: z.number().int().min(1).max(10),
  level_up_min_rir: z.number().int().min(0).max(5),
  min_conditioning_weeks: z.number().int().min(1).max(12),
  hold_progression: z.boolean(),
});
export type AutoRules = z.infer<typeof AutoRulesSchema>;

export const MovementTrackSchema = z.object({
  active_slug: z.string().min(1),
  bw_load_factor: z.number().min(0.1).max(1.5),
  progression_ladder: z.array(z.string().min(1)).min(1),
  prescription: PrescriptionSchema,
  auto_rules: AutoRulesSchema,
});
export type MovementTrack = z.infer<typeof MovementTrackSchema>;

export const WeeklySplitDaySchema = z.object({
  day: z.number().int().min(1).max(7),
  focus: z.array(z.string().min(1)).min(1),
  target_minutes: z.number().int().min(10).max(60),
});
export type WeeklySplitDay = z.infer<typeof WeeklySplitDaySchema>;

export const ProgramConfigSchema = z.object({
  meta: z.object({
    version: z.number().int().min(1),
    updated_at: z.string(),
    active_phase: z.string(),
    coach_summary: z.string(),
  }),
  global_modifiers: z.object({
    deload_active: z.boolean(),
    volume_multiplier: z.number().min(0.25).max(2.0),
    rest_adjustment_seconds: z.number().int().min(-60).max(120),
    quiet_hotel_mode: z.boolean(),
    restricted_tags: z.array(z.string()),
  }),
  weekly_split: z.array(WeeklySplitDaySchema).min(1),
  movement_tracks: z.record(MovementPatternSchema, MovementTrackSchema),
});
export type ProgramConfig = z.infer<typeof ProgramConfigSchema>;

export interface WorkoutLogEntry {
  id?: number;
  date: string; // YYYY-MM-DD
  completed_at?: string; // ISO timestamp
  location?: WorkoutLocation;
  session_id: string;
  readiness: ReadinessLevel;
  bodyweight_kg: number | null;
  pattern: MovementPattern;
  exercise_slug: string;
  set_number: number;
  target_value: number;
  completed_value: number;
  unit: ExerciseUnit;
  rir: number; // 0, 1, 2, 3 (representing 3+)
  soreness_tag: JointTag;
  notes: string;
}

export interface DriveSyncMeta {
  id: 'singleton';
  googleClientId?: string;
  geminiApiKey?: string;
  folderId?: string;
  userProfileFileId?: string;
  workoutLogFileId?: string;
  programConfigFileId?: string;
  coachContextFileId?: string;
  bodyMetricsFileId?: string;
  appVersionFileId?: string;
  apkFileId?: string;
  archivedLogCount?: number;
  lastSyncedAt?: string;
}

export type SleepQuality = 'great' | 'ok' | 'poor';

export interface DailyCheckIn {
  date: string; // YYYY-MM-DD
  sleep_quality: SleepQuality;
  hydration_hit: boolean;
  protein_hit: boolean;
  steps_hit: boolean;
  updated_at: string;
}

export type PrimePillarKey = 'strength' | 'mobility' | 'balance' | 'heart' | 'breath' | 'core';

export interface PrimePillarScores {
  strength: number; // 0-100
  mobility: number; // 0-100
  balance: number; // 0-100
  heart: number; // 0-100
  breath: number; // 0-100
  core: number; // 0-100
}

export interface PrimeAssessmentInput {
  pushups_max: number;
  pushup_variant: 'full' | 'knee';
  plank_seconds: number;
  balance_seconds: number;
  balance_eyes_closed: boolean;
  mobility_rating: 1 | 2 | 3 | 4 | 5;
  heart_recovery_rating: 1 | 2 | 3 | 4 | 5;
  bolt_seconds: number;
}

export interface PrimeAssessmentEntry extends PrimeAssessmentInput {
  id?: number;
  date: string; // YYYY-MM-DD
  created_at: string;
  pillar_scores: PrimePillarScores;
  overall_score: number;
  strongest_pillar: PrimePillarKey;
  weakest_pillar: PrimePillarKey;
}

export interface BodyMetricEntry {
  id?: number;
  date: string; // YYYY-MM-DD
  created_at: string;
  weight_kg: number;
  neck_cm?: number | null;
  shoulders_cm?: number | null;
  chest_cm?: number | null;
  waist_cm?: number | null;
  hips_cm?: number | null;
  arm_left_cm?: number | null;
  arm_right_cm?: number | null;
  thigh_left_cm?: number | null;
  thigh_right_cm?: number | null;
  notes?: string;
}
