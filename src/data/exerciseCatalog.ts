import rawManifest from '@bryllim/workout-guide/manifest.json';
import type {
  BodyFocus,
  EquipmentItem,
  ExerciseUnit,
  JointTag,
  MovementPattern,
  ProgramConfig,
  StartingTier,
  UserProfile,
} from '../types/schemas';

export type ImpactLevel = 'low' | 'explosive';
export type EquipmentRequirement = EquipmentItem | 'gym';
export type FocusTag =
  | 'glute_max'
  | 'glute_med'
  | 'chest_lift'
  | 'posture_pull'
  | 'tva_core'
  | 'v_taper'
  | 'pelvic_floor'
  | 'cardio'
  | 'tendon'
  | 'mobility'
  | 'balance'
  | 'power'
  | 'warmup';
export type SessionRole =
  | 'warmup'
  | 'primary'
  | 'accessory'
  | 'finisher'
  | 'cardio'
  | 'tendon'
  | 'mobility'
  | 'balance';

export interface FloorExercise {
  slug: string;
  name: string;
  pattern: MovementPattern;
  rung_index: number;
  bw_load_factor: number;
  impact_level: ImpactLevel;
  quiet_substitute_slug?: string;
  unit: ExerciseUnit;
  contraindicated_joints: Exclude<JointTag, 'none'>[];
  tier: StartingTier;
  required_equipment?: EquipmentRequirement;
  required_dumbbell_count?: 1 | 2;
  focus_tags?: FocusTag[];
  session_role?: SessionRole;
  primaryMuscle?: string;
  sourceEquipment?: string;
  cues: string;
}

/**
 * Hand-curated exercises with explicit biomechanics & coaching cues.
 * Remaining exercises from @bryllim/workout-guide/manifest.json (302 total)
 * are imported automatically below.
 */
