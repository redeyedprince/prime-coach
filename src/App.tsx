import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  ArrowLeftRight,
  Building2,
  Calendar,
  CalendarDays,
  CircleDot,
  Cloud,
  Dumbbell,
  Flame,
  Footprints,
  HeartPulse,
  History,
  Home,
  Lightbulb,
  Moon,
  Play,
  Settings,
  ShieldCheck,
  Shuffle,
  Sparkles,
  Sun,
  WifiOff,
  Wind,
  Wrench,
  Zap,
} from 'lucide-react';
import { CalibrationFlow } from './components/calibration/CalibrationFlow';
import { PrimeSplashOverlay } from './components/common/PrimeSplashOverlay';
import { ProgressRing } from './components/common/ProgressRing';
import { TermHint } from './components/common/TermHint';
import { StealthKegelScreen } from './components/kegel/StealthKegelScreen';
import { AppTourOverlay, type TourStep } from './components/onboarding/AppTourOverlay';
import { OnboardingFlow } from './components/onboarding/OnboardingFlow';
import { PlanBuilderScreen } from './components/plan/PlanBuilderScreen';
import { ExerciseAnimator } from './components/player/ExerciseAnimator';
import { WorkoutPlayer } from './components/player/WorkoutPlayer';
import { SettingsScreen } from './components/settings/SettingsScreen';
import { SyncCoachScreen } from './components/sync/SyncCoachScreen';
import { BreathworkModal } from './components/wellness/BreathworkModal';
import { CardioModesModal } from './components/wellness/CardioModesModal';
import { DailyReadinessCard } from './components/wellness/DailyReadinessCard';
import {
  buildBalancePowerFlowBlocks,
  buildMobilityFlowBlocks,
  buildRestDayCardioMobilityBlocks,
  buildSessionBlocksForDay,
  FLOOR_EXERCISE_ALLOWLIST,
  getAlternativeExercisesForSlot,
  getHouseholdToolTip,
  HOUSEHOLD_WEIGHT_PRESETS,
  isUnilateralExercise,
  type FloorExercise,
  type SessionBlock,
} from './data/exerciseCatalog';
import {
  appendBodyMetric,
  appendWorkoutLog,
  loadAllWorkoutLogs,
  loadDailyCheckIn,
  loadProgramConfig,
  loadUserProfile,
  resetAllAppData,
  saveDailyCheckIn,
  saveProgramConfig,
  saveUserProfile,
} from './db/database';
import { isMonthlyWeightReminderDue } from './engine/bodyMetrics';
import { buildDefaultProgramConfigFromProfile } from './engine/calibration';
import { BODY_FOCUS_PROFILES, DAY_NAMES, getGoalsForSex } from './engine/planBuilder';
import { applyReadinessScaling } from './engine/primeCondition';
import {
  getRecentWorkoutHistory,
  resolveRecoverySafePatterns,
} from './engine/recoveryGuard';
import type {
  DailyCheckIn,
  EquipmentItem,
  KegelLevel,
  MovementPattern,
  ProgramConfig,
  UserProfile,
  WorkoutLocation,
  WorkoutLogEntry,
} from './types/schemas';

type Tab = 'today' | 'kegel' | 'plan' | 'sync' | 'settings';

const TOUR_STEPS: TourStep[] = [
  {
    id: 'equip_open',
    targetId: 'equip-btn',
    title: 'Use What You Have at Home',
    description:
      'No gym dumbbells? Tap here anytime to pick everyday items like a water gallon (~5kg), loaded backpack, sturdy chair, or stick to Floor Only.',
    actionHint: 'Tap the highlighted button to open Household Gear',
  },
  {
    id: 'equip_apply',
    targetId: 'equip-apply-btn',
    title: 'Pick Household Items or Floor Only',
    description:
      'You can enable Weight / Jug (with presets for water bottles & backpacks), Chair / Sofa Edge, or leave all off for strict floor workouts.',
    actionHint: 'Tap Apply when ready to continue',
  },
  {
    id: 'cardio_toggle',
    targetId: 'cardio-toggle',
    title: 'Why Turn On the Cardio Finisher?',
    description:
      'Adding a 3–5 min cardio finisher boosts heart health, daily calorie burn, stamina, and blood flow for faster recovery — done at the end so it never weakens your strength or muscle gains. (Check out the Tendon toggle next to it too for stronger joints!)',
    actionHint: 'Tap Cardio to try turning it ON or OFF',
  },
  {
    id: 'shuffle_moves',
    targetId: 'shuffle-btn',
    title: 'Fresh Moves From 311 Exercises',
    description:
      'Want variety? Tap Shuffle to rotate today’s exercise selection without repeating any move in the same session.',
    actionHint: 'Tap Shuffle to rotate today’s moves',
  },
  {
    id: 'nav_kegel',
    targetId: 'nav-kegel',
    title: 'Seated Desk Kegel Mode',
    description:
      'Tap Kegel for a plain-English How-To guide, guided hold & fast-squeeze timer, Office Stealth mode, and discreet daily reminders.',
    actionHint: 'Tap Kegel in the bottom bar',
  },
  {
    id: 'nav_plan',
    targetId: 'nav-plan',
    title: 'Weekly & 4-Week Plan',
    description:
      'Tap Plan to view or customize your weekly training days, rest days, and 4-week recovery cycle.',
    actionHint: 'Tap Plan in the bottom bar',
  },
  {
    id: 'nav_sync',
    targetId: 'nav-sync',
    title: 'Drive Backup & APK Updates',
    description:
      'Tap Sync to back up workout logs to Google Drive, keep device storage lean (>14d compaction), or check for updated Android APKs.',
    actionHint: 'Tap Sync in the bottom bar',
  },
  {
    id: 'nav_today',
    targetId: 'nav-today',
    title: 'All Set — Ready to Train!',
    description:
      'Tap Today to return to your daily workout. You can replay this interactive guide anytime in Settings.',
    actionHint: 'Tap Today to finish the tour',
  },
];

