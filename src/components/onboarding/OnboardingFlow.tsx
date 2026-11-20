import { useState } from 'react';
import {
  ArrowRight,
  BookOpenCheck,
  Bot,
  Check,
  ChevronLeft,
  ChevronRight,
  Dumbbell,
  Play,
  Ruler,
  ShieldAlert,
  Sparkles,
  User,
  WifiOff,
} from 'lucide-react';
import { HOUSEHOLD_WEIGHT_PRESETS } from '../../data/exerciseCatalog';
import type { TapeZoneId } from '../../engine/bodyMetrics';
import { DAY_NAMES, generateRecommendedWeeklyPlan, getGoalsForSex } from '../../engine/planBuilder';
import type {
  AgeBracket,
  BiologicalSex,
  BodyFocus,
  BodyMetricEntry,
  EquipmentItem,
  JointTag,
  StartingTier,
  UserProfile,
} from '../../types/schemas';
import { BodyMeasurementGuideSvg } from '../common/BodyMeasurementGuideSvg';

interface OnboardingFlowProps {
  initialProfile?: UserProfile;
  onComplete: (
    profile: UserProfile,
    action: 'skip_calibration' | 'run_calibration',
    initialBodyMetric: Omit<BodyMetricEntry, 'id'>,
  ) => void;
}

const JOINTS: Array<{ id: JointTag; label: string }> = [
  { id: 'none', label: 'None' },
  { id: 'wrist', label: 'Wrist' },
  { id: 'shoulder', label: 'Shoulder' },
  { id: 'elbow', label: 'Elbow' },
  { id: 'knee', label: 'Knee' },
  { id: 'lower_back', label: 'Lower Back' },
];

const TIERS: Array<{ id: StartingTier; label: string; desc: string }> = [
  { id: 'foundation', label: 'Foundation', desc: 'Beginner-friendly leverage' },
  { id: 'intermediate', label: 'Intermediate', desc: 'Standard bodyweight & home gear' },
  { id: 'advanced', label: 'Advanced', desc: 'Unilateral & high tension' },
];

const INTRO_SLIDES = [
  {
    badge: '100% Offline · Zero Subscriptions',
    title: 'Fitness Guidance That Works Without Internet',
    description:
      '318 animated exercises covering strength, tendon armor, mobility, balance, breathwork, cardio, and pelvic floor — all running privately on your device using floor space or everyday items like a water jug or chair.',
    highlights: [
      'Works in airplanes, gyms, parks, or bedrooms with zero Wi-Fi',
      'Built-in 72-hour muscle recovery guard & 5-second prep countdowns',
      'Zero paid paywalls — your data stays completely yours',
    ],
    icon: WifiOff,
  },
  {
    badge: 'Evidence-Based · 15 Peer-Reviewed Studies',
    title: 'Every Exercise & Rule Curated From Latest Research',
    description:
      'Nothing in Prime is random influencer fluff. Every rep range, rest timer, tendon hold, breath pattern, and metric ratio is built directly on 15 peer-reviewed sports science & clinical frameworks.',
    highlights: [
      'Strength & Hypertrophy: Schoenfeld, ACSM, NSCA & Hunter/Ansdell recovery norms',
      'Tendons, Mobility & Longevity: Baar tendon holds, Araujo 10s balance & Stanford sighs',
      'Body Composition & Fuel: Ashwell WHtR (<0.50), Morton 1.6g/kg protein & full citations in Settings',
    ],
    icon: BookOpenCheck,
  },
  {
    badge: '2 Free Ways · Zero Paid Subscriptions',
    title: 'Use Free Gemini as Your AI Coach & Fitness Assessor',
    description:
      'Prime runs your daily workouts on autopilot — and whenever you want smart upgrades or a full body progress grade, connect Free Gemini in 2 ways: via the Gemini App / Web (zero key) or 1-Tap Automatic In-App Gemini using a free API key.',
    highlights: [
      'Include your own notes or joint complaints before sending to Gemini',
      'Way 1 (No Key): 1-tap Share to Gemini App or Copy & Open Gemini',
      'Way 2 (Free API Key): 1-tap auto-runs Gemini, shows its reply in-app & updates your plan automatically',
    ],
    icon: Bot,
  },
  {
    badge: 'Whole-Body Prime Condition',
    title: 'Built Around Your Exact Body (Metric)',
    description:
      'Enter your real details once — Prime calculates your exact daily protein & hydration targets, calibrates rest timers for your physiology, and tracks all 6 physical pillars over time.',
    highlights: [
      'Strength · Mobility · Balance · Heart · Breath · Core',
      'Monthly weight reminders & optional guided tape measurements (cm)',
      '100% private — your data stays on your device or your own Google Drive',
    ],
    icon: Sparkles,
  },
];