const CURATED_EXERCISES: FloorExercise[] = [
  // WARM-UP & MOBILITY (Bodyweight flat-floor)
  {
    slug: 'cat-cow-stretch',
    name: 'Cat-Cow Thoracic Stretch',
    pattern: 'pull',
    rung_index: -1,
    bw_load_factor: 0.2,
    impact_level: 'low',
    unit: 'seconds',
    contraindicated_joints: ['wrist'],
    tier: 'foundation',
    focus_tags: ['warmup', 'posture_pull', 'chest_lift'],
    session_role: 'warmup',
    cues: 'Arch and extend upper back slowly to open sternum & thoracic spine.',
  },
  {
    slug: 'worlds-greatest-stretch',
    name: "World's Greatest Stretch",
    pattern: 'legs',
    rung_index: -1,
    bw_load_factor: 0.25,
    impact_level: 'low',
    unit: 'seconds',
    contraindicated_joints: ['knee'],
    tier: 'foundation',
    focus_tags: ['warmup', 'glute_max'],
    session_role: 'warmup',
    cues: 'Step into deep lunge, open chest toward front knee to mobilize hips.',
  },

  // PUSH (easiest -> hardest, flat floor)
  {
    slug: 'knee-push-up',
    name: 'Knee Push-up',
    pattern: 'push',
    rung_index: 0,
    bw_load_factor: 0.49,
    impact_level: 'low',
    unit: 'reps',
    contraindicated_joints: ['wrist', 'shoulder', 'elbow'],
    tier: 'foundation',
    focus_tags: ['chest_lift'],
    session_role: 'primary',
    cues: 'Straight line from knees to shoulders; lift chest cleanly on press.',
  },
  {
    slug: 'push-up',
    name: 'Push-up',
    pattern: 'push',
    rung_index: 1,
    bw_load_factor: 0.64,
    impact_level: 'low',
    unit: 'reps',
    contraindicated_joints: ['wrist', 'shoulder', 'elbow'],
    tier: 'intermediate',
    focus_tags: ['chest_lift'],
    session_role: 'primary',
    cues: 'Brace core and glutes; chest grazes the floor cleanly.',
  },
  {
    slug: 'wide-push-up',
    name: 'Wide Push-up',
    pattern: 'push',
    rung_index: 2,
    bw_load_factor: 0.64,
    impact_level: 'low',
    unit: 'reps',
    contraindicated_joints: ['shoulder', 'wrist'],
    tier: 'intermediate',
    focus_tags: ['chest_lift'],
    session_role: 'primary',
    cues: 'Hands wider than shoulders; squeeze pectoral shelf at the top.',
  },
  {
    slug: 'diamond-push-up',
    name: 'Diamond Push-up',
    pattern: 'push',
    rung_index: 3,
    bw_load_factor: 0.69,
    impact_level: 'low',
    unit: 'reps',
    contraindicated_joints: ['elbow', 'wrist', 'shoulder'],
    tier: 'intermediate',
    focus_tags: ['chest_lift'],
    session_role: 'accessory',
    cues: 'Thumbs and index fingers form a diamond under sternum.',
  },
  {
    slug: 'pike-push-up',
    name: 'Pike Push-up',
    pattern: 'push',
    rung_index: 4,
    bw_load_factor: 0.72,
    impact_level: 'low',
    unit: 'reps',
    contraindicated_joints: ['shoulder', 'wrist'],
    tier: 'advanced',
    focus_tags: ['chest_lift', 'v_taper'],
    session_role: 'primary',
    cues: 'Hips high in inverted V; crown of head tracks forward of hands.',
  },
  {
    slug: 'hindu-push-up',
    name: 'Hindu Push-up',
    pattern: 'push',
    rung_index: 5,
    bw_load_factor: 0.70,
    impact_level: 'low',
    unit: 'reps',
    contraindicated_joints: ['shoulder', 'lower_back', 'wrist'],
    tier: 'advanced',
    focus_tags: ['chest_lift'],
    session_role: 'primary',
    cues: 'Dive chest between hands and scoop smoothly into upward chest lift.',
  },
  {
    slug: 'archer-push-up',
    name: 'Archer Push-up',
    pattern: 'push',
    rung_index: 6,
    bw_load_factor: 0.78,
    impact_level: 'low',
    unit: 'reps',
    contraindicated_joints: ['shoulder', 'elbow', 'wrist'],
    tier: 'advanced',
    focus_tags: ['chest_lift', 'v_taper'],
    session_role: 'primary',
    cues: 'Shift weight to working arm while keeping opposite arm straight.',
  },
  {
    slug: 'explosive-push-up',
    name: 'Explosive Push-up',
    pattern: 'push',
    rung_index: 7,
    bw_load_factor: 0.75,
    impact_level: 'explosive',
    quiet_substitute_slug: 'archer-push-up',
    unit: 'reps',
    contraindicated_joints: ['wrist', 'elbow', 'shoulder'],
    tier: 'advanced',
    session_role: 'primary',
    cues: 'Drive hard off the floor and land softly with bent elbows.',
  },

  // PULL / POSTERIOR CHAIN (flat floor)
  {
    slug: 'scapular-push-up',
    name: 'Scapular Push-up',
    pattern: 'pull',
    rung_index: 0,
    bw_load_factor: 0.45,
    impact_level: 'low',
    unit: 'reps',
    contraindicated_joints: ['wrist', 'shoulder'],
    tier: 'foundation',
    focus_tags: ['posture_pull'],
    session_role: 'accessory',
    cues: 'Arms locked straight; pinch and spread shoulder blades smoothly.',
  },
  {
    slug: 'superman',
    name: 'Superman',
    pattern: 'pull',
    rung_index: 1,
    bw_load_factor: 0.35,
    impact_level: 'low',
    unit: 'reps',
    contraindicated_joints: ['lower_back'],
    tier: 'foundation',
    focus_tags: ['posture_pull', 'glute_max'],
    session_role: 'primary',
    cues: 'Lift chest and thighs together; pause 1s at top without jerking.',
  },
  {
    slug: 'superman-hold',
    name: 'Superman Hold',
    pattern: 'pull',
    rung_index: 2,
    bw_load_factor: 0.35,
    impact_level: 'low',
    unit: 'seconds',
    contraindicated_joints: ['lower_back'],
    tier: 'intermediate',
    focus_tags: ['posture_pull'],
    session_role: 'finisher',
    cues: 'Hold isometric posterior arch while breathing steadily.',
  },
  {
    slug: 'prone-t-raise',
    name: 'Prone T Raise',
    pattern: 'pull',
    rung_index: 3,
    bw_load_factor: 0.38,
    impact_level: 'low',
    unit: 'reps',
    contraindicated_joints: ['shoulder'],
    tier: 'intermediate',
    focus_tags: ['posture_pull', 'chest_lift'],
    session_role: 'accessory',
    cues: 'Forehead down; thumbs up, squeeze mid-traps to pull shoulders back.',
  },
  {
    slug: 'reverse-snow-angel',
    name: 'Reverse Snow Angel',
    pattern: 'pull',
    rung_index: 4,
    bw_load_factor: 0.40,
    impact_level: 'low',
    unit: 'reps',
    contraindicated_joints: ['shoulder', 'lower_back'],
    tier: 'intermediate',
    focus_tags: ['posture_pull', 'v_taper', 'chest_lift'],
    session_role: 'primary',
    cues: 'Hover arms above floor and sweep from hips to overhead.',
  },
  {
    slug: 'prone-y-raise',
    name: 'Prone Y Raise',
    pattern: 'pull',
    rung_index: 5,
    bw_load_factor: 0.42,
    impact_level: 'low',
    unit: 'reps',
    contraindicated_joints: ['shoulder'],
    tier: 'advanced',
    focus_tags: ['posture_pull', 'chest_lift'],
    session_role: 'accessory',
    cues: 'Raise straight arms in a Y overhead; lifts thoracic posture.',
  },

  // LEGS & TRI-PLANAR GLUTES (flat floor)
  {
    slug: 'glute-bridge',
    name: 'Glute Bridge',
    pattern: 'legs',
    rung_index: 0,
    bw_load_factor: 0.50,
    impact_level: 'low',
    unit: 'reps',
    contraindicated_joints: ['lower_back'],
    tier: 'foundation',
    focus_tags: ['glute_max'],
    session_role: 'primary',
    cues: 'Drive through heels; posterior pelvic tilt & squeeze glutes at top.',
  },
  {
    slug: 'clamshell',
    name: 'Clamshell',
    pattern: 'legs',
    rung_index: 1,
    bw_load_factor: 0.25,
    impact_level: 'low',
    unit: 'reps',
    contraindicated_joints: [],
    tier: 'foundation',
    focus_tags: ['glute_med'],
    session_role: 'accessory',
    cues: 'Keep pelvis stacked; open top knee squeezing side glute shelf.',
  },
  {
    slug: 'fire-hydrant',
    name: 'Fire Hydrant',
    pattern: 'legs',
    rung_index: 2,
    bw_load_factor: 0.30,
    impact_level: 'low',
    unit: 'reps',
    contraindicated_joints: ['wrist', 'knee'],
    tier: 'foundation',
    focus_tags: ['glute_med'],
    session_role: 'accessory',
    cues: 'On all fours, lift bent knee outward targeting upper-outer glute.',
  },
  {
    slug: 'donkey-kick',
    name: 'Donkey Kick',
    pattern: 'legs',
    rung_index: 3,
    bw_load_factor: 0.35,
    impact_level: 'low',
    unit: 'reps',
    contraindicated_joints: ['wrist', 'knee', 'lower_back'],
    tier: 'foundation',
    focus_tags: ['glute_max'],
    session_role: 'accessory',
    cues: 'Drive heel toward ceiling without arching lower back.',
  },
  {
    slug: 'side-lying-hip-abduction',
    name: 'Side-Lying Hip Abduction',
    pattern: 'legs',
    rung_index: 4,
    bw_load_factor: 0.28,
    impact_level: 'low',
    unit: 'reps',
    contraindicated_joints: [],
    tier: 'foundation',
    focus_tags: ['glute_med'],
    session_role: 'accessory',
    cues: 'Lead with heel slightly behind hip line to isolate gluteus medius.',
  },
  {
    slug: 'frog-pump',
    name: 'Frog Pump',
    pattern: 'legs',
    rung_index: 5,
    bw_load_factor: 0.45,
    impact_level: 'low',
    unit: 'reps',
    contraindicated_joints: [],
    tier: 'intermediate',
    focus_tags: ['glute_max', 'glute_med'],
    session_role: 'finisher',
    cues: 'Soles of feet together, knees flared; rapid peak-contraction glute pumps.',
  },
  {
    slug: 'glute-bridge-march',
    name: 'Glute Bridge March',
    pattern: 'legs',
    rung_index: 6,
    bw_load_factor: 0.55,
    impact_level: 'low',
    unit: 'reps',
    contraindicated_joints: ['lower_back'],
    tier: 'intermediate',
    focus_tags: ['glute_max', 'glute_med'],
    session_role: 'accessory',
    cues: 'Hold high bridge while alternating knee lifts; zero hip drop.',
  },
  {
    slug: 'bodyweight-squat',
    name: 'Bodyweight Squat',
    pattern: 'legs',
    rung_index: 7,
    bw_load_factor: 0.65,
    impact_level: 'low',
    unit: 'reps',
    contraindicated_joints: ['knee'],
    tier: 'foundation',
    focus_tags: ['glute_max'],
    session_role: 'primary',
    cues: 'Chest tall, knees track toes, hips descend below parallel.',
  },
  {
    slug: 'curtsy-lunge',
    name: 'Curtsy Lunge',
    pattern: 'legs',
    rung_index: 8,
    bw_load_factor: 0.68,
    impact_level: 'low',
    unit: 'reps',
    contraindicated_joints: ['knee'],
    tier: 'intermediate',
    focus_tags: ['glute_max', 'glute_med'],
    session_role: 'accessory',
    cues: 'Step rear foot diagonally behind to stretch outer glute.',
  },
  {
    slug: 'forward-lunge',
    name: 'Forward Lunge',
    pattern: 'legs',
    rung_index: 9,
    bw_load_factor: 0.70,
    impact_level: 'low',
    unit: 'reps',
    contraindicated_joints: ['knee'],
    tier: 'intermediate',
    focus_tags: ['glute_max'],
    session_role: 'primary',
    cues: 'Step smoothly; both knees form ~90° at bottom.',
  },
  {
    slug: 'single-leg-glute-bridge',
    name: 'Single-Leg Glute Bridge',
    pattern: 'legs',
    rung_index: 10,
    bw_load_factor: 0.65,
    impact_level: 'low',
    unit: 'reps',
    contraindicated_joints: ['lower_back'],
    tier: 'intermediate',
    focus_tags: ['glute_max', 'glute_med'],
    session_role: 'primary',
    cues: 'Keep pelvis level; drive through planted heel for peak glute squeeze.',
  },
  {
    slug: 'cossack-squat',
    name: 'Cossack Squat',
    pattern: 'legs',
    rung_index: 11,
    bw_load_factor: 0.78,
    impact_level: 'low',
    unit: 'reps',
    contraindicated_joints: ['knee'],
    tier: 'advanced',
    focus_tags: ['glute_max', 'glute_med'],
    session_role: 'primary',
    cues: 'Wide stance; sit deep onto one heel while opposite toes point up.',
  },
  {
    slug: 'jump-squat',
    name: 'Jump Squat',
    pattern: 'legs',
    rung_index: 12,
    bw_load_factor: 0.75,
    impact_level: 'explosive',
    quiet_substitute_slug: 'cossack-squat',
    unit: 'reps',
    contraindicated_joints: ['knee', 'lower_back'],
    tier: 'advanced',
    session_role: 'primary',
    cues: 'Explode upward and absorb landing softly into next squat.',
  },
  {
    slug: 'shrimp-squat',
    name: 'Shrimp Squat',
    pattern: 'legs',
    rung_index: 13,
    bw_load_factor: 0.88,
    impact_level: 'low',
    unit: 'reps',
    contraindicated_joints: ['knee'],
    tier: 'advanced',
    focus_tags: ['glute_max'],
    session_role: 'primary',
    cues: 'Hold rear foot behind; lower rear knee gently toward floor.',
  },
  {
    slug: 'pistol-squat',
    name: 'Pistol Squat',
    pattern: 'legs',
    rung_index: 14,
    bw_load_factor: 0.92,
    impact_level: 'low',
    unit: 'reps',
    contraindicated_joints: ['knee', 'lower_back'],
    tier: 'advanced',
    focus_tags: ['glute_max'],
    session_role: 'primary',
    cues: 'Extend free leg forward; control full single-leg descent.',
  },

  // CORE & DEEP TVA WAIST (flat floor)
  {
    slug: 'dead-bug',
    name: 'Dead Bug',
    pattern: 'core',
    rung_index: 0,
    bw_load_factor: 0.35,
    impact_level: 'low',
    unit: 'reps',
    contraindicated_joints: [],
    tier: 'foundation',
    focus_tags: ['tva_core'],
    session_role: 'finisher',
    cues: 'Press lower back flat into floor as opposite arm/leg extend.',
  },
  {
    slug: 'bird-dog',
    name: 'Bird Dog',
    pattern: 'core',
    rung_index: 1,
    bw_load_factor: 0.38,
    impact_level: 'low',
    unit: 'reps',
    contraindicated_joints: ['wrist', 'knee'],
    tier: 'foundation',
    focus_tags: ['tva_core', 'posture_pull'],
    session_role: 'finisher',
    cues: 'Square hips; reach long rather than high.',
  },
  {
    slug: 'reverse-crunch',
    name: 'Reverse Crunch',
    pattern: 'core',
    rung_index: 2,
    bw_load_factor: 0.42,
    impact_level: 'low',
    unit: 'reps',
    contraindicated_joints: [],
    tier: 'foundation',
    focus_tags: ['tva_core'],
    session_role: 'finisher',
    cues: 'Curl tailbone gently off floor pulling lower belly flat.',
  },
  {
    slug: 'plank',
    name: 'Forearm Plank',
    pattern: 'core',
    rung_index: 3,
    bw_load_factor: 0.55,
    impact_level: 'low',
    unit: 'seconds',
    contraindicated_joints: ['shoulder', 'lower_back'],
    tier: 'foundation',
    focus_tags: ['tva_core'],
    session_role: 'primary',
    cues: 'Posterior pelvic tilt; draw belly button inward toward spine.',
  },
  {
    slug: 'flutter-kick',
    name: 'Flutter Kick',
    pattern: 'core',
    rung_index: 4,
    bw_load_factor: 0.48,
    impact_level: 'low',
    unit: 'seconds',
    contraindicated_joints: ['lower_back'],
    tier: 'intermediate',
    focus_tags: ['tva_core'],
    session_role: 'finisher',
    cues: 'Lower back pressed firmly to floor; small crisp kicks.',
  },
  {
    slug: 'side-plank',
    name: 'Side Plank',
    pattern: 'core',
    rung_index: 5,
    bw_load_factor: 0.50,
    impact_level: 'low',
    unit: 'seconds',
    contraindicated_joints: ['shoulder', 'elbow'],
    tier: 'intermediate',
    focus_tags: ['tva_core'],
    session_role: 'primary',
    cues: 'Stack hips and shoulders; press forearm firmly into floor.',
  },
  {
    slug: 'plank-shoulder-tap',
    name: 'Plank Shoulder Tap',
    pattern: 'core',
    rung_index: 6,
    bw_load_factor: 0.60,
    impact_level: 'low',
    unit: 'reps',
    contraindicated_joints: ['wrist', 'shoulder'],
    tier: 'intermediate',
    focus_tags: ['tva_core'],
    session_role: 'accessory',
    cues: 'Minimize hip sway as each hand taps the opposite shoulder.',
  },
  {
    slug: 'mountain-climber',
    name: 'Mountain Climber',
    pattern: 'core',
    rung_index: 7,
    bw_load_factor: 0.60,
    impact_level: 'explosive',
    quiet_substitute_slug: 'plank-shoulder-tap',
    unit: 'reps',
    contraindicated_joints: ['wrist', 'shoulder', 'knee'],
    tier: 'intermediate',
    session_role: 'finisher',
    cues: 'Drive knees briskly toward chest while keeping shoulders stacked.',
  },
  {
    slug: 'hollow-body-hold',
    name: 'Hollow Body Hold',
    pattern: 'core',
    rung_index: 8,
    bw_load_factor: 0.65,
    impact_level: 'low',
    unit: 'seconds',
    contraindicated_joints: ['lower_back'],
    tier: 'advanced',
    focus_tags: ['tva_core'],
    session_role: 'primary',
    cues: 'Lower back glued to floor; arms and legs extended low.',
  },
  {
    slug: 'v-up',
    name: 'V-Up',
    pattern: 'core',
    rung_index: 9,
    bw_load_factor: 0.72,
    impact_level: 'low',
    unit: 'reps',
    contraindicated_joints: ['lower_back'],
    tier: 'advanced',
    focus_tags: ['tva_core'],
    session_role: 'finisher',
    cues: 'Fold torso and straight legs simultaneously to meet at top.',
  },

  // OPTIONAL HOME EQUIPMENT: PULL-UP BAR
  {
    slug: 'scapular-pull-up',
    name: 'Scapular Pull-up',
    pattern: 'pull',
    rung_index: 10,
    bw_load_factor: 0.85,
    impact_level: 'low',
    unit: 'reps',
    contraindicated_joints: ['shoulder'],
    tier: 'foundation',
    required_equipment: 'pull_up_bar',
    focus_tags: ['v_taper', 'posture_pull'],
    session_role: 'accessory',
    cues: 'Hang with straight arms; pull shoulder blades down and together.',
  },
  {
    slug: 'negative-pull-up',
    name: 'Negative Pull-up',
    pattern: 'pull',
    rung_index: 11,
    bw_load_factor: 0.95,
    impact_level: 'low',
    unit: 'reps',
    contraindicated_joints: ['shoulder', 'elbow'],
    tier: 'intermediate',
    required_equipment: 'pull_up_bar',
    focus_tags: ['v_taper'],
    session_role: 'primary',
    cues: 'Start chin over bar and lower with a slow 4-second eccentric.',
  },
  {
    slug: 'chin-up',
    name: 'Chin-up',
    pattern: 'pull',
    rung_index: 12,
    bw_load_factor: 1.0,
    impact_level: 'low',
    unit: 'reps',
    contraindicated_joints: ['elbow', 'shoulder'],
    tier: 'intermediate',
    required_equipment: 'pull_up_bar',
    focus_tags: ['v_taper'],
    session_role: 'primary',
    cues: 'Supinated grip; pull chest toward bar without swinging.',
  },
  {
    slug: 'pull-up',
    name: 'Pull-up',
    pattern: 'pull',
    rung_index: 13,
    bw_load_factor: 1.0,
    impact_level: 'low',
    unit: 'reps',
    contraindicated_joints: ['shoulder', 'elbow'],
    tier: 'advanced',
    required_equipment: 'pull_up_bar',
    focus_tags: ['v_taper'],
    session_role: 'primary',
    cues: 'Overhand grip; drive elbows down until chin clears bar.',
  },
  {
    slug: 'hanging-knee-raise',
    name: 'Hanging Knee Raise',
    pattern: 'core',
    rung_index: 10,
    bw_load_factor: 0.65,
    impact_level: 'low',
    unit: 'reps',
    contraindicated_joints: ['shoulder', 'lower_back'],
    tier: 'intermediate',
    required_equipment: 'pull_up_bar',
    focus_tags: ['tva_core'],
    session_role: 'finisher',
    cues: 'Curl pelvis up toward ribs; lower without swinging.',
  },

  // OPTIONAL HOME EQUIPMENT: DUMBBELL
  {
    slug: 'dumbbell-fly',
    name: 'Dumbbell Floor Fly',
    pattern: 'push',
    rung_index: 10,
    bw_load_factor: 0.45,
    impact_level: 'low',
    unit: 'reps',
    contraindicated_joints: ['shoulder'],
    tier: 'foundation',
    required_equipment: 'dumbbell',
    required_dumbbell_count: 2,
    focus_tags: ['chest_lift'],
    session_role: 'accessory',
    cues: 'Elbows softly bent; open wide until triceps touch floor, squeeze chest up.',
  },
  {
    slug: 'standing-dumbbell-press',
    name: 'Standing Dumbbell Press',
    pattern: 'push',
    rung_index: 11,
    bw_load_factor: 0.55,
    impact_level: 'low',
    unit: 'reps',
    contraindicated_joints: ['shoulder', 'lower_back'],
    tier: 'intermediate',
    required_equipment: 'dumbbell',
    required_dumbbell_count: 2,
    focus_tags: ['v_taper', 'chest_lift'],
    session_role: 'primary',
    cues: 'Ribs stacked over hips; press dumbbell cleanly overhead.',
  },
  {
    slug: 'lateral-raise',
    name: 'Dumbbell Lateral Raise',
    pattern: 'push',
    rung_index: 12,
    bw_load_factor: 0.35,
    impact_level: 'low',
    unit: 'reps',
    contraindicated_joints: ['shoulder'],
    tier: 'foundation',
    required_equipment: 'dumbbell',
    required_dumbbell_count: 2,
    focus_tags: ['v_taper'],
    session_role: 'accessory',
    cues: 'Lead with elbows slightly forward to cap side delts.',
  },
  {
    slug: 'dumbbell-bent-over-row',
    name: 'Dumbbell Bent Over Row',
    pattern: 'pull',
    rung_index: 14,
    bw_load_factor: 0.55,
    impact_level: 'low',
    unit: 'reps',
    contraindicated_joints: ['lower_back'],
    tier: 'foundation',
    required_equipment: 'dumbbell',
    focus_tags: ['posture_pull', 'v_taper'],
    session_role: 'primary',
    cues: 'Hinge at hips with flat back; pull dumbbell toward hip.',
  },
  {
    slug: 'rear-delt-fly',
    name: 'Dumbbell Rear Delt Fly',
    pattern: 'pull',
    rung_index: 15,
    bw_load_factor: 0.35,
    impact_level: 'low',
    unit: 'reps',
    contraindicated_joints: ['shoulder', 'lower_back'],
    tier: 'foundation',
    required_equipment: 'dumbbell',
    required_dumbbell_count: 2,
    focus_tags: ['posture_pull', 'chest_lift'],
    session_role: 'accessory',
    cues: 'Hinge forward; sweep arms wide squeezing rear shoulders & upper back.',
  },
  {
    slug: 'dumbbell-glute-bridge',
    name: 'Dumbbell Glute Bridge',
    pattern: 'legs',
    rung_index: 15,
    bw_load_factor: 0.65,
    impact_level: 'low',
    unit: 'reps',
    contraindicated_joints: ['lower_back'],
    tier: 'foundation',
    required_equipment: 'dumbbell',
    focus_tags: ['glute_max'],
    session_role: 'primary',
    cues: 'Rest dumbbell on hip crease; drive through heels for hard lockout.',
  },
  {
    slug: 'dumbbell-hip-thrust',
    name: 'Dumbbell Hip Thrust',
    pattern: 'legs',
    rung_index: 16,
    bw_load_factor: 0.72,
    impact_level: 'low',
    unit: 'reps',
    contraindicated_joints: ['lower_back'],
    tier: 'intermediate',
    required_equipment: 'dumbbell',
    focus_tags: ['glute_max'],
    session_role: 'primary',
    cues: 'Chin tucked, ribs down; pause 1s at full glute lockout.',
  },
  {
    slug: 'dumbbell-romanian-deadlift',
    name: 'Dumbbell Romanian Deadlift',
    pattern: 'legs',
    rung_index: 17,
    bw_load_factor: 0.75,
    impact_level: 'low',
    unit: 'reps',
    contraindicated_joints: ['lower_back'],
    tier: 'intermediate',
    required_equipment: 'dumbbell',
    focus_tags: ['glute_max'],
    session_role: 'accessory',
    cues: 'Push hips straight back stretching glutes & hamstrings; flat back.',
  },
  {
    slug: 'goblet-squat',
    name: 'Goblet Squat',
    pattern: 'legs',
    rung_index: 18,
    bw_load_factor: 0.75,
    impact_level: 'low',
    unit: 'reps',
    contraindicated_joints: ['knee'],
    tier: 'intermediate',
    required_equipment: 'dumbbell',
    focus_tags: ['glute_max'],
    session_role: 'primary',
    cues: 'Hold dumbbell at chest; elbows inside knees at bottom.',
  },

  // GYM MODE EXERCISES (Free Mode -> Going to the Gym)
  {
    slug: 'incline-bench-press',
    name: 'Incline Barbell Press',
    pattern: 'push',
    rung_index: 20,
    bw_load_factor: 0.85,
    impact_level: 'low',
    unit: 'reps',
    contraindicated_joints: ['shoulder', 'elbow'],
    tier: 'intermediate',
    required_equipment: 'gym',
    focus_tags: ['chest_lift'],
    session_role: 'primary',
    cues: '30° bench angle directly builds clavicular upper-chest shelf.',
  },
  {
    slug: 'cable-fly',
    name: 'Cable Chest Fly',
    pattern: 'push',
    rung_index: 21,
    bw_load_factor: 0.55,
    impact_level: 'low',
    unit: 'reps',
    contraindicated_joints: ['shoulder'],
    tier: 'foundation',
    required_equipment: 'gym',
    focus_tags: ['chest_lift'],
    session_role: 'accessory',
    cues: 'Constant cable tension; sweep hands up & inward to lift pecs.',
  },
  {
    slug: 'cable-lateral-raise',
    name: 'Cable Lateral Raise',
    pattern: 'push',
    rung_index: 22,
    bw_load_factor: 0.40,
    impact_level: 'low',
    unit: 'reps',
    contraindicated_joints: ['shoulder'],
    tier: 'foundation',
    required_equipment: 'gym',
    focus_tags: ['v_taper'],
    session_role: 'accessory',
    cues: 'Smooth lateral arc for wide, capped side delts.',
  },
  {
    slug: 'face-pull',
    name: 'Cable Face Pull',
    pattern: 'pull',
    rung_index: 20,
    bw_load_factor: 0.45,
    impact_level: 'low',
    unit: 'reps',
    contraindicated_joints: ['shoulder'],
    tier: 'foundation',
    required_equipment: 'gym',
    focus_tags: ['posture_pull', 'chest_lift'],
    session_role: 'accessory',
    cues: 'Pull rope toward forehead, rotating thumbs back for upright posture.',
  },
  {
    slug: 'lat-pulldown',
    name: 'Lat Pulldown',
    pattern: 'pull',
    rung_index: 21,
    bw_load_factor: 0.75,
    impact_level: 'low',
    unit: 'reps',
    contraindicated_joints: ['shoulder'],
    tier: 'foundation',
    required_equipment: 'gym',
    focus_tags: ['v_taper', 'posture_pull'],
    session_role: 'primary',
    cues: 'Depress shoulders first, pull bar smoothly to upper chest.',
  },
  {
    slug: 'seated-row',
    name: 'Seated Cable Row',
    pattern: 'pull',
    rung_index: 22,
    bw_load_factor: 0.70,
    impact_level: 'low',
    unit: 'reps',
    contraindicated_joints: ['lower_back'],
    tier: 'foundation',
    required_equipment: 'gym',
    focus_tags: ['posture_pull', 'v_taper'],
    session_role: 'primary',
    cues: 'Chest tall; squeeze shoulder blades back to counteract rounded posture.',
  },
  {
    slug: 'hip-thrust',
    name: 'Barbell Hip Thrust',
    pattern: 'legs',
    rung_index: 20,
    bw_load_factor: 1.1,
    impact_level: 'low',
    unit: 'reps',
    contraindicated_joints: ['lower_back'],
    tier: 'intermediate',
    required_equipment: 'gym',
    focus_tags: ['glute_max'],
    session_role: 'primary',
    cues: 'Gold-standard horizontal glute overload; 1s hard squeeze at top.',
  },
  {
    slug: 'romanian-deadlift',
    name: 'Barbell Romanian Deadlift',
    pattern: 'legs',
    rung_index: 21,
    bw_load_factor: 1.0,
    impact_level: 'low',
    unit: 'reps',
    contraindicated_joints: ['lower_back'],
    tier: 'intermediate',
    required_equipment: 'gym',
    focus_tags: ['glute_max'],
    session_role: 'accessory',
    cues: 'Deep hip hinge stretching lower glutes and hamstrings.',
  },
  {
    slug: 'squat',
    name: 'Barbell Back Squat',
    pattern: 'legs',
    rung_index: 22,
    bw_load_factor: 1.05,
    impact_level: 'low',
    unit: 'reps',
    contraindicated_joints: ['knee', 'lower_back'],
    tier: 'intermediate',
    required_equipment: 'gym',
    focus_tags: ['glute_max'],
    session_role: 'primary',
    cues: 'Full depth below parallel maximizes glute stretch & growth.',
  },
  // CUSTOM SCIENCE-BACKED EXERCISES (bespoke 3-frame local SVGs in src/assets/custom-exercises)
  {
    slug: 'kegel-pelvic-bridge',
    name: 'Kegel Pelvic Bridge (Hold & Lift)',
    pattern: 'legs',
    rung_index: 2,
    bw_load_factor: 0.45,
    impact_level: 'low',
    unit: 'reps',
    contraindicated_joints: ['lower_back'],
    tier: 'foundation',
    focus_tags: ['pelvic_floor', 'glute_max'],
    session_role: 'primary',
    primaryMuscle: 'Glutes / Pelvic Floor',
    sourceEquipment: 'Bodyweight',
    cues: 'Exhale while drawing pelvic floor inward/upward, posteriorly tilt pelvis, then drive hips smoothly to a flat bridge.',
  },
  {
    slug: 'isometric-prayer-press',
    name: 'Isometric Prayer Press',
    pattern: 'push',
    rung_index: 3,
    bw_load_factor: 0.4,
    impact_level: 'low',
    unit: 'seconds',
    contraindicated_joints: ['shoulder'],
    tier: 'foundation',
    focus_tags: ['chest_lift'],
    session_role: 'accessory',
    primaryMuscle: 'Chest',
    sourceEquipment: 'Bodyweight',
    cues: 'Press palms inward continuously at sternal height with shoulders depressed to activate inner & clavicular pectorals.',
  },
  {
    slug: 'prone-cobra-lift',
    name: 'Prone Cobra Thoracic Lift',
    pattern: 'pull',
    rung_index: 1,
    bw_load_factor: 0.3,
    impact_level: 'low',
    unit: 'seconds',
    contraindicated_joints: ['lower_back'],
    tier: 'foundation',
    focus_tags: ['posture_pull', 'chest_lift'],
    session_role: 'accessory',
    primaryMuscle: 'Upper Back',
    sourceEquipment: 'Bodyweight',
    cues: 'Lift sternum gently off mat while rotating thumbs outward & upward, squeezing lower traps without shrugging.',
  },
  {
    slug: 'supine-floor-angel',
    name: 'Supine Floor Angel Slide',
    pattern: 'pull',
    rung_index: -1,
    bw_load_factor: 0.25,
    impact_level: 'low',
    unit: 'reps',
    contraindicated_joints: ['shoulder'],
    tier: 'foundation',
    focus_tags: ['warmup', 'posture_pull', 'chest_lift'],
    session_role: 'warmup',
    primaryMuscle: 'Upper Back',
    sourceEquipment: 'Bodyweight',
    cues: 'Keep lower back & ribs pressed flat into floor while gliding forearms slowly from W-position to overhead Y.',
  },
  {
    slug: 'b-stance-glute-bridge',
    name: 'B-Stance Glute Bridge',
    pattern: 'legs',
    rung_index: 5,
    bw_load_factor: 0.55,
    impact_level: 'low',
    unit: 'reps',
    contraindicated_joints: ['lower_back'],
    tier: 'intermediate',
    focus_tags: ['glute_max', 'pelvic_floor'],
    session_role: 'primary',
    primaryMuscle: 'Glutes',
    sourceEquipment: 'Bodyweight',
    cues: 'Keep 80% load through the flat working heel with the opposite kickstand heel light; keep hips square at lockout.',
  },
  {
    slug: 'rainbow-glute-arc',
    name: 'Quadruped Rainbow Glute Arc',
    pattern: 'legs',
    rung_index: 4,
    bw_load_factor: 0.4,
    impact_level: 'low',
    unit: 'reps',
    contraindicated_joints: ['wrist', 'knee'],
    tier: 'foundation',
    focus_tags: ['glute_med'],
    session_role: 'accessory',
    primaryMuscle: 'Glutes',
    sourceEquipment: 'Bodyweight',
    cues: 'Brace ribs down in tabletop and sweep one extended leg in a high rainbow arc across the midline to build upper glute shelf.',
  },
  {
    slug: 'tva-stomach-vacuum',
    name: 'TVA Stomach Vacuum Hold',
    pattern: 'core',
    rung_index: 1,
    bw_load_factor: 0.2,
    impact_level: 'low',
    unit: 'seconds',
    contraindicated_joints: ['wrist'],
    tier: 'foundation',
    focus_tags: ['tva_core', 'pelvic_floor'],
    session_role: 'finisher',
    primaryMuscle: 'Core',
    sourceEquipment: 'Bodyweight',
    cues: 'Exhale completely, then draw navel deep toward the spine without rounding upper back or holding breath.',
  },
  {
    slug: 'diaphragmatic-heel-tap',
    name: 'Diaphragmatic 90/90 Heel Tap',
    pattern: 'core',
    rung_index: 2,
    bw_load_factor: 0.35,
    impact_level: 'low',
    unit: 'reps',
    contraindicated_joints: [],
    tier: 'foundation',
    focus_tags: ['tva_core', 'pelvic_floor'],
    session_role: 'finisher',
    primaryMuscle: 'Core',
    sourceEquipment: 'Bodyweight',
    cues: 'Exhale to stabilize ribs and pelvic floor while slowly tapping one heel to the mat without arching your lower back.',
  },
  {
    slug: 'pseudo-planche-push-up',
    name: 'Pseudo-Planche Forward-Lean Push-Up',
    pattern: 'push',
    rung_index: 12,
    bw_load_factor: 0.85,
    impact_level: 'low',
    unit: 'reps',
    contraindicated_joints: ['wrist', 'shoulder', 'elbow'],
    tier: 'advanced',
    focus_tags: ['chest_lift', 'v_taper'],
    session_role: 'primary',
    primaryMuscle: 'Chest / Front Delts',
    sourceEquipment: 'Bodyweight',
    cues: 'Turn fingers slightly outward by waist level and keep shoulders leaned well ahead of wrists throughout descent and lockout.',
  },
  {
    slug: 'wrist-tendon-lean',
    name: 'Wrist & Forearm Tendon Lean Hold',
    pattern: 'push',
    rung_index: -1,
    bw_load_factor: 0.25,
    impact_level: 'low',
    unit: 'seconds',
    contraindicated_joints: ['wrist'],
    tier: 'foundation',
    focus_tags: ['tendon', 'warmup'],
    session_role: 'tendon',
    primaryMuscle: 'Wrists & Forearms',
    sourceEquipment: 'Bodyweight',
    cues: 'On all fours with fingers spread wide, lean shoulders slowly past wrists to a mild firm stretch and hold steady for 30–40s.',
  },
  {
    slug: 'isometric-split-squat-hold',
    name: 'Isometric Split-Squat Knee Hold',
    pattern: 'legs',
    rung_index: 3,
    bw_load_factor: 0.5,
    impact_level: 'low',
    unit: 'seconds',
    contraindicated_joints: ['knee'],
    tier: 'foundation',
    focus_tags: ['tendon', 'glute_max'],
    session_role: 'tendon',
    primaryMuscle: 'Knees / Quads Tendon',
    sourceEquipment: 'Bodyweight',
    cues: 'Lower into a comfortable split stance (~70° front knee bend) and hold completely still for 35–45s to thicken and strengthen knee tendons.',
  },
  {
    slug: 'eccentric-calf-lower',
    name: 'Slow Eccentric Achilles Heel Lower',
    pattern: 'legs',
    rung_index: 2,
    bw_load_factor: 0.45,
    impact_level: 'low',
    unit: 'reps',
    contraindicated_joints: [],
    tier: 'foundation',
    focus_tags: ['tendon'],
    session_role: 'tendon',
    primaryMuscle: 'Calves / Achilles Tendon',
    sourceEquipment: 'Bodyweight',
    cues: 'Rise high onto tiptoes smoothly, then lower your heels slowly over a full 4 seconds to strengthen your Achilles tendon.',
  },
  {
    slug: 'neck-thoracic-reset',
    name: 'Neck & Upper-Back Desk Reset',
    pattern: 'pull',
    rung_index: -1,
    bw_load_factor: 0.15,
    impact_level: 'low',
    unit: 'seconds',
    contraindicated_joints: [],
    tier: 'foundation',
    focus_tags: ['mobility', 'posture_pull', 'warmup'],
    session_role: 'mobility',
    primaryMuscle: 'Neck & Upper Back',
    sourceEquipment: 'Bodyweight',
    cues: 'Sit or stand tall: gently glide chin straight back, tilt ear slowly toward each shoulder, then open arms into a wide W to lift your chest.',
  },
  {
    slug: 'deep-squat-ankle-opener',
    name: 'Deep Squat & Ankle Mobility Hold',
    pattern: 'legs',
    rung_index: -1,
    bw_load_factor: 0.25,
    impact_level: 'low',
    unit: 'seconds',
    contraindicated_joints: ['knee'],
    tier: 'foundation',
    focus_tags: ['mobility', 'warmup'],
    session_role: 'mobility',
    primaryMuscle: 'Hips & Ankles',
    sourceEquipment: 'Bodyweight',
    cues: 'Sink as low as comfortable with flat heels (hold a doorframe if heels lift) and gently press knees apart with your elbows while keeping your chest tall.',
  },
  {
    slug: 'foot-arch-toe-spread',
    name: 'Foot Arch & Big-Toe Balance Prep',
    pattern: 'legs',
    rung_index: -1,
    bw_load_factor: 0.15,
    impact_level: 'low',
    unit: 'seconds',
    contraindicated_joints: [],
    tier: 'foundation',
    focus_tags: ['mobility', 'balance'],
    session_role: 'balance',
    primaryMuscle: 'Feet & Ankles',
    sourceEquipment: 'Bodyweight',
    cues: 'Barefoot if possible: spread toes wide, press your big toe and heel gently into the floor, and softly dome your foot arch upward without curling your toes.',
  },
  {
    slug: 'single-leg-balance-hold',
    name: 'Single-Leg Stability Hold',
    pattern: 'legs',
    rung_index: 0,
    bw_load_factor: 0.3,
    impact_level: 'low',
    unit: 'seconds',
    contraindicated_joints: [],
    tier: 'foundation',
    focus_tags: ['balance'],
    session_role: 'balance',
    primaryMuscle: 'Ankles, Hips & Balance',
    sourceEquipment: 'Bodyweight',
    cues: 'Stand tall on one foot with knee soft, lift the opposite knee to hip height, and keep hips level. To level up, gently close your eyes near a wall.',
  },
];