export function App() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | undefined>(undefined);
  const [config, setConfig] = useState<ProgramConfig | undefined>(undefined);
  const [logs, setLogs] = useState<WorkoutLogEntry[]>([]);
  const [tab, setTab] = useState<Tab>('today');
  const [selectedDayIdx, setSelectedDayIdx] = useState(() => {
    const jsDay = new Date().getDay();
    return jsDay === 0 ? 6 : jsDay - 1;
  });
  const [playing, setPlaying] = useState(false);
  const [activeFlowMode, setActiveFlowMode] = useState<
    'session' | 'rest_cardio' | 'mobility' | 'balance'
  >('session');
  const [trainOnRestDay, setTrainOnRestDay] = useState(false);
  const [runningCalibration, setRunningCalibration] = useState(false);
  const [breathModalOpen, setBreathModalOpen] = useState(false);
  const [cardioModalOpen, setCardioModalOpen] = useState(false);
  const [planInitialView, setPlanInitialView] = useState<'weekly' | 'monthly' | 'prime' | 'guide'>('weekly');
  const [planInitialPrimeSub, setPlanInitialPrimeSub] = useState<'pillars' | 'body'>('pillars');
  const [monthlyWeightDraft, setMonthlyWeightDraft] = useState('');
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('prime_theme_mode') === 'dark';
  });
  const [showSplash, setShowSplash] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return sessionStorage.getItem('prime_splash_seen') !== '1';
  });
  const [dailyCheckIn, setDailyCheckIn] = useState<DailyCheckIn>(() => ({
    date: new Date().toISOString().slice(0, 10),
    sleep_quality: 'ok',
    hydration_hit: false,
    protein_hit: false,
    steps_hit: false,
    updated_at: '',
  }));

  // Interactive spotlight walkthrough state
  const [tourStepIdx, setTourStepIdx] = useState<number | null>(null);

  // Modals & overrides
  const [equipModalOpen, setEquipModalOpen] = useState(false);
  const [equipDraft, setEquipDraft] = useState<EquipmentItem[]>([]);
  const [dumbbellKgDraft, setDumbbellKgDraft] = useState('5');
  const [slotOverrides, setSlotOverrides] = useState<Record<string, string>>({});
  const [variationSeed, setVariationSeed] = useState(0);
  const [swapTargetBlock, setSwapTargetBlock] = useState<SessionBlock | null>(null);
  const [swapSearch, setSwapSearch] = useState('');
  const [kegelBannerMsg, setKegelBannerMsg] = useState<string | null>(null);

  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  );

  const refreshLogs = useCallback(async () => {
    const all = await loadAllWorkoutLogs();
    setLogs(all);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    localStorage.setItem('prime_theme_mode', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  const dismissSplash = useCallback(() => {
    sessionStorage.setItem('prime_splash_seen', '1');
    setShowSplash(false);
  }, []);

  useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);

    void (async () => {
      const todayKey = new Date().toISOString().slice(0, 10);
      const [p, c, allLogs, savedCheckIn] = await Promise.all([
        loadUserProfile(),
        loadProgramConfig(),
        loadAllWorkoutLogs(),
        loadDailyCheckIn(todayKey),
      ]);
      setProfile(p);
      setConfig(c);
      setLogs(allLogs);
      if (savedCheckIn) {
        setDailyCheckIn(savedCheckIn);
      }
      if (p && c && !p.tour_completed) {
        setTourStepIdx(0);
      }
      setLoading(false);
    })();

    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  // Scheduled discreet daily Kegel reminder checker
  useEffect(() => {
    if (!profile?.kegel_reminder_enabled || !profile.kegel_reminder_times?.length) return;

    const checkReminder = () => {
      const now = new Date();
      const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      if (!profile.kegel_reminder_times.includes(hhmm)) return;
      const dateStr = now.toISOString().slice(0, 10);
      const slotKey = `${dateStr}_${hhmm}`;
      if (localStorage.getItem('kegel_last_notified_slot') === slotKey) return;
      localStorage.setItem('kegel_last_notified_slot', slotKey);

      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        try {
          new Notification('2-Min Focus & Posture Reset', {
            body: 'Quick seated breathing & posture check-in (office-safe).',
            silent: true,
          });
        } catch {
          // ignore if WebView blocks constructor
        }
      }
      setKegelBannerMsg(`Scheduled check-in (${hhmm}): 2-Min Focus & Posture Reset ready.`);
    };

    checkReminder();
    const intervalId = window.setInterval(checkReminder, 30_000);
    return () => window.clearInterval(intervalId);
  }, [profile?.kegel_reminder_enabled, profile?.kegel_reminder_times]);

  const todayStr = new Date().toISOString().slice(0, 10);
  const splitDay = config
    ? config.weekly_split[selectedDayIdx % config.weekly_split.length]
    : undefined;
  const isScheduledRest = Boolean(splitDay?.focus.includes('rest'));

  const plannedPatterns: MovementPattern[] = useMemo(() => {
    if (!config || !splitDay) return ['push', 'core'];
    if (isScheduledRest && trainOnRestDay) {
      if (profile?.body_focus === 'glute_sculpt' || profile?.body_focus === 'pelvic_sexual_health') {
        return ['legs', 'core'];
      }
      if (profile?.body_focus === 'chest_lift_posture' || profile?.body_focus === 'v_taper') {
        return ['push', 'pull'];
      }
      if (profile?.body_focus === 'core_waist_sculpt') return ['core', 'pull'];
      return ['legs', 'push'];
    }
    const found = splitDay.focus.filter(
      (f): f is MovementPattern =>
        ['push', 'pull', 'legs', 'core'].includes(f) &&
        Boolean(config.movement_tracks[f as MovementPattern]),
    );
    return found.length > 0 ? found : ['push', 'core'];
  }, [config, splitDay, isScheduledRest, trainOnRestDay, profile?.body_focus]);

  const recoveryResolution = useMemo(
    () => resolveRecoverySafePatterns(plannedPatterns, logs, todayStr),
    [plannedPatterns, logs, todayStr],
  );

  const sessionBlocks = useMemo(() => {
    if (!config || !profile) return [];
    const base = buildSessionBlocksForDay(
      recoveryResolution.activePatterns,
      config,
      profile,
      slotOverrides,
      selectedDayIdx + variationSeed,
    );
    return applyReadinessScaling(base, dailyCheckIn.sleep_quality);
  }, [
    config,
    profile,
    recoveryResolution.activePatterns,
    slotOverrides,
    selectedDayIdx,
    variationSeed,
    dailyCheckIn.sleep_quality,
  ]);

  const restCardioBlocks = useMemo(() => {
    if (!profile) return [];
    return buildRestDayCardioMobilityBlocks(profile, selectedDayIdx + variationSeed);
  }, [profile, selectedDayIdx, variationSeed]);

  const mobilityFlowBlocks = useMemo(() => {
    if (!profile) return [];
    return buildMobilityFlowBlocks(profile, selectedDayIdx + variationSeed);
  }, [profile, selectedDayIdx, variationSeed]);

  const balancePowerBlocks = useMemo(() => {
    if (!profile) return [];
    return buildBalancePowerFlowBlocks(profile, selectedDayIdx + variationSeed);
  }, [profile, selectedDayIdx, variationSeed]);

  const recentHistory = useMemo(() => getRecentWorkoutHistory(logs, 4), [logs]);

  const weeklyStats = useMemo(() => {
    const sevenDaysAgo = new Date(Date.now() - 6 * 86_400_000).toISOString().slice(0, 10);
    const workoutSessionsThisWeek = new Set(
      logs
        .filter((l) => l.date >= sevenDaysAgo && l.exercise_slug !== 'stealth-kegel-protocol')
        .map((l) => l.session_id),
    ).size;
    const kegelToday = logs.filter(
      (l) => l.date === todayStr && l.exercise_slug === 'stealth-kegel-protocol',
    ).length;
    return {
      workoutsThisWeek: workoutSessionsThisWeek,
      kegelToday,
      totalSets: logs.length,
    };
  }, [logs, todayStr]);

  const finishTour = useCallback(async () => {
    setTourStepIdx(null);
    setEquipModalOpen(false);
    if (profile && !profile.tour_completed) {
      const updated = { ...profile, tour_completed: true };
      setProfile(updated);
      await saveUserProfile(updated);
    }
  }, [profile]);

  const advanceTourIfStep = useCallback(
    (expectedId: string) => {
      if (tourStepIdx === null) return;
      const cur = TOUR_STEPS[tourStepIdx];
      if (!cur || cur.id !== expectedId) return;
      if (tourStepIdx >= TOUR_STEPS.length - 1) {
        void finishTour();
      } else {
        setTourStepIdx(tourStepIdx + 1);
      }
    },
    [tourStepIdx, finishTour],
  );

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-slate-50 text-sm font-medium text-slate-500">
        Loading Prime...
      </div>
    );
  }

  if (!profile) {
    return (
      <OnboardingFlow
        onComplete={(newProfile, action, initialBodyMetric) => {
          sessionStorage.setItem('prime_splash_seen', '1');
          setShowSplash(false);
          if (action === 'skip_calibration') {
            const uncalibratedProfile: UserProfile = {
              ...newProfile,
              calibrated: false,
              tour_completed: false,
            };
            const defaultConfig = buildDefaultProgramConfigFromProfile(uncalibratedProfile);
            void Promise.all([
              saveUserProfile(uncalibratedProfile),
              saveProgramConfig(defaultConfig),
              appendBodyMetric(initialBodyMetric),
            ]).then(() => {
              setProfile(uncalibratedProfile);
              setConfig(defaultConfig);
              setRunningCalibration(false);
              setTab('today');
              setTourStepIdx(0);
            });
          } else {
            const pendingProfile: UserProfile = {
              ...newProfile,
              calibrated: false,
              tour_completed: false,
            };
            void Promise.all([
              saveUserProfile(pendingProfile),
              appendBodyMetric(initialBodyMetric),
            ]).then(() => {
              setProfile(pendingProfile);
              setRunningCalibration(true);
            });
          }
        }}
      />
    );
  }

  if (runningCalibration || !config) {
    return (
      <CalibrationFlow
        profile={profile}
        onComplete={(newConfig) => {
          const calibratedProfile: UserProfile = { ...profile, calibrated: true };
          void Promise.all([
            saveProgramConfig(newConfig),
            saveUserProfile(calibratedProfile),
          ]).then(() => {
            setConfig(newConfig);
            setProfile(calibratedProfile);
            setRunningCalibration(false);
            if (!calibratedProfile.tour_completed) {
              setTab('today');
              setTourStepIdx(0);
            }
          });
        }}
      />
    );
  }

  const activePlayerBlocks =
    activeFlowMode === 'rest_cardio'
      ? restCardioBlocks
      : activeFlowMode === 'mobility'
        ? mobilityFlowBlocks
        : activeFlowMode === 'balance'
          ? balancePowerBlocks
          : sessionBlocks;
  if (playing && activePlayerBlocks.length > 0) {
    const dayTitle =
      activeFlowMode === 'rest_cardio'
        ? 'Active Recovery & Cardio'
        : activeFlowMode === 'mobility'
          ? 'Mobility & Desk Reset (4m)'
          : activeFlowMode === 'balance'
            ? 'Balance & Athletic Pop (3m)'
            : `Day ${splitDay?.day ?? selectedDayIdx + 1} (${DAY_NAMES[selectedDayIdx % 7]}) · ${profile.active_location === 'gym' ? 'Gym' : 'Home'}`;

    return (
      <WorkoutPlayer
        profile={profile}
        config={config}
        blocks={activePlayerBlocks}
        dayLabel={dayTitle}
        initialSleepQuality={dailyCheckIn.sleep_quality}
        onConfigUpdated={setConfig}
        onExit={() => {
          setPlaying(false);
          setActiveFlowMode('session');
          void refreshLogs();
        }}
      />
    );
  }

  const availableEquip = profile.available_equipment ?? [];
  const sexGoalMeta = getGoalsForSex(profile.biological_sex).find(
    (g) => g.id === (profile.body_focus ?? 'balanced'),
  );
  const focusMeta = sexGoalMeta ?? BODY_FOCUS_PROFILES[profile.body_focus ?? 'balanced'];
  const isCardioForced = profile.body_focus === 'pelvic_sexual_health';
  const cardioActive = Boolean(profile.include_cardio_finisher || isCardioForced);

  const handleToggleCardioFinisher = async () => {
    if (!isCardioForced) {
      const next: UserProfile = {
        ...profile,
        include_cardio_finisher: !profile.include_cardio_finisher,
        updated_at: todayStr,
      };
      await saveUserProfile(next);
      setProfile(next);
    }
    advanceTourIfStep('cardio_toggle');
  };

  const handleToggleTendonPrep = async () => {
    const next: UserProfile = {
      ...profile,
      include_tendon_prep: !profile.include_tendon_prep,
      updated_at: todayStr,
    };
    await saveUserProfile(next);
    setProfile(next);
  };

  const handleUpdateProfileFromKegel = async (next: UserProfile) => {
    await saveUserProfile(next);
    setProfile(next);
  };

  const handleCompleteKegelSession = async (
    level: KegelLevel,
    durationSeconds: number,
  ) => {
    await appendWorkoutLog({
      date: todayStr,
      completed_at: new Date().toISOString(),
      location: profile.active_location,
      session_id: `kegel_${todayStr}_${Date.now()}`,
      readiness: 'normal',
      bodyweight_kg: profile.bodyweight_kg ?? null,
      pattern: 'core',
      exercise_slug: 'stealth-kegel-protocol',
      set_number: 1,
      target_value: durationSeconds,
      completed_value: durationSeconds,
      unit: 'seconds',
      rir: 3,
      soreness_tag: 'none',
      notes: `Seated Pelvic Reset (${level})`,
    });
    await refreshLogs();
  };

  const handleSaveDailyCheckIn = async (next: DailyCheckIn) => {
    setDailyCheckIn(next);
    await saveDailyCheckIn(next);
  };

  const handleCompleteBreathwork = async (modeName: string, durationSeconds: number) => {
    await appendWorkoutLog({
      date: todayStr,
      completed_at: new Date().toISOString(),
      location: profile.active_location,
      session_id: `breath_${todayStr}_${Date.now()}`,
      readiness: dailyCheckIn.sleep_quality === 'poor' ? 'fatigued' : 'normal',
      bodyweight_kg: profile.bodyweight_kg ?? null,
      pattern: 'core',
      exercise_slug: 'breathwork-reset',
      set_number: 1,
      target_value: durationSeconds,
      completed_value: durationSeconds,
      unit: 'seconds',
      rir: 3,
      soreness_tag: 'none',
      notes: `Breathwork: ${modeName}`,
    });
    await refreshLogs();
  };

  const handleLogCardioSession = async (
    slug: 'zone2-cardio-session' | 'vo2max-interval-session',
    durationSeconds: number,
    notes: string,
  ) => {
    await appendWorkoutLog({
      date: todayStr,
      completed_at: new Date().toISOString(),
      location: profile.active_location,
      session_id: `cardio_${slug}_${todayStr}_${Date.now()}`,
      readiness: dailyCheckIn.sleep_quality === 'poor' ? 'fatigued' : 'normal',
      bodyweight_kg: profile.bodyweight_kg ?? null,
      pattern: 'legs',
      exercise_slug: slug,
      set_number: 1,
      target_value: durationSeconds,
      completed_value: durationSeconds,
      unit: 'seconds',
      rir: 2,
      soreness_tag: 'none',
      notes,
    });
    await refreshLogs();
  };

  const updateActiveLocation = async (loc: WorkoutLocation) => {
    const next: UserProfile = {
      ...profile,
      active_location: loc,
      updated_at: todayStr,
    };
    await saveUserProfile(next);
    setProfile(next);
    setSlotOverrides({});
  };

  const openEquipMenu = () => {
    setEquipDraft(profile.available_equipment ?? []);
    setDumbbellKgDraft(profile.dumbbell_kg ? String(profile.dumbbell_kg) : '5');
    setEquipModalOpen(true);
    advanceTourIfStep('equip_open');
  };

  const toggleEquipDraft = (item: EquipmentItem) => {
    setEquipDraft((prev) =>
      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item],
    );
  };

  const saveEquipMenu = async () => {
    const parsedKg = dumbbellKgDraft.trim() ? Number(dumbbellKgDraft) : null;
    const nextProfile: UserProfile = {
      ...profile,
      available_equipment: equipDraft,
      dumbbell_kg:
        equipDraft.includes('dumbbell') && parsedKg && !Number.isNaN(parsedKg) && parsedKg > 0
          ? parsedKg
          : null,
      updated_at: todayStr,
    };
    await saveUserProfile(nextProfile);
    setProfile(nextProfile);
    setSlotOverrides({});
    setEquipModalOpen(false);
    advanceTourIfStep('equip_apply');
  };

  const swapCandidates: FloorExercise[] = swapTargetBlock
    ? getAlternativeExercisesForSlot(swapTargetBlock.exercise, profile)
    : [];

  const fuelHitsToday =
    (dailyCheckIn.protein_hit ? 1 : 0) +
    (dailyCheckIn.hydration_hit ? 1 : 0) +
    (dailyCheckIn.steps_hit ? 1 : 0);

  const heroTitle =
    isScheduledRest && !trainOnRestDay
      ? 'Rest & Active Recovery'
      : `${recoveryResolution.activePatterns.map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(' + ')} · ${sessionBlocks.length} Blocks`;

  return (
    <div className="prime-app-shell mx-auto flex min-h-dvh max-w-md flex-col bg-slate-50 pb-28 text-slate-900">
      {showSplash && (
        <PrimeSplashOverlay userName={profile.user_name} onDone={dismissSplash} />
      )}

      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200/80 bg-white/90 px-4 py-3 backdrop-blur-lg">
        <div className="flex items-center gap-2.5">
          <img
            src="/icon.svg"
            alt="Prime"
            className="h-8 w-8 rounded-xl shadow-sm"
          />
          <span className="font-display font-bold tracking-tight text-slate-900">
            Hi, {profile.user_name}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setDarkMode((v) => !v)}
            aria-label={darkMode ? 'Switch to Light Mode' : 'Switch to Calm Night Dark Mode'}
            title={darkMode ? 'Light Mode' : 'Calm Night Dark Mode'}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-slate-100 text-slate-700 transition active:scale-95 hover:bg-slate-200/70"
          >
            {darkMode ? <Sun className="h-3.5 w-3.5 text-amber-400" /> : <Moon className="h-3.5 w-3.5" />}
          </button>
          <button
            type="button"
            data-tour-id="equip-btn"
            onClick={openEquipMenu}
            className={`flex items-center gap-1 rounded-full border px-2.5 py-1.5 text-[11px] font-semibold transition active:scale-95 ${
              availableEquip.length > 0
                ? 'border-blue-300 bg-blue-50 text-blue-700'
                : 'border-slate-200 bg-slate-100 text-slate-700'
            }`}
          >
            <Wrench className="h-3 w-3" />
            {availableEquip.length > 0 ? `Gear (${availableEquip.length})` : 'Floor Only'}
          </button>
          {!isOnline && (
            <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
              <WifiOff className="h-3 w-3" />
              Offline
            </span>
          )}
        </div>
      </header>

      <main key={tab} className="prime-tab-enter flex-1 px-4 pt-4">
        {kegelBannerMsg && (
          <div className="mb-3 flex items-center justify-between gap-2 rounded-2xl border border-blue-200 bg-blue-50 px-3.5 py-2.5 text-xs text-blue-900 shadow-sm">
            <span className="font-medium">{kegelBannerMsg}</span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setKegelBannerMsg(null);
                  setTab('kegel');
                }}
                className="rounded-lg bg-blue-600 px-2.5 py-1 text-[11px] font-bold text-white"
              >
                Open
              </button>
              <button
                type="button"
                onClick={() => setKegelBannerMsg(null)}
                className="text-[11px] font-semibold text-slate-500"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {tab === 'today' && (
          <div className="space-y-4">
            {/* Deep Teal Hero Workout Card (Above-the-Fold Dominance) */}
            <div className="prime-hero-card rounded-3xl bg-gradient-to-br from-teal-700 via-teal-600 to-cyan-600 p-4 text-white shadow-lg shadow-teal-700/20 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-white">
                    {DAY_NAMES[selectedDayIdx % 7]} · {focusMeta.shortLabel}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setTab('settings')}
                  className="rounded-full bg-white/15 px-2.5 py-0.5 text-[10px] font-semibold text-white/95 hover:bg-white/25"
                >
                  Edit Goal
                </button>
              </div>

              <div>
                <h1 className="font-display text-xl font-extrabold tracking-tight text-white">
                  {heroTitle}
                </h1>
                <p className="mt-0.5 text-xs leading-relaxed text-teal-50/90 line-clamp-2">
                  {focusMeta.summary}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-1.5 rounded-xl bg-black/15 p-1">
                <button
                  type="button"
                  onClick={() => void updateActiveLocation('home_calisthenics')}
                  className={`flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-bold transition active:scale-[0.98] ${
                    profile.active_location === 'home_calisthenics'
                      ? 'bg-white text-teal-800 shadow-xs'
                      : 'text-white/85 hover:text-white'
                  }`}
                >
                  <Home className="h-3.5 w-3.5" />
                  At Home
                </button>
                <button
                  type="button"
                  onClick={() => void updateActiveLocation('gym')}
                  className={`flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-bold transition active:scale-[0.98] ${
                    profile.active_location === 'gym'
                      ? 'bg-white text-teal-800 shadow-xs'
                      : 'text-white/85 hover:text-white'
                  }`}
                >
                  <Building2 className="h-3.5 w-3.5" />
                  At Gym
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (isScheduledRest && !trainOnRestDay) {
                    setActiveFlowMode('rest_cardio');
                  } else {
                    setActiveFlowMode('session');
                  }
                  setPlaying(true);
                }}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-white py-3 text-sm font-extrabold text-teal-800 shadow-md transition active:scale-[0.98] hover:bg-teal-50"
              >
                <Play className="h-4 w-4 fill-current" />
                {isScheduledRest && !trainOnRestDay
                  ? 'Start 10-Min Active Recovery'
                  : 'Start Guided Workout'}
              </button>
            </div>

            {/* Animated SVG Progress Rings Consistency Strip */}
            <div className="grid grid-cols-3 gap-2">
              <div className="flex flex-col items-center rounded-2xl border border-slate-200/80 bg-white px-2 py-2.5 text-center shadow-xs">
                <ProgressRing
                  value={weeklyStats.workoutsThisWeek}
                  max={profile.days_per_week}
                  fillColor="stroke-blue-600"
                />
                <div className="mt-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                  This Week
                </div>
              </div>
              <button
                type="button"
                onClick={() => setTab('kegel')}
                className="flex flex-col items-center rounded-2xl border border-slate-200/80 bg-white px-2 py-2.5 text-center shadow-xs transition active:scale-95 hover:bg-blue-50/40"
              >
                <ProgressRing
                  value={weeklyStats.kegelToday}
                  max={3}
                  fillColor="stroke-teal-500"
                />
                <div className="mt-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                  Kegel Today
                </div>
              </button>
              <div className="flex flex-col items-center rounded-2xl border border-slate-200/80 bg-white px-2 py-2.5 text-center shadow-xs">
                <ProgressRing
                  value={fuelHitsToday}
                  max={3}
                  fillColor="stroke-emerald-500"
                />
                <div className="mt-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                  Daily Fuel
                </div>
              </div>
            </div>

            {/* Optional Level Calibration Banner */}
            {!profile.calibrated && (
              <div className="flex items-center justify-between gap-3 rounded-2xl border border-blue-200 bg-blue-50 p-3 shadow-sm">
                <div className="flex items-center gap-2 text-xs text-blue-900">
                  <Sparkles className="h-4 w-4 shrink-0 text-blue-600" />
                  <span>Want a sharper plan? Run the optional 5-min calibration.</span>
                </div>
                <button
                  type="button"
                  onClick={() => setRunningCalibration(true)}
                  className="shrink-0 rounded-lg bg-blue-600 px-2.5 py-1.5 text-[11px] font-bold text-white"
                >
                  Calibrate
                </button>
              </div>
            )}

            {/* Monthly Weight & Body Metrics Check-In Reminder (every 30 days) */}
            {(() => {
              const weightDue = isMonthlyWeightReminderDue(profile, todayStr);
              if (!weightDue.due) return null;
              return (
                <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-3.5 shadow-sm space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-xs font-extrabold text-amber-900">
                        Monthly Weight Check-In ({weightDue.daysSince}d since last update)
                      </div>
                      <p className="mt-0.5 text-[11px] leading-relaxed text-amber-900/80">
                        Last recorded: <strong>{profile.bodyweight_kg ?? '—'} kg</strong>. Updating
                        keeps your protein, hydration &amp; Gemini assessment accurate.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      inputMode="decimal"
                      step="0.1"
                      min={30}
                      max={300}
                      placeholder={profile.bodyweight_kg ? String(profile.bodyweight_kg) : 'kg'}
                      value={monthlyWeightDraft}
                      onChange={(e) => setMonthlyWeightDraft(e.target.value)}
                      className="w-24 rounded-xl border border-amber-300 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-900"
                    />
                    <span className="text-xs font-semibold text-amber-900">kg</span>
                    <button
                      type="button"
                      onClick={() => {
                        const val = Number(monthlyWeightDraft || profile.bodyweight_kg);
                        if (!Number.isFinite(val) || val < 30 || val > 300) return;
                        const rounded = Math.round(val * 10) / 10;
                        const nextProfile: UserProfile = {
                          ...profile,
                          bodyweight_kg: rounded,
                          last_weight_updated_at: todayStr,
                          weight_reminder_snoozed_until: undefined,
                          updated_at: todayStr,
                        };
                        void Promise.all([
                          saveUserProfile(nextProfile),
                          appendBodyMetric({
                            date: todayStr,
                            created_at: new Date().toISOString(),
                            weight_kg: rounded,
                            notes: 'Monthly weight check-in',
                          }),
                        ]).then(() => {
                          setProfile(nextProfile);
                          setMonthlyWeightDraft('');
                        });
                      }}
                      className="rounded-xl bg-amber-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-amber-700"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPlanInitialView('prime');
                        setPlanInitialPrimeSub('body');
                        setTab('plan');
                      }}
                      className="ml-auto rounded-xl border border-amber-300 bg-white px-2.5 py-1.5 text-[11px] font-bold text-amber-900 hover:bg-amber-100"
                    >
                      + Tape (cm)
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const snoozeUntil = new Date(Date.now() + 7 * 86_400_000)
                        .toISOString()
                        .slice(0, 10);
                      const nextProfile: UserProfile = {
                        ...profile,
                        weight_reminder_snoozed_until: snoozeUntil,
                      };
                      void saveUserProfile(nextProfile).then(() => setProfile(nextProfile));
                    }}
                    className="text-[10px] font-semibold text-amber-800/80 underline"
                  >
                    Remind me next week
                  </button>
                </div>
              );
            })()}

            {/* Collapsible Daily Sleep & Recovery Fuel Check-In */}
            <DailyReadinessCard
              profile={profile}
              checkIn={dailyCheckIn}
              onChange={handleSaveDailyCheckIn}
              onSaveWeight={async (kg) => {
                const rounded = Math.round(kg * 10) / 10;
                const nextProfile: UserProfile = {
                  ...profile,
                  bodyweight_kg: rounded,
                  last_weight_updated_at: todayStr,
                  weight_reminder_snoozed_until: undefined,
                  updated_at: todayStr,
                };
                await Promise.all([
                  saveUserProfile(nextProfile),
                  appendBodyMetric({
                    date: todayStr,
                    created_at: new Date().toISOString(),
                    weight_kg: rounded,
                  }),
                ]);
                setProfile(nextProfile);
              }}
            />

            {/* Reset & Prime Mini-Flows (Mobility, Balance/Power, Breathwork, Heart Modes) */}
            <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase text-slate-500">
                  <Sparkles className="h-3.5 w-3.5 text-blue-600" />
                  <span>Reset &amp; Prime Mini-Flows</span>
                  <TermHint termId="mobility_flow" />
                </div>
                <span className="text-[10px] font-semibold text-slate-400">Anytime · 2–9m</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setActiveFlowMode('mobility');
                    setPlaying(true);
                  }}
                  className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/80 px-2.5 py-2 text-left transition hover:border-blue-300 hover:bg-blue-50/50"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
                    <Footprints className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-xs font-bold text-slate-900">Mobility Reset</div>
                    <div className="truncate text-[10px] text-slate-500">4m · Neck, Hips, Feet</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveFlowMode('balance');
                    setPlaying(true);
                  }}
                  className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/80 px-2.5 py-2 text-left transition hover:border-amber-300 hover:bg-amber-50/50"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                    <Zap className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-xs font-bold text-slate-900">Balance &amp; Pop</div>
                    <div className="truncate text-[10px] text-slate-500">3m · Stability &amp; Power</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setBreathModalOpen(true)}
                  className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/80 px-2.5 py-2 text-left transition hover:border-teal-300 hover:bg-teal-50/50"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-teal-100 text-teal-700">
                    <Wind className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-xs font-bold text-slate-900">Breathwork</div>
                    <div className="truncate text-[10px] text-slate-500">2m · Sigh, Box, Sleep</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setCardioModalOpen(true)}
                  className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/80 px-2.5 py-2 text-left transition hover:border-rose-300 hover:bg-rose-50/50"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-rose-100 text-rose-700">
                    <HeartPulse className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-xs font-bold text-slate-900">Heart &amp; Stamina</div>
                    <div className="truncate text-[10px] text-slate-500">Zone-2 &amp; VO2 Max</div>
                  </div>
                </button>
              </div>
            </div>

            {/* 72-Hour Muscle Recovery Guard Status */}
            <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm space-y-2">
              <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase text-slate-500">
                <ShieldCheck className="h-3.5 w-3.5 text-blue-600" />
                <span>Muscle Recovery Guard (72h Cooldown)</span>
                <TermHint termId="recovery_guard" />
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {(['push', 'pull', 'legs', 'core'] as MovementPattern[]).map((p) => {
                  const st = recoveryResolution.recoveryMap[p];
                  const isRec = st?.status === 'recovering';
                  return (
                    <div
                      key={p}
                      className={`rounded-xl border p-2 text-center ${
                        isRec
                          ? 'border-amber-200 bg-amber-50'
                          : 'border-blue-200 bg-blue-50/70'
                      }`}
                    >
                      <div className="text-[10px] font-bold uppercase text-slate-900">{p}</div>
                      <div
                        className={`mt-0.5 text-[10px] font-semibold ${
                          isRec ? 'text-amber-700' : 'text-blue-700'
                        }`}
                      >
                        {isRec
                          ? st.daysSince === 0
                            ? 'Done Today'
                            : `Rest (${st.daysSince}d)`
                          : 'Fresh'}
                      </div>
                    </div>
                  );
                })}
              </div>
              {recoveryResolution.explanation && (
                <p className="rounded-xl bg-amber-50 p-2 text-[11px] text-amber-800 border border-amber-200">
                  {recoveryResolution.explanation}
                </p>
              )}
            </div>

            {/* Weekly Schedule Selector */}
            <div>
              <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase text-slate-500">
                <Calendar className="h-3.5 w-3.5 text-blue-600" />
                Weekly Schedule
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {config.weekly_split.map((d, idx) => {
                  const isRest = d.focus.includes('rest');
                  return (
                    <button
                      key={d.day}
                      type="button"
                      onClick={() => {
                        setSelectedDayIdx(idx);
                        setTrainOnRestDay(false);
                        setSlotOverrides({});
                      }}
                      className={`shrink-0 rounded-xl border px-3 py-2 text-left transition ${
                        selectedDayIdx === idx
                          ? 'border-blue-600 bg-blue-600 text-white shadow-sm'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <div className="text-xs font-bold">{DAY_NAMES[idx % 7]}</div>
                      <div className="text-[10px] uppercase opacity-85">
                        {isRest ? 'REST' : d.focus.join(' + ')}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Scheduled Rest Day Card vs Multi-Block Session Preview */}
            {isScheduledRest && !trainOnRestDay ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-5 text-center shadow-sm space-y-3">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                  <Moon className="h-6 w-6" />
                </div>
                <h2 className="text-lg font-bold text-slate-900">
                  Scheduled Rest &amp; Recovery Day
                </h2>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Your muscles rebuild while resting. Try a light Zone-2 mobility flow, or tap below
                  if you feel energized and want a workout today anyway.
                </p>
                <div className="space-y-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveFlowMode('rest_cardio');
                      setPlaying(true);
                    }}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-sm font-bold text-white shadow-sm hover:bg-blue-700"
                  >
                    <Activity className="h-4 w-4" />
                    Start 10-Min Active Cardio &amp; Mobility
                  </button>
                  <button
                    type="button"
                    onClick={() => setTrainOnRestDay(true)}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100"
                  >
                    <Dumbbell className="h-3.5 w-3.5 text-blue-600" />
                    Train Anyway (Free Session)
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-slate-600">
                    Today&apos;s Session ({sessionBlocks.length} blocks · {FLOOR_EXERCISE_ALLOWLIST.length} moves)
                  </span>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <div className="inline-flex items-center gap-0.5">
                      <button
                        type="button"
                        data-tour-id="cardio-toggle"
                        onClick={() => void handleToggleCardioFinisher()}
                        title={
                          isCardioForced
                            ? 'Auto-enabled for Pelvic & Stamina blood flow'
                            : 'Toggle 3-5 min cardio finisher'
                        }
                        className={`flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-semibold transition ${
                          cardioActive
                            ? 'border-blue-300 bg-blue-50 text-blue-700'
                            : 'border-slate-200 bg-white text-slate-500'
                        }`}
                      >
                        <Flame className="h-3 w-3" />
                        Cardio: {cardioActive ? (isCardioForced ? 'Auto' : 'ON') : 'OFF'}
                      </button>
                      <TermHint termId="cardio_finisher" />
                    </div>
                    <div className="inline-flex items-center gap-0.5">
                      <button
                        type="button"
                        onClick={() => void handleToggleTendonPrep()}
                        title="Toggle 2-3 min Tendon Armor joint conditioning"
                        className={`flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-semibold transition ${
                          profile.include_tendon_prep
                            ? 'border-blue-300 bg-blue-50 text-blue-700'
                            : 'border-slate-200 bg-white text-slate-500'
                        }`}
                      >
                        <ShieldCheck className="h-3 w-3" />
                        Tendon: {profile.include_tendon_prep ? 'ON' : 'OFF'}
                      </button>
                      <TermHint termId="tendon_armor" />
                    </div>
                    <button
                      type="button"
                      data-tour-id="shuffle-btn"
                      onClick={() => {
                        setVariationSeed((v) => v + 1);
                        setSlotOverrides({});
                        advanceTourIfStep('shuffle_moves');
                      }}
                      className="flex items-center gap-1 rounded-lg border border-blue-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-blue-700 hover:bg-blue-50"
                    >
                      <Shuffle className="h-3 w-3" />
                      Shuffle
                    </button>
                  </div>
                </div>

                <div className="space-y-2.5">
                  {sessionBlocks.map((block) => {
                    const toolTip = getHouseholdToolTip(block.exercise, profile.dumbbell_kg);
                    const unilateral = isUnilateralExercise(block.exercise);
                    return (
                      <div
                        key={block.id}
                        className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm space-y-2"
                      >
                        <div className="flex items-center gap-3">
                          <ExerciseAnimator
                            slug={block.exercise.slug}
                            alt={block.exercise.name}
                            tempo={block.tempo}
                            className="h-18 w-18 shrink-0"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span className="truncate text-[10px] font-bold uppercase text-blue-600">
                                  {block.roleLabel}
                                </span>
                                {unilateral && (
                                  <span className="inline-flex shrink-0 items-center gap-0.5 rounded bg-sky-50 px-1.5 py-0.5 text-[9px] font-bold text-sky-700">
                                    Per Side
                                    <TermHint termId="per_side" className="h-3 w-3" />
                                  </span>
                                )}
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  setSwapSearch('');
                                  setSwapTargetBlock(block);
                                }}
                                className="flex shrink-0 items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-600 hover:bg-slate-100"
                              >
                                <ArrowLeftRight className="h-2.5 w-2.5" />
                                Swap
                              </button>
                            </div>
                            <div className="truncate text-sm font-bold text-slate-900">
                              {block.exercise.name}
                              {block.exercise.required_equipment === 'dumbbell' && profile.dumbbell_kg
                                ? ` (${profile.dumbbell_kg} kg)`
                                : ''}
                            </div>
                            <div className="text-[11px] text-slate-600">
                              {block.sets} {block.sets === 1 ? 'set' : 'sets'} × {block.min_target}–
                              {block.max_target} {block.unit} · {block.rest_seconds}s rest
                            </div>
                            <div className="mt-0.5 text-[10px] text-slate-500 line-clamp-1">
                              {block.why}
                            </div>
                          </div>
                        </div>
                        {toolTip && (
                          <div className="flex items-start gap-1.5 rounded-xl bg-blue-50/70 px-2.5 py-1.5 text-[10px] text-blue-900">
                            <Lightbulb className="mt-0.5 h-3 w-3 shrink-0 text-blue-600" />
                            <span>{toolTip}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setActiveFlowMode('session');
                    setPlaying(true);
                  }}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 py-4 text-base font-bold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700 active:scale-[0.99]"
                >
                  <Play className="h-5 w-5 fill-current" />
                  Start Guided Workout
                </button>
              </>
            )}

            {/* Recent Completed Exercise History */}
            {recentHistory.length > 0 && (
              <div className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold uppercase text-slate-500">
                  <History className="h-3.5 w-3.5 text-blue-600" />
                  Completed Exercise Log
                </div>
                <div className="space-y-1.5">
                  {recentHistory.map((h) => (
                    <div
                      key={`${h.date}-${h.sessionId}`}
                      className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-xs"
                    >
                      <div className="min-w-0 flex-1 pr-2">
                        <div className="truncate font-semibold text-slate-900">
                          {h.exercises.join(', ')}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {h.date} · {h.patterns.map((p) => p.toUpperCase()).join(' + ')} ·{' '}
                          {h.totalSets} sets
                        </div>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          h.isIntense
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-blue-100 text-blue-700'
                        }`}
                      >
                        {h.isIntense ? 'Intense' : 'Moderate'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {tab === 'kegel' && (
          <StealthKegelScreen
            profile={profile}
            logs={logs}
            todayIso={todayStr}
            onUpdateProfile={handleUpdateProfileFromKegel}
            onCompleteSession={handleCompleteKegelSession}
          />
        )}

        {tab === 'plan' && (
          <PlanBuilderScreen
            key={`${planInitialView}-${planInitialPrimeSub}`}
            profile={profile}
            config={config}
            initialView={planInitialView}
            initialPrimeSubTab={planInitialPrimeSub}
            onProfileUpdated={setProfile}
            onConfigUpdated={setConfig}
          />
        )}

        {tab === 'sync' && (
          <SyncCoachScreen profile={profile} config={config} onConfigUpdated={setConfig} />
        )}

        {tab === 'settings' && (
          <SettingsScreen
            profile={profile}
            onProfileSaved={setProfile}
            onRecalibrate={() => setRunningCalibration(true)}
            onReplayTour={() => {
              setTab('today');
              setEquipModalOpen(false);
              setTourStepIdx(0);
            }}
            onRedoOnboarding={() => {
              void resetAllAppData().then(() => {
                setProfile(undefined);
                setConfig(undefined);
                setRunningCalibration(false);
                setTourStepIdx(null);
                setTab('today');
              });
            }}
          />
        )}
      </main>

      {/* Household Gear & Equipment Quick Menu Modal */}
      {equipModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl">
            <div>
              <h2 className="text-lg font-bold text-slate-900">What Do You Have Nearby?</h2>
              <p className="text-xs text-slate-500">
                No gym dumbbell needed — use a water gallon, loaded backpack, or sturdy chair. Leave all off for strict floor workouts.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => toggleEquipDraft('dumbbell')}
                className={`rounded-xl border px-2 py-3 text-xs font-semibold ${
                  equipDraft.includes('dumbbell')
                    ? 'border-blue-600 bg-blue-50 text-blue-700'
                    : 'border-slate-200 bg-slate-50 text-slate-600'
                }`}
              >
                Weight / Jug
              </button>
              <button
                type="button"
                onClick={() => toggleEquipDraft('chair_bench')}
                className={`rounded-xl border px-2 py-3 text-xs font-semibold ${
                  equipDraft.includes('chair_bench')
                    ? 'border-blue-600 bg-blue-50 text-blue-700'
                    : 'border-slate-200 bg-slate-50 text-slate-600'
                }`}
              >
                Chair / Sofa
              </button>
              <button
                type="button"
                onClick={() => toggleEquipDraft('pull_up_bar')}
                className={`rounded-xl border px-2 py-3 text-xs font-semibold ${
                  equipDraft.includes('pull_up_bar')
                    ? 'border-blue-600 bg-blue-50 text-blue-700'
                    : 'border-slate-200 bg-slate-50 text-slate-600'
                }`}
              >
                Pull-up Bar
              </button>
            </div>
            {equipDraft.includes('dumbbell') && (
              <div className="space-y-2">
                <div className="flex flex-wrap gap-1.5">
                  {HOUSEHOLD_WEIGHT_PRESETS.map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => setDumbbellKgDraft(String(preset.kg))}
                      className={`rounded-lg border px-2 py-1 text-[10px] font-semibold ${
                        Number(dumbbellKgDraft) === preset.kg
                          ? 'border-blue-600 bg-blue-50 text-blue-700'
                          : 'border-slate-200 bg-slate-50 text-slate-600'
                      }`}
                    >
                      {preset.label} (~{preset.kg}kg)
                    </button>
                  ))}
                </div>
                <div>
                  <label className="text-xs font-medium uppercase text-slate-500">
                    Estimated Weight (kg)
                  </label>
                  <input
                    type="number"
                    inputMode="decimal"
                    min={1}
                    max={200}
                    value={dumbbellKgDraft}
                    onChange={(e) => setDumbbellKgDraft(e.target.value)}
                    placeholder="e.g. 5 for water gallon"
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-600"
                  />
                </div>
              </div>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setEquipModalOpen(false)}
                className="flex-1 rounded-xl border border-slate-200 bg-slate-50 py-2.5 text-sm font-semibold text-slate-600"
              >
                Cancel
              </button>
              <button
                type="button"
                data-tour-id="equip-apply-btn"
                onClick={() => void saveEquipMenu()}
                className="flex-1 rounded-xl bg-blue-600 py-2.5 text-sm font-bold text-white"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Exercise Swap Modal */}
      {swapTargetBlock && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl">
            <h2 className="text-lg font-bold text-slate-900">
              Swap {swapTargetBlock.exercise.name}
            </h2>
            <input
              type="text"
              value={swapSearch}
              onChange={(e) => setSwapSearch(e.target.value)}
              placeholder={`Search ${swapCandidates.length} alternatives...`}
              className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs text-slate-900 outline-none focus:border-blue-600"
            />
            <div className="max-h-72 space-y-2 overflow-y-auto">
              {(() => {
                const q = swapSearch.trim().toLowerCase();
                const filtered = q
                  ? swapCandidates.filter(
                      (c) =>
                        c.name.toLowerCase().includes(q) ||
                        (c.primaryMuscle ?? '').toLowerCase().includes(q),
                    )
                  : swapCandidates;
                if (filtered.length === 0) {
                  return (
                    <p className="text-xs text-slate-500">
                      No safe alternatives match your search.
                    </p>
                  );
                }
                return filtered.map((cand) => (
                  <button
                    key={cand.slug}
                    type="button"
                    onClick={() => {
                      setSlotOverrides((prev) => ({
                        ...prev,
                        [swapTargetBlock.id]: cand.slug,
                      }));
                      setSwapTargetBlock(null);
                    }}
                    className="flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-left hover:bg-blue-50/50"
                  >
                    <ExerciseAnimator slug={cand.slug} alt={cand.name} className="h-12 w-12 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-bold text-slate-900">{cand.name}</div>
                      <div className="truncate text-[11px] text-slate-500">
                        {cand.primaryMuscle ? `${cand.primaryMuscle} · ` : ''}
                        {cand.cues}
                      </div>
                    </div>
                  </button>
                ));
              })()}
            </div>
            <button
              type="button"
              onClick={() => setSwapTargetBlock(null)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 text-sm font-semibold text-slate-600"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Floating Frosted-Glass Pill Navigation Dock */}
      <nav className="fixed bottom-3 left-3 right-3 z-40 mx-auto max-w-[424px] rounded-2xl border border-slate-200/80 bg-white/88 px-1.5 py-1.5 shadow-xl shadow-slate-900/10 backdrop-blur-xl">
        <div className="grid grid-cols-5 gap-1">
          <button
            type="button"
            data-tour-id="nav-today"
            onClick={() => {
              setTab('today');
              advanceTourIfStep('nav_today');
            }}
            className={`flex flex-col items-center gap-0.5 rounded-xl py-1.5 text-[10px] font-semibold transition active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
              tab === 'today'
                ? 'bg-blue-50 text-blue-700 font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Flame className="h-4.5 w-4.5" />
            Today
          </button>
          <button
            type="button"
            data-tour-id="nav-kegel"
            onClick={() => {
              setTab('kegel');
              advanceTourIfStep('nav_kegel');
            }}
            className={`flex flex-col items-center gap-0.5 rounded-xl py-1.5 text-[10px] font-semibold transition active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
              tab === 'kegel'
                ? 'bg-blue-50 text-blue-700 font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <CircleDot className="h-4.5 w-4.5" />
            Kegel
          </button>
          <button
            type="button"
            data-tour-id="nav-plan"
            onClick={() => {
              setTab('plan');
              advanceTourIfStep('nav_plan');
            }}
            className={`flex flex-col items-center gap-0.5 rounded-xl py-1.5 text-[10px] font-semibold transition active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
              tab === 'plan'
                ? 'bg-blue-50 text-blue-700 font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <CalendarDays className="h-4.5 w-4.5" />
            Plan
          </button>
          <button
            type="button"
            data-tour-id="nav-sync"
            onClick={() => {
              setTab('sync');
              advanceTourIfStep('nav_sync');
            }}
            className={`flex flex-col items-center gap-0.5 rounded-xl py-1.5 text-[10px] font-semibold transition active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
              tab === 'sync'
                ? 'bg-blue-50 text-blue-700 font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Cloud className="h-4.5 w-4.5" />
            Sync
          </button>
          <button
            type="button"
            onClick={() => setTab('settings')}
            className={`flex flex-col items-center gap-0.5 rounded-xl py-1.5 text-[10px] font-semibold transition active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
              tab === 'settings'
                ? 'bg-blue-50 text-blue-700 font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Settings className="h-4.5 w-4.5" />
            Settings
          </button>
        </div>
      </nav>

      {breathModalOpen && (
        <BreathworkModal
          onClose={() => setBreathModalOpen(false)}
          onComplete={handleCompleteBreathwork}
        />
      )}

      {cardioModalOpen && (
        <CardioModesModal
          profile={profile}
          logs={logs}
          cardioFinisherActive={cardioActive}
          isCardioForced={isCardioForced}
          onToggleFinisher={handleToggleCardioFinisher}
          onLogCardioSession={handleLogCardioSession}
          onClose={() => setCardioModalOpen(false)}
        />
      )}

      {tourStepIdx !== null && (
        <AppTourOverlay
          steps={TOUR_STEPS}
          currentStepIdx={tourStepIdx}
          onSkip={() => void finishTour()}
          onFallbackNext={() => {
            if (tourStepIdx >= TOUR_STEPS.length - 1) {
              void finishTour();
            } else {
              setTourStepIdx(tourStepIdx + 1);
            }
          }}
        />
      )}
    </div>
  );
}

export default App;
