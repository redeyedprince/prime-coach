import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeftRight,
  ArrowRight,
  BatteryCharging,
  CheckCircle2,
  Flame,
  Lightbulb,
  LogOut,
  Minus,
  Moon,
  Pause,
  Play,
  Plus,
  SkipForward,
  Timer,
  Vibrate,
  Volume2,
  VolumeX,
  Zap,
} from 'lucide-react';
import {
  formatReadableTempo,
  getAlternativeExercisesForSlot,
  getHouseholdToolTip,
  getSessionEquipmentChecklist,
  isUnilateralExercise,
  type FloorExercise,
  type SessionBlock,
} from '../../data/exerciseCatalog';
import { appendWorkoutLog, loadAllWorkoutLogs, saveProgramConfig } from '../../db/database';
import { computeWorkingSets, evaluateOfflineProgression } from '../../engine/progression';
import type {
  CueStyle,
  JointTag,
  MovementPattern,
  ProgramConfig,
  ReadinessLevel,
  SleepQuality,
  UserProfile,
  WorkoutLogEntry,
} from '../../types/schemas';
import { playPhaseTick, triggerRestCue } from '../../utils/cues';
import { CelebrationBurst } from '../common/CelebrationBurst';
import { TermHint } from '../common/TermHint';
import { ExerciseAnimator } from './ExerciseAnimator';

interface WorkoutPlayerProps {
  profile: UserProfile;
  config: ProgramConfig;
  blocks: SessionBlock[];
  dayLabel: string;
  initialSleepQuality?: SleepQuality;
  onConfigUpdated: (next: ProgramConfig) => void;
  onExit: () => void;
}

type PlayerPhase =
  | 'readiness'
  | 'briefing'
  | 'get_ready'
  | 'active_set'
  | 'log_set'
  | 'rest'
  | 'summary';

interface TempoStep {
  label: string;
  shortLabel: string;
  coachLine: string;
  breathCue: string;
  seconds: number;
  frameIdx: number;
  isUp: boolean;
  colorClass: string;
  barClass: string;
}

function buildTempoSteps(tempo: string): TempoStep[] {
  const parts = tempo.split('-').map((n) => Number(n));
  const [ecc, bot, con, top] =
    parts.length === 4 && parts.every((n) => !Number.isNaN(n)) ? parts : [2, 1, 2, 0];

  const steps: TempoStep[] = [];
  if (ecc > 0) {
    steps.push({
      label: 'GO DOWN',
      shortLabel: `${ecc}s Down`,
      coachLine: `Lower slowly with control (${ecc}s)`,
      breathCue: 'Inhale slowly as you lower',
      seconds: ecc,
      frameIdx: 1,
      isUp: false,
      colorClass: 'text-sky-700',
      barClass: 'bg-sky-500',
    });
  }
  if (bot > 0) {
    steps.push({
      label: 'HOLD',
      shortLabel: `${bot}s Hold`,
      coachLine: `Hold steady at the bottom (${bot}s)`,
      breathCue: 'Brace core lightly — do not hold breath',
      seconds: bot,
      frameIdx: 1,
      isUp: false,
      colorClass: 'text-amber-700',
      barClass: 'bg-amber-500',
    });
  }
  if (con > 0) {
    steps.push({
      label: 'GO UP',
      shortLabel: `${con}s Up`,
      coachLine: `Drive up strong (${con}s)`,
      breathCue: 'Exhale smoothly as you push up',
      seconds: con,
      frameIdx: 2,
      isUp: true,
      colorClass: 'text-blue-700',
      barClass: 'bg-blue-600',
    });
  }
  if (top > 0) {
    steps.push({
      label: 'PAUSE',
      shortLabel: `${top}s Pause`,
      coachLine: `Reset & breathe (${top}s)`,
      breathCue: 'Quick breath before next rep',
      seconds: top,
      frameIdx: 0,
      isUp: false,
      colorClass: 'text-slate-600',
      barClass: 'bg-slate-400',
    });
  }
  return steps.length > 0
    ? steps
    : [
        {
          label: 'GO DOWN',
          shortLabel: '2s Down',
          coachLine: 'Lower slowly (2s)',
          breathCue: 'Inhale slowly as you lower',
          seconds: 2,
          frameIdx: 1,
          isUp: false,
          colorClass: 'text-sky-700',
          barClass: 'bg-sky-500',
        },
        {
          label: 'GO UP',
          shortLabel: '2s Up',
          coachLine: 'Drive up strong (2s)',
          breathCue: 'Exhale smoothly as you drive up',
          seconds: 2,
          frameIdx: 2,
          isUp: true,
          colorClass: 'text-blue-700',
          barClass: 'bg-blue-600',
        },
      ];
}