interface RawManifestEntry {
  slug: string;
  name: string;
  exerciseType: string;
  equipment: string;
  primaryMuscle: string;
  isStretch?: boolean;
}

function mapManifestPattern(primaryMuscle: string): MovementPattern {
  if (['Chest', 'Shoulders', 'Triceps'].includes(primaryMuscle)) return 'push';
  if (
    [
      'Back',
      'Lats',
      'Upper Back',
      'Rear Delts',
      'Biceps',
      'Forearms',
      'Lower Back',
      'Mobility',
    ].includes(primaryMuscle)
  ) {
    return 'pull';
  }
  if (
    [
      'Quads',
      'Glutes',
      'Hamstrings',
      'Posterior Chain',
      'Calves',
      'Legs',
      'Adductors',
      'Hips',
    ].includes(primaryMuscle)
  ) {
    return 'legs';
  }
  return 'core';
}

function mapManifestEquipment(
  slug: string,
  equipment: string,
): EquipmentRequirement | undefined {
  if (equipment === 'Dumbbell') return 'dumbbell';
  if (equipment === 'Pull-up Bar') return 'pull_up_bar';
  if (
    /^(walking|running|hiking|glute-bridge-march|jumping-jack|half-burpee|burpee|high-knees|skater-hop|lateral-shuffle|sprawl|seal-jack|mountain-climber|plank-jack)$/i.test(
      slug,
    )
  ) {
    return undefined;
  }
  if (equipment === 'Bodyweight') {
    if (/pull-up|chin-up|hanging/i.test(slug)) return 'pull_up_bar';
    if (
      /incline-push-up|decline-push-up|feet-elevated|bench-dip|step-up|box-squat|bulgarian-split-squat/i.test(
        slug,
      )
    ) {
      return 'chair_bench';
    }
    if (
      /dip|handstand|wall|nordic|inverted-row|ab-wheel|dragon-flag|copenhagen/i.test(
        slug,
      )
    ) {
      return 'gym';
    }
    return undefined;
  }
  return 'gym';
}