function parseOptionalCm(val: string): number | null {
  const n = Number(val);
  if (!val.trim() || !Number.isFinite(n) || n <= 0 || n > 300) return null;
  return Math.round(n * 10) / 10;
}

export function OnboardingFlow({ initialProfile, onComplete }: OnboardingFlowProps) {
  // Stage 0 = Welcome Splash, 1 = 3-Slide App Intro, 2..6 = Setup Steps (5 numbered steps)
  const [stage, setStage] = useState<'welcome' | 'intro' | 'setup'>('welcome');
  const [introIdx, setIntroIdx] = useState(0);
  const [step, setStep] = useState(1); // 1: Essentials, 2: Goal, 3: Schedule/Gear, 4: Optional Measurements, 5: Ready

  // Step 1: Mandatory Essentials
  const [userName, setUserName] = useState<string>(initialProfile?.user_name ?? '');
  const [biologicalSex, setBiologicalSex] = useState<BiologicalSex>(
    initialProfile?.biological_sex ?? 'female',
  );
  const [ageBracket, setAgeBracket] = useState<AgeBracket>(initialProfile?.age_bracket ?? '18_29');
  const [bodyweightKg, setBodyweightKg] = useState<string>(
    initialProfile?.bodyweight_kg ? String(initialProfile.bodyweight_kg) : '',
  );
  const [heightCm, setHeightCm] = useState<string>(
    initialProfile?.height_cm ? String(initialProfile.height_cm) : '',
  );
  const [validationError, setValidationError] = useState<string | null>(null);

  // Step 2: Goal
  const [bodyFocus, setBodyFocus] = useState<BodyFocus>(
    initialProfile?.body_focus ?? (biologicalSex === 'female' ? 'glute_sculpt' : 'v_taper'),
  );

  // Step 3: Schedule, Duration, Equipment & Joints
  const [daysPerWeek, setDaysPerWeek] = useState<number>(initialProfile?.days_per_week ?? 4);
  const [duration, setDuration] = useState<number>(initialProfile?.session_duration_minutes ?? 25);
  const [availableEquipment, setAvailableEquipment] = useState<EquipmentItem[]>(
    initialProfile?.available_equipment ?? [],
  );
  const [dumbbellKg, setDumbbellKg] = useState<string>(
    initialProfile?.dumbbell_kg ? String(initialProfile.dumbbell_kg) : '5',
  );
  const [jointRestrictions, setJointRestrictions] = useState<JointTag[]>(
    initialProfile?.joint_restrictions ?? ['none'],
  );

  // Step 4: Optional Day-1 Metric Tape Measurements (cm)
  const [activeTapeZone, setActiveTapeZone] = useState<TapeZoneId>('waist');
  const [neckCm, setNeckCm] = useState('');
  const [shouldersCm, setShouldersCm] = useState('');
  const [chestCm, setChestCm] = useState('');
  const [waistCm, setWaistCm] = useState('');
  const [hipsCm, setHipsCm] = useState('');
  const [armLeftCm, setArmLeftCm] = useState('');
  const [armRightCm, setArmRightCm] = useState('');
  const [thighLeftCm, setThighLeftCm] = useState('');
  const [thighRightCm, setThighRightCm] = useState('');

  // Step 5: Starting Level
  const [startingTier, setStartingTier] = useState<StartingTier>(
    initialProfile?.starting_tier ?? 'intermediate',
  );

  const sexGoals = getGoalsForSex(biologicalSex);
  const selectedGoalMeta = sexGoals.find((g) => g.id === bodyFocus) ?? sexGoals[0];

  const parsedWeight = Number(bodyweightKg);
  const parsedHeight = Number(heightCm);
  const essentialsValid =
    userName.trim().length > 0 &&
    Number.isFinite(parsedWeight) &&
    parsedWeight >= 30 &&
    parsedWeight <= 300 &&
    Number.isFinite(parsedHeight) &&
    parsedHeight >= 100 &&
    parsedHeight <= 250;

  const handleSelectSex = (sex: BiologicalSex) => {
    setBiologicalSex(sex);
    const goalsForSex = getGoalsForSex(sex);
    if (!goalsForSex.some((g) => g.id === bodyFocus)) {
      setBodyFocus(goalsForSex[0].id);
    }
  };

  const toggleEquipment = (item: EquipmentItem) => {
    setAvailableEquipment((prev) =>
      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item],
    );
  };

  const toggleJoint = (tag: JointTag) => {
    if (tag === 'none') {
      setJointRestrictions(['none']);
      return;
    }
    const clean = jointRestrictions.filter((j) => j !== 'none');
    const next = clean.includes(tag) ? clean.filter((j) => j !== tag) : [...clean, tag];
    setJointRestrictions(next.length === 0 ? ['none'] : next);
  };

  const handleStep1Next = () => {
    if (!userName.trim()) {
      setValidationError('Please enter your name to personalize Prime.');
      return;
    }
    if (!Number.isFinite(parsedWeight) || parsedWeight < 30 || parsedWeight > 300) {
      setValidationError('Please enter your current weight in kg (30–300 kg).');
      return;
    }
    if (!Number.isFinite(parsedHeight) || parsedHeight < 100 || parsedHeight > 250) {
      setValidationError('Please enter your height in cm (100–250 cm).');
      return;
    }
    setValidationError(null);
    setStep(2);
  };

  const finishOnboarding = (action: 'skip_calibration' | 'run_calibration') => {
    const today = new Date().toISOString().slice(0, 10);
    const parsedDb = dumbbellKg.trim() ? Number(dumbbellKg) : null;
    const finalWeight = Math.round(parsedWeight * 10) / 10;
    const finalHeight = Math.round(parsedHeight);

    const profile: UserProfile = {
      user_name: userName.trim(),
      biological_sex: biologicalSex,
      age_bracket: ageBracket,
      posture_focus: selectedGoalMeta.defaultPostureFocus,
      body_focus: selectedGoalMeta.id,
      training_mode: 'curated',
      preferred_workout_time: '18:00',
      active_location: 'home_calisthenics',
      primary_goal: selectedGoalMeta.defaultPrimaryGoal,
      days_per_week: daysPerWeek,
      session_duration_minutes: duration,
      pacing_mode: 'strict_time_cap',
      cue_style: 'audio_and_vibrate',
      zero_equipment_only: true,
      quiet_hotel_mode: false,
      joint_restrictions: jointRestrictions,
      available_equipment: availableEquipment,
      dumbbell_kg:
        availableEquipment.includes('dumbbell') && parsedDb && !Number.isNaN(parsedDb) && parsedDb > 0
          ? parsedDb
          : null,
      starting_tier: startingTier,
      upper_starting_tier: startingTier,
      lower_starting_tier: startingTier,
      bodyweight_kg: finalWeight,
      height_cm: finalHeight,
      last_weight_updated_at: today,
      include_cardio_finisher: selectedGoalMeta.id === 'pelvic_sexual_health',
      include_tendon_prep: false,
      kegel_level: 'foundation',
      kegel_reminder_enabled: true,
      kegel_reminder_times: ['10:30', '15:00', '20:30'],
      tour_completed: false,
      calibrated: false,
      onboarding_version: 2,
      updated_at: today,
    };

    const initialBodyMetric: Omit<BodyMetricEntry, 'id'> = {
      date: today,
      created_at: new Date().toISOString(),
      weight_kg: finalWeight,
      neck_cm: parseOptionalCm(neckCm),
      shoulders_cm: parseOptionalCm(shouldersCm),
      chest_cm: parseOptionalCm(chestCm),
      waist_cm: parseOptionalCm(waistCm),
      hips_cm: parseOptionalCm(hipsCm),
      arm_left_cm: parseOptionalCm(armLeftCm),
      arm_right_cm: parseOptionalCm(armRightCm),
      thigh_left_cm: parseOptionalCm(thighLeftCm),
      thigh_right_cm: parseOptionalCm(thighRightCm),
      notes: 'Day-1 Starting Baseline',
    };

    onComplete(profile, action, initialBodyMetric);
  };

  // STAGE 0: Flagship Out-of-Box Animated Welcome Screen
  if (stage === 'welcome') {
    return (
      <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-between bg-gradient-to-b from-[#041416] via-[#06282a] to-[#041214] px-6 py-12 text-center text-white">
        <div className="pt-4 text-[11px] font-bold uppercase tracking-[0.26em] text-teal-300/90">
          Prime Physical Coach
        </div>

        <div className="flex flex-col items-center space-y-6">
          <div className="relative flex items-center justify-center">
            <span className="prime-ring-pulse absolute h-32 w-32 rounded-[30px] bg-teal-400/20" />
            <img
              src="/icon.svg"
              alt="Prime Logo"
              className="prime-logo-pop relative h-24 w-24 rounded-3xl shadow-2xl shadow-black/50"
            />
          </div>

          <div className="prime-fade-up space-y-2.5">
            <h1 className="font-display text-3xl font-extrabold tracking-tight text-white">
              Welcome to Prime
            </h1>
            <p className="mx-auto max-w-xs text-sm leading-relaxed text-teal-100/85">
              Reach your prime condition across strength, tendons, mobility, balance, heart, and
              calm — 100% offline.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <button
            type="button"
            onClick={() => setStage('intro')}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-teal-500 to-cyan-500 py-4 text-sm font-extrabold text-slate-950 shadow-lg shadow-teal-500/25 transition active:scale-[0.98] hover:brightness-105"
          >
            Get Started
            <ArrowRight className="h-4 w-4" />
          </button>
          <p className="text-[11px] text-teal-200/60">
            Takes ~45 seconds · Works completely offline
          </p>
        </div>
      </div>
    );
  }

  // STAGE 1: 3-Card Brief Introduction (Offline Guidance + Free Gemini Coach & Assessor + Whole Body)
  if (stage === 'intro') {
    const slide = INTRO_SLIDES[introIdx];
    const SlideIcon = slide.icon;

    return (
      <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-between bg-slate-50 px-5 py-8 text-slate-900">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/icon.svg" alt="Prime" className="h-7 w-7 rounded-lg shadow-xs" />
            <span className="font-display text-sm font-extrabold text-slate-900">Prime</span>
          </div>
          <button
            type="button"
            onClick={() => setStage('setup')}
            className="text-xs font-bold text-blue-700 hover:underline"
          >
            Skip Intro
          </button>
        </div>

        <div key={introIdx} className="prime-tab-enter my-auto space-y-5 py-6">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-600 to-cyan-600 text-white shadow-lg shadow-teal-600/20">
            <SlideIcon className="h-8 w-8" />
          </div>

          <div className="space-y-2">
            <span className="inline-block rounded-full bg-blue-50 px-3 py-1 text-[11px] font-bold text-blue-700 border border-blue-200">
              {slide.badge}
            </span>
            <h1 className="font-display text-2xl font-extrabold leading-tight text-slate-900">
              {slide.title}
            </h1>
            <p className="text-sm leading-relaxed text-slate-600">{slide.description}</p>
          </div>

          <div className="space-y-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
            {slide.highlights.map((item) => (
              <div key={item} className="flex items-start gap-2.5 text-xs text-slate-700">
                <div className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700">
                  <Check className="h-2.5 w-2.5 stroke-[3]" />
                </div>
                <span className="leading-relaxed">{item}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-center gap-2">
            {INTRO_SLIDES.map((_, idx) => (
              <button
                key={idx}
                type="button"
                aria-label={`Slide ${idx + 1}`}
                onClick={() => setIntroIdx(idx)}
                className={`h-2 rounded-full transition-all ${
                  idx === introIdx ? 'w-7 bg-blue-600' : 'w-2 bg-slate-300'
                }`}
              />
            ))}
          </div>

          <div className="flex gap-2.5">
            {introIdx > 0 && (
              <button
                type="button"
                onClick={() => setIntroIdx((i) => i - 1)}
                className="flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-sm font-semibold text-slate-700"
              >
                <ChevronLeft className="h-4 w-4" />
                Back
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                if (introIdx < INTRO_SLIDES.length - 1) {
                  setIntroIdx((i) => i + 1);
                } else {
                  setStage('setup');
                }
              }}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-blue-600 py-3.5 text-sm font-bold text-white shadow-md hover:bg-blue-700"
            >
              {introIdx < INTRO_SLIDES.length - 1 ? 'Next' : 'Set Up My Profile'}
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // STAGE 2: Setup Wizard (5 Clean Steps)
  const previewSplit = generateRecommendedWeeklyPlan(
    selectedGoalMeta.defaultPrimaryGoal,
    daysPerWeek,
    duration,
    selectedGoalMeta.id,
  );
  const liveProteinMin =
    Number.isFinite(parsedWeight) && parsedWeight >= 30
      ? Math.round(parsedWeight * (biologicalSex === 'female' ? 1.5 : 1.6))
      : null;
  const liveWaterL =
    Number.isFinite(parsedWeight) && parsedWeight >= 30
      ? Number(((parsedWeight * 35) / 1000).toFixed(1))
      : null;

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-between bg-slate-50 px-5 py-7 text-slate-900">
      <div>
        {/* Step Progress Indicator */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/icon.svg" alt="Prime" className="h-6 w-6 rounded-md" />
            <span className="text-xs font-bold uppercase tracking-wider text-blue-700">
              Setup · Step {step} of 5
            </span>
          </div>
          <div className="flex gap-1.5">
            {[1, 2, 3, 4, 5].map((n) => (
              <div
                key={n}
                className={`h-1.5 w-7 rounded-full transition-colors ${
                  n <= step ? 'bg-blue-600' : 'bg-slate-200'
                }`}
              />
            ))}
          </div>
        </div>

        {/* STEP 1: Mandatory Personal Essentials (Name, Gender, Weight kg, Height cm) */}
        {step === 1 && (
          <div className="prime-tab-enter space-y-4">
            <div>
              <h1 className="font-display text-2xl font-bold text-slate-900">
                Tell Prime About You
              </h1>
              <p className="mt-1 text-xs leading-relaxed text-slate-600">
                Required so Prime can calibrate exact metric targets (protein, hydration, rest
                times, and health ratios) from Day 1.
              </p>
            </div>

            <div>
              <label className="text-xs font-semibold uppercase text-slate-600">
                Your Name <span className="text-rose-600">*</span>
              </label>
              <div className="relative mt-1">
                <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="e.g. Alex"
                  value={userName}
                  onChange={(e) => {
                    setUserName(e.target.value);
                    setValidationError(null);
                  }}
                  className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-9 pr-3 text-sm text-slate-900 shadow-xs outline-none focus:border-blue-600"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold uppercase text-slate-600">
                Gender / Physiology <span className="text-rose-600">*</span>
              </label>
              <div className="mt-1.5 grid grid-cols-2 gap-2.5">
                {(['female', 'male'] as BiologicalSex[]).map((sex) => (
                  <button
                    key={sex}
                    type="button"
                    onClick={() => handleSelectSex(sex)}
                    className={`rounded-xl border px-3 py-3 text-center text-sm font-bold capitalize transition ${
                      biologicalSex === sex
                        ? 'border-blue-600 bg-blue-600 text-white shadow-sm'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {sex}
                  </button>
                ))}
              </div>
              <p className="mt-1 text-[11px] text-slate-500">
                Calibrates rest timers, strength norms, body-composition formulas, and goal focus.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold uppercase text-slate-600">
                  Weight (kg) <span className="text-rose-600">*</span>
                </label>
                <input
                  type="number"
                  inputMode="decimal"
                  min={30}
                  max={300}
                  placeholder="e.g. 68"
                  value={bodyweightKg}
                  onChange={(e) => {
                    setBodyweightKg(e.target.value);
                    setValidationError(null);
                  }}
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-semibold text-slate-900 shadow-xs outline-none focus:border-blue-600"
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase text-slate-600">
                  Height (cm) <span className="text-rose-600">*</span>
                </label>
                <input
                  type="number"
                  inputMode="numeric"
                  min={100}
                  max={250}
                  placeholder="e.g. 172"
                  value={heightCm}
                  onChange={(e) => {
                    setHeightCm(e.target.value);
                    setValidationError(null);
                  }}
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-semibold text-slate-900 shadow-xs outline-none focus:border-blue-600"
                />
              </div>
            </div>

            {liveProteinMin && liveWaterL && (
              <div className="rounded-xl border border-blue-200 bg-blue-50/80 px-3 py-2 text-[11px] text-blue-900">
                <strong>Instant Metric Preview:</strong> Daily recovery baseline ready →{' '}
                <strong>{liveProteinMin}g+ protein</strong> &amp;{' '}
                <strong>{liveWaterL} L water/day</strong>.
              </div>
            )}

            <div>
              <label className="text-xs font-semibold uppercase text-slate-600">Age Group</label>
              <div className="mt-1.5 grid grid-cols-4 gap-1.5">
                {(
                  [
                    ['18_29', '18–29'],
                    ['30_39', '30–39'],
                    ['40_49', '40–49'],
                    ['50_plus', '50+'],
                  ] as Array<[AgeBracket, string]>
                ).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setAgeBracket(id)}
                    className={`rounded-xl border py-2 text-xs font-bold transition ${
                      ageBracket === id
                        ? 'border-blue-600 bg-blue-600 text-white'
                        : 'border-slate-200 bg-white text-slate-700'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {validationError && (
              <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">
                {validationError}
              </p>
            )}
          </div>
        )}

        {/* STEP 2: Single Primary Goal */}
        {step === 2 && (
          <div className="prime-tab-enter space-y-4">
            <div>
              <h1 className="font-display text-2xl font-bold text-slate-900">
                What Is Your Goal, {userName.trim()}?
              </h1>
              <p className="mt-1 text-xs text-slate-600">
                Pick one focus — Prime handles rep ranges, rest times, and posture pairing
                automatically.
              </p>
            </div>

            <div className="space-y-2.5">
              {sexGoals.map((goal) => {
                const active = selectedGoalMeta.id === goal.id;
                return (
                  <button
                    key={goal.id}
                    type="button"
                    onClick={() => setBodyFocus(goal.id)}
                    className={`w-full rounded-xl border p-3.5 text-left transition shadow-xs ${
                      active
                        ? 'border-blue-600 bg-blue-50 text-blue-950 ring-1 ring-blue-600'
                        : 'border-slate-200 bg-white text-slate-800 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-bold">{goal.label}</span>
                      {active && <Check className="h-4 w-4 shrink-0 text-blue-600" />}
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-slate-600">{goal.summary}</p>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* STEP 3: Weekly Schedule, Duration, Gear & Joints */}
        {step === 3 && (
          <div className="prime-tab-enter space-y-5">
            <div>
              <h1 className="font-display text-2xl font-bold text-slate-900">
                Schedule &amp; Equipment
              </h1>
              <p className="mt-1 text-xs text-slate-600">
                You can train at Home or switch to Gym with 1 tap anytime.
              </p>
            </div>

            <div>
              <label className="text-xs font-semibold uppercase text-slate-600">
                Workout Days Per Week
              </label>
              <div className="mt-2 grid grid-cols-5 gap-2">
                {[3, 4, 5, 6, 7].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDaysPerWeek(d)}
                    className={`rounded-xl border py-2.5 text-sm font-bold ${
                      daysPerWeek === d
                        ? 'border-blue-600 bg-blue-600 text-white shadow-sm'
                        : 'border-slate-200 bg-white text-slate-700'
                    }`}
                  >
                    {d}d
                  </button>
                ))}
              </div>
              <div className="mt-2 flex gap-1 overflow-x-auto pb-1">
                {previewSplit.map((d, i) => (
                  <div
                    key={d.day}
                    className={`shrink-0 rounded-lg border px-2 py-1 text-center text-[10px] font-semibold ${
                      d.focus.includes('rest')
                        ? 'border-slate-200 bg-slate-100 text-slate-500'
                        : 'border-blue-200 bg-blue-50 text-blue-700'
                    }`}
                  >
                    <div>{DAY_NAMES[i]}</div>
                    <div className="uppercase opacity-80">
                      {d.focus.includes('rest') ? 'Rest' : d.focus.join('+')}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold uppercase text-slate-600">
                Session Length
              </label>
              <div className="mt-2 grid grid-cols-4 gap-2">
                {[15, 20, 25, 30].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setDuration(m)}
                    className={`rounded-xl border py-2 text-xs font-bold ${
                      duration === m
                        ? 'border-blue-600 bg-blue-600 text-white'
                        : 'border-slate-200 bg-white text-slate-700'
                    }`}
                  >
                    {m} min
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center gap-1.5 text-xs font-semibold uppercase text-slate-600">
                <Dumbbell className="h-3.5 w-3.5 text-blue-600" />
                Household Items or Gear Nearby (Optional)
              </div>
              <p className="mt-0.5 text-[11px] text-slate-500">
                No dumbbell? Use a 5L water gallon (~5 kg) or a backpack loaded with books (~10 kg).
              </p>
              <div className="mt-2 grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => toggleEquipment('dumbbell')}
                  className={`rounded-xl border p-2.5 text-left ${
                    availableEquipment.includes('dumbbell')
                      ? 'border-blue-600 bg-blue-50 text-blue-900'
                      : 'border-slate-200 bg-white text-slate-600'
                  }`}
                >
                  <div className="text-xs font-bold">Weight / Jug</div>
                  <div className="text-[10px] opacity-75">Bottle, jug, bag</div>
                </button>
                <button
                  type="button"
                  onClick={() => toggleEquipment('chair_bench')}
                  className={`rounded-xl border p-2.5 text-left ${
                    availableEquipment.includes('chair_bench')
                      ? 'border-blue-600 bg-blue-50 text-blue-900'
                      : 'border-slate-200 bg-white text-slate-600'
                  }`}
                >
                  <div className="text-xs font-bold">Chair / Sofa</div>
                  <div className="text-[10px] opacity-75">Sturdy edge</div>
                </button>
                <button
                  type="button"
                  onClick={() => toggleEquipment('pull_up_bar')}
                  className={`rounded-xl border p-2.5 text-left ${
                    availableEquipment.includes('pull_up_bar')
                      ? 'border-blue-600 bg-blue-50 text-blue-900'
                      : 'border-slate-200 bg-white text-slate-600'
                  }`}
                >
                  <div className="text-xs font-bold">Pull-up Bar</div>
                  <div className="text-[10px] opacity-75">Doorway bar</div>
                </button>
              </div>
              {availableEquipment.includes('dumbbell') && (
                <div className="mt-2 space-y-2 rounded-xl border border-blue-100 bg-blue-50/50 p-2.5">
                  <div className="flex flex-wrap gap-1.5">
                    {HOUSEHOLD_WEIGHT_PRESETS.map((preset) => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => setDumbbellKg(String(preset.kg))}
                        className={`rounded-lg border px-2 py-1 text-[10px] font-semibold ${
                          Number(dumbbellKg) === preset.kg
                            ? 'border-blue-600 bg-blue-600 text-white'
                            : 'border-slate-200 bg-white text-slate-600'
                        }`}
                      >
                        {preset.label} (~{preset.kg}kg)
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-[11px] font-semibold text-slate-700">
                      Estimated Weight (kg):
                    </label>
                    <input
                      type="number"
                      inputMode="decimal"
                      min={1}
                      max={200}
                      value={dumbbellKg}
                      onChange={(e) => setDumbbellKg(e.target.value)}
                      className="w-20 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-center text-xs font-bold text-slate-900"
                    />
                  </div>
                </div>
              )}
            </div>

            <div>
              <div className="flex items-center gap-1.5 text-xs font-semibold uppercase text-slate-600">
                <ShieldAlert className="h-3.5 w-3.5 text-blue-600" />
                Sensitive Joints to Protect
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {JOINTS.map((j) => (
                  <button
                    key={j.id}
                    type="button"
                    onClick={() => toggleJoint(j.id)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
                      jointRestrictions.includes(j.id)
                        ? 'border-blue-600 bg-blue-50 text-blue-700'
                        : 'border-slate-200 bg-white text-slate-600'
                    }`}
                  >
                    {j.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* STEP 4: Optional Day-1 Tape Measurements (cm) with Visual Diagram */}
        {step === 4 && (
          <div className="prime-tab-enter space-y-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-1.5 text-xs font-bold uppercase text-blue-700">
                  <Ruler className="h-3.5 w-3.5" />
                  Optional Day-1 Snapshot (cm)
                </div>
                <h1 className="mt-0.5 font-display text-xl font-bold text-slate-900">
                  Body Tape Measurements
                </h1>
                <p className="mt-0.5 text-xs text-slate-600">
                  Log any measurements you want (or skip for now) — Gemini uses these to track true
                  muscle gain &amp; fat loss even when scale weight stays steady.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setStep(5)}
                className="shrink-0 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                Skip
              </button>
            </div>

            <BodyMeasurementGuideSvg
              sex={biologicalSex}
              activeZone={activeTapeZone}
              onSelectZone={setActiveTapeZone}
            />

            <div className="grid grid-cols-2 gap-2.5">
              {[
                { label: 'Neck (cm)', val: neckCm, set: setNeckCm, zone: 'neck' as TapeZoneId, ph: 'e.g. 36' },
                { label: 'Shoulders (cm)', val: shouldersCm, set: setShouldersCm, zone: 'shoulders' as TapeZoneId, ph: 'e.g. 112' },
                { label: biologicalSex === 'female' ? 'Bust / Chest (cm)' : 'Chest (cm)', val: chestCm, set: setChestCm, zone: 'chest' as TapeZoneId, ph: biologicalSex === 'female' ? 'e.g. 88' : 'e.g. 95' },
                { label: biologicalSex === 'female' ? 'Natural Waist (cm)' : 'Waist (cm)', val: waistCm, set: setWaistCm, zone: 'waist' as TapeZoneId, ph: biologicalSex === 'female' ? 'e.g. 68' : 'e.g. 78' },
                { label: 'Hips / Glutes (cm)', val: hipsCm, set: setHipsCm, zone: 'hips' as TapeZoneId, ph: 'e.g. 96' },
                { label: 'Left Arm (cm)', val: armLeftCm, set: setArmLeftCm, zone: 'arm' as TapeZoneId, ph: 'e.g. 32' },
                { label: 'Right Arm (cm)', val: armRightCm, set: setArmRightCm, zone: 'arm' as TapeZoneId, ph: 'e.g. 32.5' },
                { label: 'Left Thigh (cm)', val: thighLeftCm, set: setThighLeftCm, zone: 'thigh' as TapeZoneId, ph: 'e.g. 55' },
                { label: 'Right Thigh (cm)', val: thighRightCm, set: setThighRightCm, zone: 'thigh' as TapeZoneId, ph: 'e.g. 55' },
              ].map((f) => (
                <div key={f.label}>
                  <label className="text-[11px] font-semibold text-slate-600">{f.label}</label>
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.1"
                    placeholder={f.ph}
                    value={f.val}
                    onFocus={() => setActiveTapeZone(f.zone)}
                    onChange={(e) => f.set(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-900 outline-none focus:border-blue-600"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* STEP 5: Starting Level & Launch */}
        {step === 5 && (
          <div className="prime-tab-enter space-y-5">
            <div>
              <h1 className="font-display text-2xl font-bold text-slate-900">
                Your Prime Plan Is Ready, {userName.trim()}!
              </h1>
              <p className="mt-1 text-xs text-slate-600">
                Pick your starting level and jump right in — or run a quick 5-minute calibration
                first.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Body Baseline</span>
                <span className="font-bold text-slate-900">
                  {parsedWeight} kg · {parsedHeight} cm ({biologicalSex})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Goal</span>
                <span className="font-bold text-blue-700">{selectedGoalMeta.shortLabel}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Schedule</span>
                <span className="font-semibold text-slate-900">
                  {daysPerWeek} days/week · {duration} min
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Daily Recovery Fuel</span>
                <span className="font-semibold text-blue-700">
                  {liveProteinMin}g+ protein · {liveWaterL} L water
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase text-slate-600">
                Current Fitness Level
              </label>
              <div className="grid grid-cols-3 gap-2">
                {TIERS.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setStartingTier(t.id)}
                    className={`rounded-xl border p-2.5 text-left ${
                      startingTier === t.id
                        ? 'border-blue-600 bg-blue-50 text-blue-950'
                        : 'border-slate-200 bg-white text-slate-600'
                    }`}
                  >
                    <div className="text-xs font-bold">{t.label}</div>
                    <div className="mt-0.5 text-[10px] text-slate-500">{t.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2.5 pt-1">
              <button
                type="button"
                onClick={() => finishOnboarding('skip_calibration')}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-4 text-sm font-bold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700"
              >
                <Play className="h-4 w-4 fill-current" />
                Enter Prime &amp; Start Today
              </button>

              <button
                type="button"
                onClick={() => finishOnboarding('run_calibration')}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-3.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                <Sparkles className="h-4 w-4 text-blue-600" />
                Calibrate My Level First (Optional · 5 min)
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Stepper Bar */}
      {step < 5 ? (
        <div className="mt-6 flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              if (step === 1) {
                setStage('intro');
              } else {
                setStep((s) => s - 1);
              }
            }}
            className="flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-sm font-semibold text-slate-700"
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </button>
          <button
            type="button"
            onClick={() => {
              if (step === 1) {
                handleStep1Next();
              } else {
                setStep((s) => s + 1);
              }
            }}
            className={`flex flex-1 items-center justify-center gap-1 rounded-xl py-3.5 text-sm font-bold text-white shadow-md transition ${
              step === 1 && !essentialsValid
                ? 'bg-slate-400 hover:bg-slate-500'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {step === 4 ? 'Save & Continue' : 'Continue'}
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <div className="mt-4">
          <button
            type="button"
            onClick={() => setStep(4)}
            className="flex items-center justify-center gap-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-600"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            Back
          </button>
        </div>
      )}
    </div>
  );
}