const EFFORT_OPTIONS = [
  { rir: 0, label: 'Maxed Out', hint: '0 left' },
  { rir: 1, label: 'Very Hard', hint: '1 left' },
  { rir: 2, label: 'Just Right', hint: '2 left' },
  { rir: 3, label: 'Too Easy', hint: '3+ left' },
] as const;

const SORENESS_CHIPS: Array<{ id: JointTag; label: string }> = [
  { id: 'none', label: 'None' },
  { id: 'wrist', label: 'Wrist' },
  { id: 'shoulder', label: 'Shoulder' },
  { id: 'elbow', label: 'Elbow' },
  { id: 'knee', label: 'Knee' },
  { id: 'lower_back', label: 'Lower Back' },
];

const CUE_CYCLE: CueStyle[] = ['audio_and_vibrate', 'vibrate_only', 'silent_visual'];

export function WorkoutPlayer({
  profile,
  config,
  blocks,
  dayLabel,
  initialSleepQuality,
  onConfigUpdated,
  onExit,
}: WorkoutPlayerProps) {
  const mappedInitialReadiness: ReadinessLevel =
    initialSleepQuality === 'great'
      ? 'fresh'
      : initialSleepQuality === 'poor'
        ? 'fatigued'
        : 'normal';
  const [liveBlocks, setLiveBlocks] = useState<SessionBlock[]>(blocks);
  const [phase, setPhase] = useState<PlayerPhase>(initialSleepQuality ? 'briefing' : 'readiness');
  const [readiness, setReadiness] = useState<ReadinessLevel>(mappedInitialReadiness);
  const [activeCueStyle, setActiveCueStyle] = useState<CueStyle>(profile.cue_style);
  const [exitConfirmOpen, setExitConfirmOpen] = useState(false);
  const [swapModalOpen, setSwapModalOpen] = useState(false);
  const [sessionId] = useState(() => `sess_${Date.now()}`);

  const [blockIdx, setBlockIdx] = useState(0);
  const [setNumber, setSetNumber] = useState(1);

  const currentBlock = liveBlocks[blockIdx] ?? liveBlocks[0];
  const exercise = currentBlock.exercise;
  // Today's blocks are already volume-scaled when initialSleepQuality === 'poor', so avoid double-reducing
  const effectiveReadinessForSets: ReadinessLevel =
    initialSleepQuality === 'poor' && readiness === 'fatigued' ? 'normal' : readiness;
  const totalSets =
    currentBlock.role === 'warmup'
      ? 1
      : computeWorkingSets(currentBlock.sets, effectiveReadinessForSets, config.global_modifiers);

  const [readySeconds, setReadySeconds] = useState(5);

  const tempoSteps = useMemo(() => buildTempoSteps(currentBlock.tempo), [currentBlock.tempo]);
  const [pacerRunning, setPacerRunning] = useState(true);
  const [repCount, setRepCount] = useState(1);
  const [stepIdx, setStepIdx] = useState(0);
  const [stepRemaining, setStepRemaining] = useState(tempoSteps[0]?.seconds ?? 2);

  const [holdRemaining, setHoldRemaining] = useState(currentBlock.min_target);
  const [holdRunning, setHoldRunning] = useState(true);

  const [completedValue, setCompletedValue] = useState(currentBlock.min_target);
  const [rir, setRir] = useState<number>(2);
  const [sorenessTag, setSorenessTag] = useState<JointTag>('none');
  const [notes, setNotes] = useState('');

  const [restRemaining, setRestRemaining] = useState(0);
  const warned3sRef = useRef(false);

  const [progressedPatterns, setProgressedPatterns] = useState<MovementPattern[]>([]);
  const [loggedCount, setLoggedCount] = useState(0);

  const gearChecklist = useMemo(
    () => getSessionEquipmentChecklist(liveBlocks, profile.dumbbell_kg),
    [liveBlocks, profile.dumbbell_kg],
  );
  const toolTip = getHouseholdToolTip(exercise, profile.dumbbell_kg);
  const isUnilateral = isUnilateralExercise(exercise);
  const swapCandidates: FloorExercise[] = useMemo(
    () => (swapModalOpen ? getAlternativeExercisesForSlot(exercise, profile).slice(0, 15) : []),
    [swapModalOpen, exercise, profile],
  );

  // WakeLock during active workout
  useEffect(() => {
    if (phase === 'readiness' || phase === 'summary') return;
    let sentinel: WakeLockSentinel | null = null;
    let active = true;

    const acquire = async () => {
      if (!active || !('wakeLock' in navigator)) return;
      try {
        sentinel = await navigator.wakeLock.request('screen');
      } catch {
        // Ignore if battery saver / unsupported
      }
    };

    const onVisChange = () => {
      if (document.visibilityState === 'visible') {
        void acquire();
      }
    };

    void acquire();
    document.addEventListener('visibilitychange', onVisChange);

    return () => {
      active = false;
      document.removeEventListener('visibilitychange', onVisChange);
      if (sentinel) {
        void sentinel.release();
      }
    };
  }, [phase]);

  // Get Ready 3-2-1 countdown
  useEffect(() => {
    if (phase !== 'get_ready') return;
    if (readySeconds <= 0) {
      triggerRestCue(activeCueStyle, 'warning_3s');
      setPhase('active_set');
      return;
    }
    const id = window.setTimeout(() => setReadySeconds((s) => s - 1), 1000);
    return () => window.clearTimeout(id);
  }, [phase, readySeconds, activeCueStyle]);

  // PT Tempo Pacer countdown (for reps)
  useEffect(() => {
    if (phase !== 'active_set' || exercise.unit !== 'reps' || !pacerRunning) return;

    const id = window.setTimeout(() => {
      if (stepRemaining > 1) {
        setStepRemaining((s) => s - 1);
        return;
      }
      const nextStepIdx = (stepIdx + 1) % tempoSteps.length;
      const nextStep = tempoSteps[nextStepIdx];
      playPhaseTick(activeCueStyle, nextStep.isUp);

      if (nextStepIdx === 0) {
        setRepCount((r) => r + 1);
      }

      setStepIdx(nextStepIdx);
      setStepRemaining(nextStep.seconds);
    }, 1000);

    return () => window.clearTimeout(id);
  }, [phase, exercise.unit, pacerRunning, stepIdx, stepRemaining, tempoSteps, activeCueStyle]);

  // Timed hold countdown (for seconds)
  useEffect(() => {
    if (phase !== 'active_set' || exercise.unit !== 'seconds' || !holdRunning) return;
    if (holdRemaining <= 0) {
      setHoldRunning(false);
      triggerRestCue(activeCueStyle, 'complete');
      return;
    }
    const id = window.setTimeout(() => setHoldRemaining((s) => s - 1), 1000);
    return () => window.clearTimeout(id);
  }, [phase, exercise.unit, holdRunning, holdRemaining, activeCueStyle]);

  // Rest timer countdown
  useEffect(() => {
    if (phase !== 'rest') return;
    if (restRemaining === 3 && !warned3sRef.current) {
      warned3sRef.current = true;
      triggerRestCue(activeCueStyle, 'warning_3s');
    }
    if (restRemaining <= 0) {
      triggerRestCue(activeCueStyle, 'complete');
      advanceAfterRest();
      return;
    }
    const id = window.setTimeout(() => setRestRemaining((s) => s - 1), 1000);
    return () => window.clearTimeout(id);
  });

  const cycleCueStyle = () => {
    const idx = CUE_CYCLE.indexOf(activeCueStyle);
    setActiveCueStyle(CUE_CYCLE[(idx + 1) % CUE_CYCLE.length]);
  };

  const resetSetPacer = (targetBlock: SessionBlock) => {
    const steps = buildTempoSteps(targetBlock.tempo);
    setRepCount(1);
    setStepIdx(0);
    setStepRemaining(steps[0]?.seconds ?? 2);
    setPacerRunning(true);
    setHoldRemaining(targetBlock.min_target);
    setHoldRunning(true);
    setCompletedValue(targetBlock.min_target);
    setReadySeconds(5);
  };

  const startSession = (chosenReadiness: ReadinessLevel) => {
    setReadiness(chosenReadiness);
    setBlockIdx(0);
    setSetNumber(1);
    resetSetPacer(liveBlocks[0]);
    setPhase('briefing');
  };

  const advanceAfterRest = () => {
    if (setNumber < totalSets) {
      setSetNumber((s) => s + 1);
      resetSetPacer(currentBlock);
      setPhase('briefing');
      return;
    }

    if (blockIdx < liveBlocks.length - 1) {
      const nextIdx = blockIdx + 1;
      setBlockIdx(nextIdx);
      setSetNumber(1);
      resetSetPacer(liveBlocks[nextIdx]);
      setPhase('briefing');
      return;
    }

    void finishWorkout();
  };

  const handleSkipCurrentBlock = () => {
    if (blockIdx < liveBlocks.length - 1) {
      const nextIdx = blockIdx + 1;
      setBlockIdx(nextIdx);
      setSetNumber(1);
      resetSetPacer(liveBlocks[nextIdx]);
      setPhase('briefing');
    } else {
      void finishWorkout();
    }
  };

  const handleSwapCurrentExercise = (replacement: FloorExercise) => {
    const updatedBlock: SessionBlock = {
      ...currentBlock,
      exercise: replacement,
      unit: replacement.unit,
      min_target: replacement.unit === 'seconds' ? 30 : Math.min(18, currentBlock.min_target),
      max_target: replacement.unit === 'seconds' ? 45 : Math.min(25, currentBlock.max_target),
    };
    const nextBlocks = liveBlocks.map((b, i) => (i === blockIdx ? updatedBlock : b));
    setLiveBlocks(nextBlocks);
    resetSetPacer(updatedBlock);
    setSwapModalOpen(false);
  };

  const finishWorkout = async () => {
    const allLogs = await loadAllWorkoutLogs();
    const { updatedConfig, progressedPatterns: progressed } = evaluateOfflineProgression(
      config,
      allLogs,
    );
    if (progressed.length > 0) {
      await saveProgramConfig(updatedConfig);
      onConfigUpdated(updatedConfig);
    }
    setProgressedPatterns(progressed);
    setPhase('summary');
  };

  const handleSaveSet = async () => {
    const equipNote =
      exercise.required_equipment === 'dumbbell' && profile.dumbbell_kg
        ? `[${profile.dumbbell_kg}kg weight]`
        : exercise.required_equipment === 'chair_bench'
          ? '[chair/sofa]'
          : exercise.required_equipment === 'gym'
            ? '[gym]'
            : '';
    const mergedNotes = [equipNote, notes.trim()].filter(Boolean).join(' ');

    const entry: Omit<WorkoutLogEntry, 'id'> = {
      date: new Date().toISOString().slice(0, 10),
      completed_at: new Date().toISOString(),
      location: profile.active_location ?? 'home_calisthenics',
      session_id: sessionId,
      readiness,
      bodyweight_kg: profile.bodyweight_kg ?? null,
      pattern: currentBlock.pattern,
      exercise_slug: exercise.slug,
      set_number: setNumber,
      target_value: currentBlock.min_target,
      completed_value: completedValue,
      unit: exercise.unit,
      rir,
      soreness_tag: sorenessTag,
      notes: mergedNotes,
    };
    await appendWorkoutLog(entry);
    setLoggedCount((c) => c + 1);
    setNotes('');
    setSorenessTag('none');

    const isFinalSet = setNumber >= totalSets && blockIdx >= liveBlocks.length - 1;
    if (isFinalSet) {
      await finishWorkout();
      return;
    }

    const restSeconds = Math.max(
      15,
      currentBlock.rest_seconds + config.global_modifiers.rest_adjustment_seconds,
    );
    warned3sRef.current = false;
    setRestRemaining(restSeconds);
    setPhase('rest');
  };

  const getNextUpInfo = () => {
    if (setNumber < totalSets) {
      return {
        label: `Set ${setNumber + 1} of ${totalSets}`,
        block: currentBlock,
      };
    }
    const nextBlock = liveBlocks[blockIdx + 1];
    if (nextBlock) {
      return {
        label: `${nextBlock.roleLabel} · Set 1`,
        block: nextBlock,
      };
    }
    return null;
  };

  const renderTopControls = () => (
    <div className="mb-3 flex items-center justify-between gap-2">
      <button
        type="button"
        onClick={() => setExitConfirmOpen(true)}
        className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 shadow-xs hover:bg-slate-100"
      >
        <LogOut className="h-3.5 w-3.5" />
        Exit
      </button>
      <span className="text-xs font-semibold text-slate-500">
        Block {blockIdx + 1}/{liveBlocks.length} · Set {setNumber}/{totalSets}
      </span>
      <button
        type="button"
        onClick={cycleCueStyle}
        className="flex items-center gap-1 rounded-xl border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-xs font-semibold text-blue-700"
        title="Tap to switch Sound / Vibrate / Silent"
      >
        {activeCueStyle === 'audio_and_vibrate' ? (
          <>
            <Volume2 className="h-3.5 w-3.5" />
            Sound
          </>
        ) : activeCueStyle === 'vibrate_only' ? (
          <>
            <Vibrate className="h-3.5 w-3.5" />
            Vibrate
          </>
        ) : (
          <>
            <VolumeX className="h-3.5 w-3.5" />
            Silent
          </>
        )}
      </button>
    </div>
  );

  const renderOverlays = () => (
    <>
      {exitConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl text-left">
            <h2 className="text-base font-bold text-slate-900">End Workout Early?</h2>
            <p className="text-xs text-slate-600 leading-relaxed">
              {loggedCount > 0
                ? `You have already saved ${loggedCount} completed ${loggedCount === 1 ? 'set' : 'sets'}. Everything logged so far is safely stored.`
                : 'No sets logged yet. You can resume anytime from Today.'}
            </p>
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setExitConfirmOpen(false)}
                className="flex-1 rounded-xl bg-blue-600 py-2.5 text-xs font-bold text-white"
              >
                Keep Going
              </button>
              <button
                type="button"
                onClick={() => {
                  setExitConfirmOpen(false);
                  onExit();
                }}
                className="flex-1 rounded-xl border border-slate-200 bg-slate-50 py-2.5 text-xs font-semibold text-slate-700"
              >
                Exit Workout
              </button>
            </div>
          </div>
        </div>
      )}

      {swapModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl text-left">
            <h2 className="text-base font-bold text-slate-900">
              Swap {exercise.name}
            </h2>
            <p className="text-xs text-slate-500">
              Pick a more comfortable alternative for this slot:
            </p>
            <div className="max-h-72 space-y-2 overflow-y-auto">
              {swapCandidates.map((cand) => (
                <button
                  key={cand.slug}
                  type="button"
                  onClick={() => handleSwapCurrentExercise(cand)}
                  className="flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-left hover:bg-blue-50/60"
                >
                  <ExerciseAnimator slug={cand.slug} alt={cand.name} className="h-12 w-12 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-bold text-slate-900">{cand.name}</div>
                    <div className="truncate text-[11px] text-slate-500">{cand.cues}</div>
                  </div>
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setSwapModalOpen(false)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 text-xs font-semibold text-slate-600"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </>
  );

  if (phase === 'readiness') {
    return (
      <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-between bg-slate-50 px-4 py-6 text-slate-900">
        <div className="space-y-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600">
              {dayLabel} · {liveBlocks.length} Blocks
            </span>
            <h1 className="mt-1 text-2xl font-bold text-slate-900">
              Hi {profile.user_name}, how are you feeling?
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Readiness adjusts today&apos;s sets automatically so you train safely.
            </p>
          </div>

          <div className="flex items-start gap-2 rounded-2xl border border-blue-200 bg-blue-50/80 p-3 text-xs text-blue-900">
            <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
            <span>{gearChecklist}</span>
          </div>

          <div className="space-y-3">
            <button
              type="button"
              onClick={() => startSession('fresh')}
              className="flex w-full items-center gap-3.5 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-left shadow-xs active:scale-[0.99]"
            >
              <Zap className="h-6 w-6 shrink-0 text-blue-600" />
              <div>
                <div className="font-bold text-slate-900">Fresh (+1 Set)</div>
                <div className="text-xs text-slate-600">High energy, well rested, ready to push</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => startSession('normal')}
              className="flex w-full items-center gap-3.5 rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-xs active:scale-[0.99]"
            >
              <Flame className="h-6 w-6 shrink-0 text-sky-600" />
              <div>
                <div className="font-bold text-slate-900">Normal (Standard Sets)</div>
                <div className="text-xs text-slate-500">Everyday baseline energy</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => startSession('fatigued')}
              className="flex w-full items-center gap-3.5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-left shadow-xs active:scale-[0.99]"
            >
              {profile.biological_sex === 'female' ? (
                <Moon className="h-6 w-6 shrink-0 text-amber-600" />
              ) : (
                <BatteryCharging className="h-6 w-6 shrink-0 text-amber-600" />
              )}
              <div>
                <div className="font-bold text-slate-900">
                  {profile.biological_sex === 'female'
                    ? 'Low Energy / Cycle Phase (-1 Set)'
                    : 'Tired / Sore (-1 Set)'}
                </div>
                <div className="text-xs text-slate-600">
                  {profile.biological_sex === 'female'
                    ? 'Smooth tempo, joint-friendly lighter volume'
                    : 'Low sleep, travel fatigue, or stiff joints'}
                </div>
              </div>
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={onExit}
          className="rounded-xl border border-slate-200 bg-white py-3.5 text-sm font-semibold text-slate-700 shadow-xs"
        >
          Back to Today
        </button>
      </div>
    );
  }

  if (phase === 'briefing') {
    return (
      <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-between bg-slate-50 px-4 py-5 text-slate-900">
        <div>
          {renderTopControls()}
          <div className="space-y-3.5">
            <div className="flex items-center justify-between gap-2">
              <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold uppercase text-blue-700">
                {currentBlock.roleLabel}
              </span>
              {isUnilateral && (
                <span className="inline-flex items-center gap-1 rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-[11px] font-bold text-sky-800">
                  Per Side (Left &amp; Right)
                  <TermHint termId="per_side" />
                </span>
              )}
            </div>

            <div className="flex flex-col items-center rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <ExerciseAnimator slug={exercise.slug} alt={exercise.name} className="h-44 w-44" />
              <h1 className="mt-3 text-xl font-bold text-slate-900 text-center">
                {exercise.name}
                {exercise.required_equipment === 'dumbbell' && profile.dumbbell_kg
                  ? ` (${profile.dumbbell_kg} kg)`
                  : ''}
              </h1>
              <p className="mt-1 text-center text-xs text-slate-600">{exercise.cues}</p>
            </div>

            {toolTip && (
              <div className="flex items-start gap-2 rounded-2xl border border-blue-200 bg-blue-50/80 p-3 text-xs text-blue-900">
                <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                <span>{toolTip}</span>
              </div>
            )}

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-2.5">
              <div className="text-xs font-bold uppercase text-blue-600">How This Set Works</div>
              {exercise.unit === 'reps' ? (
                <>
                  <p className="text-xs text-slate-600">
                    Target:{' '}
                    <strong>
                      {currentBlock.min_target}–{currentBlock.max_target} reps
                      {isUnilateral ? ' each side' : ''}
                    </strong>
                    . Rhythm: <strong>{formatReadableTempo(currentBlock.tempo)}</strong>
                  </p>
                  <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                    {tempoSteps.map((s, i) => (
                      <div key={`${s.label}-${i}`} className="flex items-center gap-1.5">
                        <span
                          className={`rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-bold ${s.colorClass}`}
                        >
                          {s.shortLabel}
                        </span>
                        {i < tempoSteps.length - 1 && (
                          <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
                        )}
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-xs text-slate-600">
                  Hold steady for{' '}
                  <strong>
                    {currentBlock.min_target} seconds{isUnilateral ? ' per side' : ''}
                  </strong>{' '}
                  while breathing smoothly.
                </p>
              )}
              <div className="border-t border-slate-100 pt-2 text-[11px] text-slate-500">
                Why: {currentBlock.why}
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setSwapModalOpen(true)}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                <ArrowLeftRight className="h-3.5 w-3.5 text-blue-600" />
                Swap This Move
              </button>
              <button
                type="button"
                onClick={handleSkipCurrentBlock}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                <SkipForward className="h-3.5 w-3.5" />
                Skip Exercise
              </button>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            setReadySeconds(5);
            setPhase('get_ready');
          }}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-4 text-base font-bold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700"
        >
          <Play className="h-5 w-5 fill-current" />
          Start Exercise (5s Countdown)
        </button>
        {renderOverlays()}
      </div>
    );
  }

  if (phase === 'get_ready') {
    const firstStep = tempoSteps[0];
    return (
      <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-between bg-slate-50 px-4 py-6 text-center text-slate-900">
        <div>
          {renderTopControls()}
          <div className="space-y-3 pt-2">
            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold uppercase text-amber-800">
              Get Into Starting Position
            </span>
            <h1 className="text-2xl font-bold text-slate-900">{exercise.name}</h1>
            <div className="mx-auto flex justify-center">
              <ExerciseAnimator
                slug={exercise.slug}
                alt={exercise.name}
                forcedFrameIdx={0}
                className="h-44 w-44"
              />
            </div>
            <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
              <div className="text-xs font-bold uppercase text-blue-700">When timer hits 0:</div>
              <div className="mt-1 text-lg font-extrabold text-slate-900">
                {exercise.unit === 'reps'
                  ? `${firstStep.label} (${firstStep.seconds}s)`
                  : `HOLD STEADY (${currentBlock.min_target}s)`}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="text-7xl font-black tabular-nums text-blue-600">{readySeconds}</div>
          <button
            type="button"
            onClick={() => setPhase('active_set')}
            className="w-full rounded-xl border border-slate-200 bg-white py-3.5 text-sm font-semibold text-slate-700 shadow-xs"
          >
            Skip Countdown
          </button>
        </div>
        {renderOverlays()}
      </div>
    );
  }

  if (phase === 'active_set') {
    const activeStep = tempoSteps[stepIdx] ?? tempoSteps[0];
    const phaseProgressPct = Math.round(
      ((activeStep.seconds - stepRemaining + 1) / activeStep.seconds) * 100,
    );
    const holdProgressPct = Math.round(
      ((currentBlock.min_target - holdRemaining) / Math.max(1, currentBlock.min_target)) * 100,
    );

    const ptDynamicCue =
      repCount > currentBlock.min_target
        ? `Target hit, ${profile.user_name}! Finish clean or log set.`
        : repCount >= Math.max(1, currentBlock.min_target - 1)
          ? 'Last 2 reps — stop when you feel ~2 clean reps left!'
          : repCount >= Math.ceil(currentBlock.min_target / 2)
            ? 'Halfway there — keep your form smooth!'
            : activeStep.coachLine;

    return (
      <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-between bg-slate-50 px-4 py-5 text-slate-900">
        <div>
          {renderTopControls()}
          <div className="space-y-3.5">
            <div className="flex items-center justify-between gap-2">
              <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold uppercase text-blue-700">
                {currentBlock.roleLabel}
              </span>
              <span className="text-xs font-medium text-slate-500">
                {exercise.unit === 'reps'
                  ? formatReadableTempo(currentBlock.tempo)
                  : 'Steady Timed Effort'}
              </span>
            </div>

            <div className="flex flex-col items-center rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <ExerciseAnimator
                slug={exercise.slug}
                alt={exercise.name}
                tempo={currentBlock.tempo}
                forcedFrameIdx={exercise.unit === 'reps' ? activeStep.frameIdx : undefined}
                className="h-44 w-44"
              />
              <h2 className="mt-3 text-lg font-bold text-slate-900 text-center">
                {exercise.name}
                {exercise.required_equipment === 'dumbbell' && profile.dumbbell_kg
                  ? ` (${profile.dumbbell_kg} kg)`
                  : ''}
              </h2>
              {isUnilateral && (
                <span className="mt-1 rounded-full bg-sky-50 px-2.5 py-0.5 text-[11px] font-semibold text-sky-800">
                  Do both Left &amp; Right sides
                </span>
              )}
            </div>

            {exercise.unit === 'reps' ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <div className="pr-2">
                    <div className={`text-sm font-extrabold uppercase ${activeStep.colorClass}`}>
                      {activeStep.label}
                    </div>
                    <div className="text-sm font-medium text-slate-800">{ptDynamicCue}</div>
                    <div className="mt-0.5 text-[11px] font-medium text-blue-600">
                      {activeStep.breathCue}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-3xl font-black tabular-nums text-blue-600">
                      {stepRemaining}s
                    </div>
                    <div className="text-[11px] font-semibold text-slate-500">
                      Rep {repCount} / {currentBlock.min_target}
                    </div>
                  </div>
                </div>

                <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full transition-all duration-500 ${activeStep.barClass}`}
                    style={{ width: `${phaseProgressPct}%` }}
                  />
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs text-slate-500">
                    Target: {currentBlock.min_target}–{currentBlock.max_target} reps
                  </span>
                  <button
                    type="button"
                    onClick={() => setPacerRunning((r) => !r)}
                    className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-800"
                  >
                    {pacerRunning ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                    {pacerRunning ? 'Pause' : 'Resume'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-slate-200 bg-white p-4 text-center shadow-sm space-y-3">
                <div className="text-xs font-bold uppercase text-blue-600">
                  STEADY EFFORT · KEEP BREATHING SMOOTHLY
                </div>
                <div className="text-4xl font-extrabold tabular-nums text-blue-600">
                  {holdRemaining}s
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full bg-blue-600 transition-all duration-500"
                    style={{ width: `${holdProgressPct}%` }}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setHoldRunning((r) => !r)}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-5 py-2 text-sm font-bold text-slate-800"
                >
                  {holdRunning ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  {holdRunning ? 'Pause Timer' : 'Resume Timer'}
                </button>
              </div>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            setCompletedValue(
              exercise.unit === 'seconds'
                ? Math.max(1, currentBlock.min_target - holdRemaining) || currentBlock.min_target
                : Math.max(1, Math.min(currentBlock.max_target, repCount)),
            );
            setPhase('log_set');
          }}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-4 text-base font-bold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700"
        >
          <CheckCircle2 className="h-5 w-5" />
          Complete &amp; Log Set
        </button>
        {renderOverlays()}
      </div>
    );
  }

  if (phase === 'log_set') {
    return (
      <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-between bg-slate-50 px-4 py-5 text-slate-900">
        <div>
          {renderTopControls()}
          <div className="space-y-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-blue-600">
                Log Set {setNumber} · {exercise.name}
              </span>
              <h1 className="mt-1 text-2xl font-bold text-slate-900">Nice work, {profile.user_name}!</h1>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="text-center text-xs font-semibold uppercase text-slate-500">
                Completed ({exercise.unit}{isUnilateral ? ' per side' : ''})
              </div>
              <div className="mt-3 flex items-center justify-center gap-6">
                <button
                  type="button"
                  onClick={() =>
                    setCompletedValue((v) => Math.max(0, v - (exercise.unit === 'seconds' ? 5 : 1)))
                  }
                  className="flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-800"
                >
                  <Minus className="h-6 w-6" />
                </button>
                <span className="w-20 text-center text-4xl font-extrabold tabular-nums text-blue-600">
                  {completedValue}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setCompletedValue((v) => v + (exercise.unit === 'seconds' ? 5 : 1))
                  }
                  className="flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-800"
                >
                  <Plus className="h-6 w-6" />
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-1 text-xs font-semibold uppercase text-slate-500">
                <span>How Hard Did That Feel? (Effort)</span>
                <TermHint termId="reps_in_tank" />
              </label>
              <div className="grid grid-cols-2 gap-2">
                {EFFORT_OPTIONS.map((opt) => (
                  <button
                    key={opt.rir}
                    type="button"
                    onClick={() => setRir(opt.rir)}
                    className={`rounded-xl border p-2.5 text-left transition ${
                      rir === opt.rir
                        ? 'border-blue-600 bg-blue-50 text-blue-900 ring-1 ring-blue-600'
                        : 'border-slate-200 bg-white text-slate-700'
                    }`}
                  >
                    <div className="text-xs font-bold">{opt.label}</div>
                    <div className="text-[10px] text-slate-500">{opt.hint} in the tank</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase text-slate-500">
                Any Joint Discomfort?
              </label>
              <div className="flex flex-wrap gap-2">
                {SORENESS_CHIPS.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSorenessTag(c.id)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
                      sorenessTag === c.id
                        ? 'border-amber-400 bg-amber-50 text-amber-800'
                        : 'border-slate-200 bg-white text-slate-600'
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold uppercase text-slate-500">Notes (Optional)</label>
              <input
                type="text"
                placeholder="e.g. Used 5kg water jug, felt smooth..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-600"
              />
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => void handleSaveSet()}
          className="mt-5 w-full rounded-xl bg-blue-600 py-4 text-base font-bold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700"
        >
          Save Set &amp; Start Rest
        </button>
        {renderOverlays()}
      </div>
    );
  }

  if (phase === 'rest') {
    const nextUp = getNextUpInfo();
    return (
      <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-between bg-slate-50 px-4 py-6 text-center text-slate-900">
        <div>
          {renderTopControls()}
          <div className="space-y-2 pt-2">
            <Timer className="mx-auto h-10 w-10 text-blue-600" />
            <h1 className="text-xl font-bold text-slate-900">Rest &amp; Recover</h1>
            <p className="text-xs text-slate-500">
              Alerts fire at 0:03 and 0:00 ({activeCueStyle.replace(/_/g, ' ')})
            </p>
          </div>
        </div>

        <div className="text-7xl font-black tracking-tight tabular-nums text-blue-600">
          {Math.floor(restRemaining / 60)}:{String(restRemaining % 60).padStart(2, '0')}
        </div>

        {nextUp && (
          <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 text-left shadow-sm">
            <ExerciseAnimator
              slug={nextUp.block.exercise.slug}
              alt={nextUp.block.exercise.name}
              className="h-16 w-16 shrink-0"
            />
            <div className="min-w-0 flex-1">
              <div className="text-[11px] font-bold uppercase text-blue-600">
                Up Next · {nextUp.label}
              </div>
              <div className="truncate font-bold text-slate-900">
                {nextUp.block.exercise.name}
                {nextUp.block.exercise.required_equipment === 'dumbbell' && profile.dumbbell_kg
                  ? ` (${profile.dumbbell_kg} kg)`
                  : ''}
              </div>
              <div className="text-xs text-slate-500">
                Target: {nextUp.block.min_target}–{nextUp.block.max_target} {nextUp.block.unit}
              </div>
            </div>
          </div>
        )}

        <div className="flex w-full gap-3">
          <button
            type="button"
            onClick={() => setRestRemaining((r) => r + 15)}
            className="flex-1 rounded-xl border border-slate-200 bg-white py-3.5 text-sm font-semibold text-slate-800 shadow-xs"
          >
            +15s
          </button>
          <button
            type="button"
            onClick={advanceAfterRest}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-blue-600 py-3.5 text-sm font-bold text-white shadow-sm hover:bg-blue-700"
          >
            <SkipForward className="h-4 w-4" />
            Skip Rest
          </button>
        </div>
        {renderOverlays()}
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-between bg-slate-50 px-4 py-8 text-center text-slate-900">
      <div className="space-y-4">
        <CelebrationBurst />
        <h1 className="text-2xl font-bold text-slate-900">
          Session Complete, {profile.user_name}!
        </h1>
        <p className="text-sm text-slate-600">
          Logged {loggedCount} sets to your device. Your 72h recovery guard is updated automatically.
        </p>

        {progressedPatterns.length > 0 && (
          <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-left">
            <div className="text-sm font-bold text-blue-800">Level Up! Targets Increased</div>
            <p className="mt-1 text-xs text-blue-900">
              Two sessions in a row hit your target cleanly. Your coach increased targets for:{' '}
              <span className="font-semibold uppercase">{progressedPatterns.join(', ')}</span>.
            </p>
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={onExit}
        className="w-full rounded-xl bg-blue-600 py-4 text-base font-bold text-white shadow-sm hover:bg-blue-700"
      >
        Done
      </button>
    </div>
  );
}