function mapManifestJoints(
  slug: string,
  primaryMuscle: string,
): Exclude<JointTag, 'none'>[] {
  const joints = new Set<Exclude<JointTag, 'none'>>();
  if (/push-up|plank|dip|burpee|handstand|bear|crab/i.test(slug)) joints.add('wrist');
  if (primaryMuscle === 'Shoulders' || /press|raise|fly|pull-up/i.test(slug)) {
    joints.add('shoulder');
  }
  if (primaryMuscle === 'Quads' || /squat|lunge|jump|knee/i.test(slug)) {
    joints.add('knee');
  }
  if (/deadlift|back-extension|superman|good-morning|row/i.test(slug)) {
    joints.add('lower_back');
  }
  if (/curl|extension|dip|pull-up|chin-up/i.test(slug)) {
    joints.add('elbow');
  }
  return Array.from(joints);
}

function mapManifestTags(entry: RawManifestEntry): {
  focus_tags: FocusTag[];
  session_role: SessionRole;
} {
  if (entry.isStretch || entry.primaryMuscle === 'Mobility' || entry.primaryMuscle === 'Hips') {
    return { focus_tags: ['warmup'], session_role: 'warmup' };
  }
  if (entry.primaryMuscle === 'Glutes' || entry.primaryMuscle === 'Hamstrings') {
    return {
      focus_tags: /abduction|clamshell|hydrant|curtsy|lateral/i.test(entry.slug)
        ? ['glute_med']
        : ['glute_max'],
      session_role: /kick|raise|abduction|clamshell|pump/i.test(entry.slug)
        ? 'accessory'
        : 'primary',
    };
  }
  if (entry.primaryMuscle === 'Chest') {
    return {
      focus_tags: ['chest_lift'],
      session_role: /fly|pec-deck/i.test(entry.slug) ? 'accessory' : 'primary',
    };
  }
  if (entry.primaryMuscle === 'Upper Back' || entry.primaryMuscle === 'Rear Delts') {
    return { focus_tags: ['posture_pull', 'chest_lift'], session_role: 'accessory' };
  }
  if (
    entry.primaryMuscle === 'Lats' ||
    entry.primaryMuscle === 'Shoulders' ||
    entry.primaryMuscle === 'Back'
  ) {
    return { focus_tags: ['v_taper'], session_role: 'primary' };
  }
  if (entry.primaryMuscle === 'Core') {
    return { focus_tags: ['tva_core'], session_role: 'finisher' };
  }
  if (entry.primaryMuscle === 'Cardio' || entry.primaryMuscle === 'Full Body' || entry.exerciseType === 'distance_duration') {
    return { focus_tags: ['cardio'], session_role: 'cardio' };
  }
  return { focus_tags: [], session_role: 'accessory' };
}

const curatedBySlug = new Map(CURATED_EXERCISES.map((ex) => [ex.slug, ex]));
const manifestSlugSet = new Set((rawManifest as RawManifestEntry[]).map((e) => e.slug));

const MANIFEST_MAPPED_EXERCISES: FloorExercise[] = (
  rawManifest as RawManifestEntry[]
).map((entry, idx) => {
  const curated = curatedBySlug.get(entry.slug);
  if (curated) {
    return {
      ...curated,
      primaryMuscle: entry.primaryMuscle,
      sourceEquipment: entry.equipment,
    };
  }

  const pattern = mapManifestPattern(entry.primaryMuscle);
  const requiredEquipment = mapManifestEquipment(entry.slug, entry.equipment);
  const unit: ExerciseUnit =
    entry.exerciseType === 'duration' ||
    entry.exerciseType === 'distance_duration' ||
    entry.isStretch ||
    /hold|plank|stretch|hang|sit|carry|pose/i.test(entry.slug)
      ? 'seconds'
      : 'reps';
  const impactLevel: ImpactLevel =
    /jump|hop|burpee|sprawl|explosive|fast-feet|high-knees|skater-hop|mountain-climber|plank-jack|seal-jack|lateral-shuffle|squat-thrust/i.test(
      entry.slug,
    )
      ? 'explosive'
      : 'low';
  const { focus_tags, session_role } = mapManifestTags(entry);

  return {
    slug: entry.slug,
    name: entry.name,
    pattern,
    rung_index: session_role === 'warmup' ? -1 : 30 + idx,
    bw_load_factor: requiredEquipment === 'gym' ? 0.8 : requiredEquipment === 'dumbbell' ? 0.65 : 0.55,
    impact_level: impactLevel,
    unit,
    contraindicated_joints: mapManifestJoints(entry.slug, entry.primaryMuscle),
    tier: 'intermediate',
    required_equipment: requiredEquipment,
    focus_tags,
    session_role,
    primaryMuscle: entry.primaryMuscle,
    sourceEquipment: entry.equipment,
    cues: `${entry.name} targeting ${entry.primaryMuscle} (${entry.equipment}). Control both eccentric and concentric phases.`,
  };
});

export const FLOOR_EXERCISE_ALLOWLIST: FloorExercise[] = [
  ...MANIFEST_MAPPED_EXERCISES,
  ...CURATED_EXERCISES.filter((ex) => !manifestSlugSet.has(ex.slug)),
];

export const ALLOWLIST_BY_SLUG: Record<string, FloorExercise> = Object.fromEntries(
  FLOOR_EXERCISE_ALLOWLIST.map((ex) => [ex.slug, ex]),
);

function isJointSafe(ex: FloorExercise, jointRestrictions: JointTag[]): boolean {
  const active = jointRestrictions.filter((j) => j !== 'none') as Exclude<JointTag, 'none'>[];
  return !ex.contraindicated_joints.some((j) => active.includes(j));
}

export function isEquipmentCompatible(
  ex: FloorExercise,
  availableEquipment: EquipmentItem[] = [],
  includeGym = false,
  dumbbellCount = 1,
): boolean {
  if (!ex.required_equipment) return true;
  if (ex.required_equipment === 'gym') return includeGym;
  if (!availableEquipment.includes(ex.required_equipment)) return false;
  if (ex.required_equipment === 'dumbbell' && (ex.required_dumbbell_count ?? 1) > dumbbellCount) {
    return false;
  }
  return true;
}

export function getLadderForPattern(
  pattern: MovementPattern,
  availableEquipment: EquipmentItem[] = [],
  includeGym = false,
  dumbbellCount = 1,
): FloorExercise[] {
  return FLOOR_EXERCISE_ALLOWLIST.filter(
    (ex) =>
      ex.pattern === pattern &&
      ex.rung_index >= 0 &&
      isEquipmentCompatible(ex, availableEquipment, includeGym, dumbbellCount),
  ).sort((a, b) => a.rung_index - b.rung_index);
}

export function getTierRepresentative(pattern: MovementPattern, tier: StartingTier): FloorExercise {
  const ladder = getLadderForPattern(pattern);
  const matching = ladder.filter((ex) => ex.tier === tier && ex.impact_level === 'low');
  if (matching.length > 0) return matching[0];
  return ladder[0];
}

export function resolveSafeExercise(
  slug: string,
  quietHotelMode: boolean,
  jointRestrictions: JointTag[],
  availableEquipment: EquipmentItem[] = [],
  includeGym = false,
  bodyFocus: BodyFocus = 'balanced',
  dumbbellCount = 1,
): FloorExercise {
  const base = ALLOWLIST_BY_SLUG[slug] ?? FLOOR_EXERCISE_ALLOWLIST[2];
  let candidate = base;

  if (includeGym) {
    const gymMatch = FLOOR_EXERCISE_ALLOWLIST.find(
      (ex) =>
        ex.pattern === base.pattern &&
        ex.required_equipment === 'gym' &&
        isJointSafe(ex, jointRestrictions) &&
        (bodyFocus === 'chest_lift_posture'
          ? ex.focus_tags?.includes('chest_lift') || ex.focus_tags?.includes('posture_pull')
          : bodyFocus === 'glute_sculpt'
            ? ex.focus_tags?.includes('glute_max')
            : true),
    );
    if (gymMatch) candidate = gymMatch;
  } else if (availableEquipment.length > 0) {
    const equipMatch = FLOOR_EXERCISE_ALLOWLIST.find(
      (ex) =>
        ex.pattern === base.pattern &&
        ex.required_equipment &&
        ex.required_equipment !== 'gym' &&
        isEquipmentCompatible(ex, availableEquipment, false, dumbbellCount) &&
        isJointSafe(ex, jointRestrictions),
    );
    if (equipMatch) {
      candidate = equipMatch;
    }
  }

  if (quietHotelMode && candidate.impact_level === 'explosive' && candidate.quiet_substitute_slug) {
    candidate = ALLOWLIST_BY_SLUG[candidate.quiet_substitute_slug] ?? candidate;
  }

  if (!isJointSafe(candidate, jointRestrictions)) {
    const ladder = getLadderForPattern(candidate.pattern, availableEquipment, includeGym, dumbbellCount);
    const safeAlt = ladder.find(
      (ex) => (!quietHotelMode || ex.impact_level === 'low') && isJointSafe(ex, jointRestrictions),
    );
    if (safeAlt) return safeAlt;
  }

  return candidate;
}

export interface SessionBlock {
  id: string;
  role: SessionRole;
  roleLabel: string;
  pattern: MovementPattern;
  exercise: FloorExercise;
  sets: number;
  min_target: number;
  max_target: number;
  unit: ExerciseUnit;
  rest_seconds: number;
  tempo: string;
  why: string;
}

function pickBySlugOrSafe(
  preferredSlugs: string[],
  pattern: MovementPattern,
  profile: UserProfile,
  quietMode: boolean,
  includeGym: boolean,
  variationSeed = 0,
  usedSlugs: Set<string> = new Set(),
): FloorExercise {
  const equip = profile.available_equipment ?? [];
  const dbCount = profile.dumbbell_count ?? 1;
  const validCandidates: FloorExercise[] = [];
  for (const slug of preferredSlugs) {
    const ex = ALLOWLIST_BY_SLUG[slug];
    if (!ex) continue;
    if (quietMode && ex.impact_level === 'explosive') continue;
    if (!isJointSafe(ex, profile.joint_restrictions)) continue;
    if (isEquipmentCompatible(ex, equip, includeGym, dbCount)) {
      validCandidates.push(ex);
    }
  }
  const unusedValid = validCandidates.filter((ex) => !usedSlugs.has(ex.slug));
  if (unusedValid.length > 0) {
    return unusedValid[Math.abs(variationSeed) % unusedValid.length];
  }
  if (validCandidates.length > 0) {
    return validCandidates[Math.abs(variationSeed) % validCandidates.length];
  }
  const ladder = getLadderForPattern(pattern, equip, includeGym);
  const safeLadder = ladder.filter((ex) => isJointSafe(ex, profile.joint_restrictions));
  const unusedSafe = safeLadder.filter((ex) => !usedSlugs.has(ex.slug));
  if (unusedSafe.length > 0) {
    return unusedSafe[Math.abs(variationSeed) % unusedSafe.length];
  }
  if (safeLadder.length > 0) {
    return safeLadder[Math.abs(variationSeed) % safeLadder.length];
  }
  return ladder[0] ?? FLOOR_EXERCISE_ALLOWLIST[0];
}

export function buildSessionBlocksForDay(
  patterns: MovementPattern[],
  config: ProgramConfig,
  profile: UserProfile,
  overrides: Record<string, string> = {},
  variationSeed = 0,
): SessionBlock[] {
  const quietMode = profile.quiet_hotel_mode || config.global_modifiers.quiet_hotel_mode;
  const includeGym = profile.active_location === 'gym';
  const bodyFocus = profile.body_focus ?? 'balanced';
  const blocks: SessionBlock[] = [];
  const usedSlugs = new Set<string>();

  const isLowerFocused =
    patterns.includes('legs') || bodyFocus === 'glute_sculpt' || bodyFocus === 'pelvic_sexual_health';
  const baseRest =
    profile.biological_sex === 'female' &&
    (profile.primary_goal === 'hypertrophy' || profile.primary_goal === 'conditioning')
      ? Math.max(45, (config.movement_tracks[patterns[0]]?.prescription.rest_seconds ?? 75) - 15)
      : config.movement_tracks[patterns[0]]?.prescription.rest_seconds ?? 90;

  // 1. Warm-Up & Activation (rotates via variationSeed)
  const warmupPool =
    profile.posture_focus === 'rounded_shoulders' || !isLowerFocused
      ? ['supine-floor-angel', 'cat-cow-stretch', 'arm-circles', 'torso-twist-stretch', 'cross-body-shoulder-stretch', 'childs-pose']
      : ['worlds-greatest-stretch', 'leg-swings-stretch', 'butterfly-stretch', 'kneeling-hip-flexor-stretch', 'cat-cow-stretch'];
  const warmupEx =
    overrides['warmup'] && ALLOWLIST_BY_SLUG[overrides['warmup']]
      ? ALLOWLIST_BY_SLUG[overrides['warmup']]
      : pickBySlugOrSafe(warmupPool, 'pull', profile, quietMode, includeGym, variationSeed, usedSlugs);
  usedSlugs.add(warmupEx.slug);

  blocks.push({
    id: 'warmup',
    role: 'warmup',
    roleLabel: 'Warm-Up & Activation',
    pattern: warmupEx.pattern,
    exercise: warmupEx,
    sets: 1,
    min_target: warmupEx.unit === 'reps' ? 8 : 30,
    max_target: warmupEx.unit === 'reps' ? 12 : 45,
    unit: warmupEx.unit,
    rest_seconds: 30,
    tempo: '3-1-2-0',
    why:
      profile.posture_focus === 'rounded_shoulders'
        ? 'Opens thoracic spine & lifts chest before pressing.'
        : 'Primes hip mobility and stabilizes joints before loading.',
  });

  // 2. Primary Compound(s) for today's active patterns
  patterns.forEach((pattern, idx) => {
    const track = config.movement_tracks[pattern];
    if (!track) return;
    const overrideSlug = overrides[`primary_${pattern}`];
    let ex: FloorExercise;
    if (overrideSlug && ALLOWLIST_BY_SLUG[overrideSlug]) {
      ex = ALLOWLIST_BY_SLUG[overrideSlug];
    } else if (pattern === 'legs' && bodyFocus === 'pelvic_sexual_health') {
      ex = pickBySlugOrSafe(
        includeGym
          ? ['kegel-pelvic-bridge', 'b-stance-glute-bridge', 'hip-thrust', 'glute-bridge', 'curtsy-lunge']
          : ['kegel-pelvic-bridge', 'b-stance-glute-bridge', 'glute-bridge', 'single-leg-glute-bridge', 'curtsy-lunge'],
        'legs',
        profile,
        quietMode,
        includeGym,
        variationSeed + idx,
        usedSlugs,
      );
    } else if (pattern === 'legs' && (bodyFocus === 'glute_sculpt' || bodyFocus === 'hourglass_sculpt')) {
      ex = pickBySlugOrSafe(
        includeGym
          ? ['hip-thrust', 'b-stance-glute-bridge', 'squat', 'romanian-deadlift', 'bulgarian-split-squat', 'leg-press', 'single-leg-glute-bridge']
          : [
              'b-stance-glute-bridge',
              'dumbbell-hip-thrust',
              'dumbbell-glute-bridge',
              'dumbbell-sumo-squat',
              'single-leg-glute-bridge',
              'glute-bridge',
              'curtsy-lunge',
              'bodyweight-squat',
              'cossack-squat',
            ],
        'legs',
        profile,
        quietMode,
        includeGym,
        variationSeed + idx,
        usedSlugs,
      );
    } else if (
      pattern === 'push' &&
      (bodyFocus === 'chest_lift_posture' ||
        bodyFocus === 'hourglass_sculpt' ||
        bodyFocus === 'upper_hypertrophy')
    ) {
      ex = pickBySlugOrSafe(
        includeGym
          ? ['incline-bench-press', 'cable-fly', 'isometric-prayer-press', 'pec-deck', 'dumbbell-bench-press', 'push-up']
          : bodyFocus === 'upper_hypertrophy'
            ? ['diamond-push-up', 'pseudo-planche-push-up', 'wide-push-up', 'push-up', 'hindu-push-up', 'archer-push-up', 'standing-dumbbell-press']
            : ['wide-push-up', 'isometric-prayer-press', 'push-up', 'hindu-push-up', 'knee-push-up'],
        'push',
        profile,
        quietMode,
        includeGym,
        variationSeed + idx,
        usedSlugs,
      );
    } else if (pattern === 'pull' && (bodyFocus === 'v_taper' || bodyFocus === 'strength_skills')) {
      ex = pickBySlugOrSafe(
        includeGym
          ? ['lat-pulldown', 'seated-row', 'assisted-pull-up', 'face-pull', 'barbell-row', 'prone-cobra-lift']
          : ['pull-up', 'chin-up', 'dumbbell-bent-over-row', 'one-arm-dumbbell-row', 'prone-cobra-lift', 'reverse-snow-angel', 'prone-y-raise', 'superman'],
        'pull',
        profile,
        quietMode,
        includeGym,
        variationSeed + idx,
        usedSlugs,
      );
    } else {
      const ladderPool = getLadderForPattern(
        pattern,
        profile.available_equipment ?? [],
        includeGym,
      )
        .filter((item) => (!quietMode || item.impact_level === 'low') && isJointSafe(item, profile.joint_restrictions))
        .map((item) => item.slug);
      const unusedLadder = ladderPool.filter((slug) => !usedSlugs.has(slug));
      const candidatePool = unusedLadder.length > 0 ? unusedLadder : ladderPool;
      const fallbackEx = resolveSafeExercise(
        track.active_slug,
        quietMode,
        profile.joint_restrictions,
        profile.available_equipment ?? [],
        includeGym,
        bodyFocus,
      );
      ex =
        variationSeed > 0 && candidatePool.length > 0
          ? ALLOWLIST_BY_SLUG[candidatePool[variationSeed % candidatePool.length]]
          : usedSlugs.has(fallbackEx.slug) && candidatePool.length > 0
            ? ALLOWLIST_BY_SLUG[candidatePool[0]]
            : fallbackEx;
    }

    usedSlugs.add(ex.slug);

    blocks.push({
      id: `primary_${pattern}`,
      role: idx === 0 ? 'primary' : 'accessory',
      roleLabel: idx === 0 ? 'Primary Compound' : `Secondary (${pattern.toUpperCase()})`,
      pattern,
      exercise: ex,
      sets: track.prescription.sets,
      min_target: ex.unit === 'seconds' ? 30 : track.prescription.min_target,
      max_target: ex.unit === 'seconds' ? 45 : track.prescription.max_target,
      unit: ex.unit,
      rest_seconds: baseRest,
      tempo: track.prescription.tempo,
      why:
        bodyFocus === 'pelvic_sexual_health' && pattern === 'legs'
          ? 'Integrates pelvic-floor contraction & hip-extensor drive for blood flow and tone.'
          : pattern === 'legs' && bodyFocus === 'glute_sculpt'
            ? 'Peak horizontal glute tension at lockout for lift & fullness.'
            : pattern === 'push' && bodyFocus === 'chest_lift_posture'
              ? 'Builds upper/mid pectoral shelf beneath the chest line.'
              : `Core strength & progressive overload on ${pattern} pattern.`,
    });
  });

  // 3. Targeted Sculpt / Posture Accessory (when duration >= 20 min)
  if (profile.session_duration_minutes >= 20) {
    let accEx: FloorExercise;
    let whyAcc: string;
    if (bodyFocus === 'pelvic_sexual_health') {
      accEx = pickBySlugOrSafe(
        ['b-stance-glute-bridge', 'rainbow-glute-arc', 'clamshell', 'prone-cobra-lift', 'side-lying-hip-abduction'],
        'legs',
        profile,
        quietMode,
        includeGym,
        variationSeed,
        usedSlugs,
      );
      whyAcc = 'Stabilizes pelvic alignment, adductors & posterior glute-pelvic synergy.';
    } else if (patterns.includes('legs') && (bodyFocus === 'glute_sculpt' || bodyFocus === 'hourglass_sculpt')) {
      accEx = pickBySlugOrSafe(
        includeGym
          ? ['romanian-deadlift', 'rainbow-glute-arc', 'bulgarian-split-squat', 'leg-curl', 'curtsy-lunge', 'fire-hydrant']
          : [
              'dumbbell-romanian-deadlift',
              'rainbow-glute-arc',
              'b-stance-glute-bridge',
              'dumbbell-curtsy-lunge',
              'single-leg-romanian-deadlift',
              'curtsy-lunge',
              'fire-hydrant',
              'donkey-kick',
              'side-lying-hip-abduction',
              'clamshell',
              'hip-airplane',
            ],
        'legs',
        profile,
        quietMode,
        includeGym,
        variationSeed,
        usedSlugs,
      );
      whyAcc = 'Targets stretched glute tie-in & outer gluteus medius shelf.';
    } else if (bodyFocus === 'chest_lift_posture' || profile.posture_focus === 'rounded_shoulders') {
      accEx = pickBySlugOrSafe(
        includeGym
          ? ['prone-cobra-lift', 'face-pull', 'reverse-pec-deck', 'isometric-prayer-press', 'cable-fly', 'prone-y-raise']
          : ['prone-cobra-lift', 'isometric-prayer-press', 'supine-floor-angel', 'prone-y-raise', 'rear-delt-fly', 'prone-t-raise', 'reverse-snow-angel', 'dumbbell-fly', 'scapular-push-up'],
        'pull',
        profile,
        quietMode,
        includeGym,
        variationSeed,
        usedSlugs,
      );
      whyAcc = 'Retracts shoulders & lifts sternum for immediate chest posture lift.';
    } else if (bodyFocus === 'v_taper' || bodyFocus === 'upper_hypertrophy') {
      accEx = pickBySlugOrSafe(
        includeGym
          ? ['cable-lateral-raise', 'arnold-press', 'isometric-prayer-press', 'lateral-raise', 'bicep-curl']
          : ['pseudo-planche-push-up', 'isometric-prayer-press', 'lateral-raise', 'arnold-press', 'bicep-curl', 'hammer-curl', 'tricep-kickback', 'diamond-push-up', 'pike-push-up'],
        'push',
        profile,
        quietMode,
        includeGym,
        variationSeed,
        usedSlugs,
      );
      whyAcc =
        bodyFocus === 'upper_hypertrophy'
          ? 'Adds upper-body volume for chest, triceps & shoulder fullness.'
          : 'Emphasizes lateral delts & front shoulder cap for wider V-taper.';
    } else {
      accEx = pickBySlugOrSafe(
        includeGym
          ? ['prone-cobra-lift', 'face-pull', 'seated-row', 'reverse-pec-deck']
          : ['prone-cobra-lift', 'prone-t-raise', 'prone-y-raise', 'curtsy-lunge', 'reverse-snow-angel', 'lying-hamstring-walkout'],
        'pull',
        profile,
        quietMode,
        includeGym,
        variationSeed,
        usedSlugs,
      );
      whyAcc = 'Balances pushing volume with posterior-chain stability.';
    }

    if (overrides['accessory'] && ALLOWLIST_BY_SLUG[overrides['accessory']]) {
      accEx = ALLOWLIST_BY_SLUG[overrides['accessory']];
    }
    usedSlugs.add(accEx.slug);

    blocks.push({
      id: 'accessory',
      role: 'accessory',
      roleLabel: 'Targeted Sculpt',
      pattern: accEx.pattern,
      exercise: accEx,
      sets: 2,
      min_target: accEx.unit === 'seconds' ? 30 : 12,
      max_target: accEx.unit === 'seconds' ? 45 : 18,
      unit: accEx.unit,
      rest_seconds: Math.max(45, baseRest - 15),
      tempo: '2-1-1-0',
      why: whyAcc,
    });
  }

  // 4. Burnout / TVA Finisher
  const finEx =
    overrides['finisher'] && ALLOWLIST_BY_SLUG[overrides['finisher']]
      ? ALLOWLIST_BY_SLUG[overrides['finisher']]
      : bodyFocus === 'pelvic_sexual_health' || bodyFocus === 'core_waist_sculpt'
        ? pickBySlugOrSafe(
            ['tva-stomach-vacuum', 'diaphragmatic-heel-tap', 'dead-bug', 'reverse-crunch', 'hollow-body-hold'],
            'core',
            profile,
            quietMode,
            includeGym,
            variationSeed,
            usedSlugs,
          )
        : patterns.includes('legs') && (bodyFocus === 'glute_sculpt' || bodyFocus === 'hourglass_sculpt')
          ? pickBySlugOrSafe(
              ['frog-pump', 'rainbow-glute-arc', 'glute-bridge-march', 'side-lying-leg-raise', 'clamshell'],
              'legs',
              profile,
              quietMode,
              includeGym,
              variationSeed,
              usedSlugs,
            )
          : pickBySlugOrSafe(
              ['diaphragmatic-heel-tap', 'tva-stomach-vacuum', 'reverse-crunch', 'dead-bug', 'flutter-kick', 'hollow-body-hold', 'lying-leg-raise', 'plank-shoulder-tap', 'bird-dog', 'heel-tap'],
              'core',
              profile,
              quietMode,
              includeGym,
              variationSeed,
              usedSlugs,
            );
  usedSlugs.add(finEx.slug);

  blocks.push({
    id: 'finisher',
    role: 'finisher',
    roleLabel: 'Metabolic Finisher',
    pattern: finEx.pattern,
    exercise: finEx,
    sets: 2,
    min_target: finEx.unit === 'seconds' ? 30 : 15,
    max_target: finEx.unit === 'seconds' ? 45 : 25,
    unit: finEx.unit,
    rest_seconds: 45,
    tempo: '2-0-1-0',
    why:
      finEx.slug === 'frog-pump' || finEx.pattern === 'legs'
        ? 'High-rep shortened-range glute pump for metabolic hypertrophy.'
        : 'Deep Transverse Abdominis (TVA) & pelvic-floor coordination without waist bulk.',
  });

  // 5. Optional Tendon Armor Block (30-45s static isometrics or slow 4s eccentrics)
  if (profile.include_tendon_prep || overrides['tendon']) {
    const tendonPool = isLowerFocused
      ? ['isometric-split-squat-hold', 'eccentric-calf-lower']
      : ['wrist-tendon-lean', 'prone-cobra-lift', 'scapular-push-up'];
    const tendonEx =
      overrides['tendon'] && ALLOWLIST_BY_SLUG[overrides['tendon']]
        ? ALLOWLIST_BY_SLUG[overrides['tendon']]
        : pickBySlugOrSafe(
            tendonPool,
            isLowerFocused ? 'legs' : 'push',
            profile,
            true,
            includeGym,
            variationSeed,
            usedSlugs,
          );
    usedSlugs.add(tendonEx.slug);

    blocks.push({
      id: 'tendon',
      role: 'tendon',
      roleLabel: 'Tendon Armor',
      pattern: tendonEx.pattern,
      exercise: tendonEx,
      sets: 2,
      min_target: tendonEx.unit === 'seconds' ? 35 : 10,
      max_target: tendonEx.unit === 'seconds' ? 45 : 12,
      unit: tendonEx.unit,
      rest_seconds: 45,
      tempo: tendonEx.unit === 'seconds' ? '3-1-2-0' : '4-1-2-0',
      why: isLowerFocused
        ? 'Steady holds & slow lowering thicken knee and Achilles tendons so joints stay pain-free.'
        : 'Steady isometric loading strengthens wrist, elbow & shoulder tendons that adapt slower than muscle.',
    });
  }

  // 6. Optional Smart Cardio Finisher (zone-2 / vascular / HIIT based on quiet mode & goal)
  if (profile.include_cardio_finisher || bodyFocus === 'pelvic_sexual_health' || overrides['cardio']) {
    const cardioPool = includeGym
      ? ['cycling', 'treadmill-incline-walk', 'rowing', 'elliptical', 'stair-climber', 'assault-bike']
      : quietMode || bodyFocus === 'pelvic_sexual_health' || profile.joint_restrictions.some((j) => j !== 'none')
        ? ['glute-bridge-march', 'walking', 'hiking']
        : ['jumping-jack', 'mountain-climber', 'seal-jack', 'skater-hop', 'high-knees', 'half-burpee', 'glute-bridge-march'];
    const cardioEx =
      overrides['cardio'] && ALLOWLIST_BY_SLUG[overrides['cardio']]
        ? ALLOWLIST_BY_SLUG[overrides['cardio']]
        : pickBySlugOrSafe(cardioPool, 'core', profile, quietMode, includeGym, variationSeed, usedSlugs);
    usedSlugs.add(cardioEx.slug);

    blocks.push({
      id: 'cardio',
      role: 'cardio',
      roleLabel: bodyFocus === 'pelvic_sexual_health' ? 'Pelvic Blood-Flow Cardio' : 'Cardio Finisher',
      pattern: cardioEx.pattern,
      exercise: cardioEx,
      sets: 2,
      min_target: 45,
      max_target: 60,
      unit: 'seconds',
      rest_seconds: 30,
      tempo: '1-0-1-0',
      why:
        bodyFocus === 'pelvic_sexual_health'
          ? 'Elevates nitric-oxide vascular circulation & pelvic endurance without post-lift interference.'
          : 'Brief post-lift aerobic finisher for heart health & conditioning without blunting muscle growth.',
    });
  }

  return blocks;
}

export function buildRestDayCardioMobilityBlocks(
  profile: UserProfile,
  variationSeed = 0,
): SessionBlock[] {
  const quietMode = profile.quiet_hotel_mode;
  const includeGym = profile.active_location === 'gym';
  const used = new Set<string>();

  const mobility = pickBySlugOrSafe(
    ['supine-floor-angel', 'cat-cow-stretch', 'worlds-greatest-stretch', 'butterfly-stretch'],
    'pull',
    profile,
    quietMode,
    includeGym,
    variationSeed,
    used,
  );
  used.add(mobility.slug);

  const zone2 = pickBySlugOrSafe(
    includeGym
      ? ['cycling', 'treadmill-incline-walk', 'elliptical', 'rowing']
      : ['glute-bridge-march', 'walking', 'hiking', 'seal-jack'],
    'legs',
    profile,
    true, // keep rest-day cardio strictly low-impact so CNS & joints stay fresh
    includeGym,
    variationSeed,
    used,
  );
  used.add(zone2.slug);

  const parasymp = pickBySlugOrSafe(
    ['tva-stomach-vacuum', 'diaphragmatic-heel-tap', 'childs-pose'],
    'core',
    profile,
    true,
    includeGym,
    variationSeed,
    used,
  );

  return [
    {
      id: 'rest_mobility',
      role: 'warmup',
      roleLabel: 'Rest-Day Mobility',
      pattern: mobility.pattern,
      exercise: mobility,
      sets: 1,
      min_target: 45,
      max_target: 60,
      unit: 'seconds',
      rest_seconds: 20,
      tempo: '3-1-2-0',
      why: 'Restores joint range of motion and thoracic posture on recovery days.',
    },
    {
      id: 'rest_cardio',
      role: 'cardio',
      roleLabel: 'Zone-2 Active Cardio',
      pattern: zone2.pattern,
      exercise: zone2,
      sets: 3,
      min_target: 60,
      max_target: 90,
      unit: 'seconds',
      rest_seconds: 30,
      tempo: '1-0-1-0',
      why: 'Steady conversational pace boosts capillary blood flow & clears soreness without fatigue.',
    },
    {
      id: 'rest_pelvic_breath',
      role: 'finisher',
      roleLabel: 'Diaphragm & Pelvic Reset',
      pattern: parasymp.pattern,
      exercise: parasymp,
      sets: 2,
      min_target: 35,
      max_target: 45,
      unit: 'seconds',
      rest_seconds: 25,
      tempo: '4-1-4-1',
      why: 'Down-regulates cortisol and restores pelvic floor resting elasticity.',
    },
  ];
}

/**
 * 4-5 minute zero-equipment Mobility & Desk Reset flow covering the four
 * everyday stiffness zones: Neck/Upper Back, Thoracic Spine, Hips/Ankles, and Feet.
 */
export function buildMobilityFlowBlocks(
  profile: UserProfile,
  variationSeed = 0,
): SessionBlock[] {
  const used = new Set<string>();

  const neckEx = ALLOWLIST_BY_SLUG['neck-thoracic-reset'];
  used.add(neckEx.slug);

  const spineEx = pickBySlugOrSafe(
    ['cat-cow-stretch', 'supine-floor-angel', 'childs-pose'],
    'pull',
    profile,
    true,
    false,
    variationSeed,
    used,
  );
  used.add(spineEx.slug);

  const hipAnkleEx = pickBySlugOrSafe(
    ['deep-squat-ankle-opener', 'worlds-greatest-stretch', 'butterfly-stretch'],
    'legs',
    profile,
    true,
    false,
    variationSeed,
    used,
  );
  used.add(hipAnkleEx.slug);

  const footEx = ALLOWLIST_BY_SLUG['foot-arch-toe-spread'];
  used.add(footEx.slug);

  return [
    {
      id: 'mob_neck',
      role: 'mobility',
      roleLabel: 'Neck & Posture Reset',
      pattern: neckEx.pattern,
      exercise: neckEx,
      sets: 1,
      min_target: 45,
      max_target: 60,
      unit: 'seconds',
      rest_seconds: 15,
      tempo: '3-1-3-0',
      why: 'Releases phone/desk stiffness across neck muscles and opens a tight upper chest.',
    },
    {
      id: 'mob_spine',
      role: 'mobility',
      roleLabel: 'Upper-Back & Spine',
      pattern: spineEx.pattern,
      exercise: spineEx,
      sets: 1,
      min_target: spineEx.unit === 'reps' ? 8 : 45,
      max_target: spineEx.unit === 'reps' ? 10 : 60,
      unit: spineEx.unit,
      rest_seconds: 15,
      tempo: '3-1-3-0',
      why: 'Restores thoracic mobility so your shoulders and lower back move pain-free.',
    },
    {
      id: 'mob_hips',
      role: 'mobility',
      roleLabel: 'Deep Hips & Ankles',
      pattern: hipAnkleEx.pattern,
      exercise: hipAnkleEx,
      sets: 1,
      min_target: 45,
      max_target: 60,
      unit: 'seconds',
      rest_seconds: 15,
      tempo: '3-1-3-0',
      why: 'Opens tight hips and stiff ankles for effortless squatting, walking, and stair climbing.',
    },
    {
      id: 'mob_feet',
      role: 'mobility',
      roleLabel: 'Foot Foundation',
      pattern: footEx.pattern,
      exercise: footEx,
      sets: 1,
      min_target: 40,
      max_target: 50,
      unit: 'seconds',
      rest_seconds: 15,
      tempo: '2-2-2-0',
      why: 'Wakes up intrinsic foot arch muscles ("the foot core") that stabilize knees and posture.',
    },
  ];
}

/**
 * 3-minute Balance & Athletic Pop flow preserving neuromuscular stability
 * (Araujo et al., 2022 BJSM) and fast-twitch power (Reid & Fielding, 2012).
 * Automatically adapts to Quiet Mode / joint safety without jarring jumps.
 */
export function buildBalancePowerFlowBlocks(
  profile: UserProfile,
  variationSeed = 0,
): SessionBlock[] {
  const quietOrJointSafe =
    profile.quiet_hotel_mode ||
    profile.joint_restrictions.some((j) => j === 'knee' || j === 'lower_back');
  const used = new Set<string>();

  const footEx = ALLOWLIST_BY_SLUG['foot-arch-toe-spread'];
  used.add(footEx.slug);

  const balanceEx = ALLOWLIST_BY_SLUG['single-leg-balance-hold'];
  used.add(balanceEx.slug);

  const powerPool = quietOrJointSafe
    ? ['glute-bridge', 'bodyweight-squat', 'standing-calf-raise']
    : ['jump-squat', 'skater-hop', 'jumping-jack', 'bodyweight-squat'];

  const powerEx = pickBySlugOrSafe(
    powerPool,
    'legs',
    profile,
    quietOrJointSafe,
    false,
    variationSeed,
    used,
  );

  return [
    {
      id: 'bal_foot',
      role: 'balance',
      roleLabel: 'Foot Grounding',
      pattern: footEx.pattern,
      exercise: footEx,
      sets: 1,
      min_target: 30,
      max_target: 40,
      unit: 'seconds',
      rest_seconds: 15,
      tempo: '2-2-2-0',
      why: 'Activates foot arch sensors so your ankle and hip balance reflex fires faster.',
    },
    {
      id: 'bal_single_leg',
      role: 'balance',
      roleLabel: 'Single-Leg Stability',
      pattern: balanceEx.pattern,
      exercise: balanceEx,
      sets: 2,
      min_target: 25,
      max_target: 35,
      unit: 'seconds',
      rest_seconds: 20,
      tempo: '1-1-1-0',
      why: 'Strengthens ankle & hip stabilizers; single-leg balance is a top clinical marker of healthy aging.',
    },
    {
      id: 'bal_power',
      role: 'balance',
      roleLabel: quietOrJointSafe ? 'Quiet Crisp Power' : 'Athletic Power Pop',
      pattern: powerEx.pattern,
      exercise: powerEx,
      sets: 2,
      min_target: 6,
      max_target: 8,
      unit: 'reps',
      rest_seconds: 45,
      tempo: '2-0-1-0',
      why: quietOrJointSafe
        ? 'Stand/squeeze as crisply and quickly as possible with zero jumping — preserves fast-twitch power safely.'
        : 'Short crisp explosive reps with generous rest preserve fast-twitch speed fibers that fade twice as fast as strength.',
    },
  ];
}

export function getAlternativeExercisesForSlot(
  current: FloorExercise,
  profile: UserProfile,
): FloorExercise[] {
  const includeGym = profile.active_location === 'gym';
  const equip = profile.available_equipment ?? [];
  const dbCount = profile.dumbbell_count ?? 1;
  const quietMode = profile.quiet_hotel_mode;
  return FLOOR_EXERCISE_ALLOWLIST.filter(
    (ex) =>
      ex.slug !== current.slug &&
      ex.pattern === current.pattern &&
      (!quietMode || ex.impact_level === 'low') &&
      isJointSafe(ex, profile.joint_restrictions) &&
      isEquipmentCompatible(ex, equip, includeGym, dbCount),
  ).slice(0, 40);
}

export const HOUSEHOLD_WEIGHT_PRESETS = [
  { label: '1.5L Water Bottle', kg: 1.5 },
  { label: 'Water Gallon / Jug', kg: 5 },
  { label: 'Loaded Backpack', kg: 10 },
  { label: 'Dumbbell', kg: 15 },
] as const;

export function isUnilateralExercise(ex: FloorExercise): boolean {
  return /single-leg|single-arm|one-arm|side-plank|curtsy-lunge|b-stance|rainbow-glute-arc|fire-hydrant|donkey-kick|clamshell|side-lying|cossack|pistol|archer|split-squat|hip-airplane|lunge|kickback|bird-dog/i.test(
    ex.slug,
  );
}

export function getHouseholdToolTip(
  ex: FloorExercise,
  dumbbellKg?: number | null,
): string | null {
  if (ex.required_equipment === 'dumbbell') {
    if (dumbbellKg && dumbbellKg <= 2.5) {
      return `No dumbbell? Use a filled 1.5L–2L water bottle (~${dumbbellKg} kg) or canned goods in a tote bag.`;
    }
    if (dumbbellKg && dumbbellKg <= 6) {
      return `No dumbbell? Hold a 4–5L water gallon or laundry detergent jug (~${dumbbellKg} kg) securely by the handle.`;
    }
    return `No dumbbell? Fill a sturdy backpack with books or water bottles (~${dumbbellKg ?? 8} kg) and grip the top handle/straps.`;
  }
  if (ex.required_equipment === 'chair_bench') {
    return 'Use a sturdy dining chair, sofa edge, or bed frame pressed firmly against a wall so it cannot slide.';
  }
  if (ex.required_equipment === 'pull_up_bar') {
    return 'Use a doorway pull-up bar, sturdy playground bar, or a secure door-anchor strap.';
  }
  return null;
}

export function formatReadableTempo(tempo: string): string {
  const parts = tempo.split('-').map(Number);
  if (parts.length !== 4 || parts.some(Number.isNaN)) return '2s down · 1s hold · 2s up';
  const [ecc, bot, con, top] = parts;
  const segments: string[] = [];
  if (ecc > 0) segments.push(`${ecc}s down`);
  if (bot > 0) segments.push(`${bot}s hold`);
  if (con > 0) segments.push(`${con}s up`);
  if (top > 0) segments.push(`${top}s pause`);
  return segments.join(' · ') || 'Controlled pace';
}

export function getSessionEquipmentChecklist(
  blocks: SessionBlock[],
  dumbbellKg?: number | null,
): string {
  const needsWeight = blocks.some((b) => b.exercise.required_equipment === 'dumbbell');
  const needsChair = blocks.some((b) => b.exercise.required_equipment === 'chair_bench');
  const needsBar = blocks.some((b) => b.exercise.required_equipment === 'pull_up_bar');
  const needsGym = blocks.some((b) => b.exercise.required_equipment === 'gym');

  const items: string[] = [];
  if (needsGym) items.push('Gym machines / cables');
  if (needsWeight) {
    const label =
      dumbbellKg && dumbbellKg <= 6
        ? `1 weight (~${dumbbellKg} kg water gallon or dumbbell)`
        : `1 weight (~${dumbbellKg ?? 8} kg loaded backpack or dumbbell)`;
    items.push(label);
  }
  if (needsChair) items.push('Sturdy chair or sofa edge');
  if (needsBar) items.push('Pull-up bar');

  if (items.length === 0) return 'Just clear floor space (or a yoga mat) — zero gear needed.';
  return `Grab before starting: ${items.join(' + ')}.`;
}
