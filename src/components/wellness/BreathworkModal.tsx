import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Pause,
  Play,
  RotateCcw,
  Wind,
  X,
} from 'lucide-react';
import { CelebrationBurst } from '../common/CelebrationBurst';
import { TermHint } from '../common/TermHint';

export type BreathModeId = 'sigh' | 'box' | 'sleep' | 'power';

interface BreathPhase {
  label: string;
  shortLabel: string;
  cue: string;
  seconds: number;
  kind: 'inhale' | 'topoff' | 'hold' | 'exhale';
}

interface BreathProtocol {
  id: BreathModeId;
  name: string;
  shortName: string;
  benefit: string;
  whenToUse: string;
  cycles: number;
  citation: string;
  phases: BreathPhase[];
}

const BREATH_PROTOCOLS: Record<BreathModeId, BreathProtocol> = {
  sigh: {
    id: 'sigh',
    name: 'Post-Workout Downshift (Physiological Sigh)',
    shortName: 'Downshift Sigh',
    benefit: 'Fastest clinical way to drop heart rate and stress right after a workout or tough hour.',
    whenToUse: '2 min · Best right after training or whenever stressed',
    cycles: 6,
    citation: 'Balban et al. (2023, Cell Reports Medicine — Stanford cyclic sighing trial).',
    phases: [
      {
        label: 'Inhale (Nose)',
        shortLabel: 'Inhale 2s',
        cue: 'Breathe smoothly in through your nose until your lungs feel ~80% full.',
        seconds: 2,
        kind: 'inhale',
      },
      {
        label: 'Second Top-Off Sip',
        shortLabel: 'Top-Off 1s',
        cue: 'Take one quick extra sip of air through your nose to fully expand your lungs.',
        seconds: 1,
        kind: 'topoff',
      },
      {
        label: 'Long Slow Exhale',
        shortLabel: 'Exhale 6s',
        cue: 'Let the air sigh out slowly and softly through your mouth. Drop your shoulders.',
        seconds: 6,
        kind: 'exhale',
      },
    ],
  },
  box: {
    id: 'box',
    name: 'Calm Focus (Box Breathing 4-4-4-4)',
    shortName: 'Focus 4-4-4-4',
    benefit: 'Steadies breathing rhythm and clears mental fog without making you drowsy.',
    whenToUse: '1.5 min · Best before work, study, or skill practice',
    cycles: 6,
    citation: 'Zaccaro et al. (2018, Frontiers in Human Neuroscience — slow rhythmic breathing).',
    phases: [
      {
        label: 'Inhale Slowly',
        shortLabel: 'In 4s',
        cue: 'Smooth nasal inhale into your belly and ribs.',
        seconds: 4,
        kind: 'inhale',
      },
      {
        label: 'Gentle Hold',
        shortLabel: 'Hold 4s',
        cue: 'Pause calmly at the top — keep jaw and throat completely relaxed.',
        seconds: 4,
        kind: 'hold',
      },
      {
        label: 'Exhale Smoothly',
        shortLabel: 'Out 4s',
        cue: 'Even, quiet exhale through your nose.',
        seconds: 4,
        kind: 'exhale',
      },
      {
        label: 'Calm Pause',
        shortLabel: 'Pause 4s',
        cue: 'Rest quietly with empty lungs before the next easy breath.',
        seconds: 4,
        kind: 'hold',
      },
    ],
  },
  sleep: {
    id: 'sleep',
    name: 'Sleep Wind-Down (4-7-8 Exhale)',
    shortName: 'Sleep 4-7-8',
    benefit: 'Long exhales activate your vagus nerve ("rest-and-repair" mode) for deeper sleep.',
    whenToUse: '1.6 min · Best in bed or 20 min before sleeping',
    cycles: 5,
    citation: 'Laborde et al. (2022, Neuroscience & Biobehavioral Reviews — vagal tone & slow exhale).',
    phases: [
      {
        label: 'Soft Nasal Inhale',
        shortLabel: 'In 4s',
        cue: 'Breathe gently in through your nose so your belly rises softly.',
        seconds: 4,
        kind: 'inhale',
      },
      {
        label: 'Quiet Hold',
        shortLabel: 'Hold 7s',
        cue: 'Rest comfortably without straining — relax your tongue and eyelids.',
        seconds: 7,
        kind: 'hold',
      },
      {
        label: 'Long Heavy Exhale',
        shortLabel: 'Out 8s',
        cue: 'Breathe out slowly like fogging a mirror, letting your body sink into the bed.',
        seconds: 8,
        kind: 'exhale',
      },
    ],
  },
  power: {
    id: 'power',
    name: 'Cyclic Power Breath (Wim Hof–Style)',
    shortName: 'Power Breath',
    benefit:
      '3 rounds of 30 deep rhythmic breaths + empty-lung retention + 15s recovery hold to boost alertness and energy.',
    whenToUse: '~6 min · Best in the morning or before training (seated or lying down)',
    cycles: 3,
    citation: 'Kox et al. (2014, PNAS — voluntary sympathetic activation & cyclic breathing).',
    phases: [
      {
        label: '30 Deep Rhythmic Breaths',
        shortLabel: '30 Breaths',
        cue: 'Inhale deeply into belly then chest; let go passively without forcing.',
        seconds: 105,
        kind: 'inhale',
      },
      {
        label: 'Empty-Lung Hold',
        shortLabel: 'Hold',
        cue: 'Exhale gently and hold until you feel the urge to breathe, then tap Take Recovery Breath.',
        seconds: 60,
        kind: 'hold',
      },
      {
        label: 'Recovery Inhale Hold',
        shortLabel: 'Recover 15s',
        cue: 'Take one full breath in and hold comfortably for 15 seconds.',
        seconds: 15,
        kind: 'topoff',
      },
    ],
  },
};

function phaseBarBase(kind: BreathPhase['kind']): string {
  if (kind === 'inhale') return 'bg-sky-200';
  if (kind === 'topoff') return 'bg-blue-200';
  if (kind === 'exhale') return 'bg-teal-200';
  return 'bg-slate-200';
}

function phaseBarFill(kind: BreathPhase['kind']): string {
  if (kind === 'inhale') return 'bg-sky-500';
  if (kind === 'topoff') return 'bg-blue-600';
  if (kind === 'exhale') return 'bg-teal-500';
  return 'bg-slate-400';
}

interface BreathworkModalProps {
  onClose: () => void;
  onComplete: (modeName: string, durationSeconds: number) => Promise<void>;
}

export function BreathworkModal({ onClose, onComplete }: BreathworkModalProps) {
  const [mode, setMode] = useState<BreathModeId>('sigh');
  const protocol = BREATH_PROTOCOLS[mode];

  const steps = useMemo(() => {
    const list: Array<BreathPhase & { cycle: number }> = [];
    for (let c = 1; c <= protocol.cycles; c += 1) {
      for (const p of protocol.phases) {
        list.push({ ...p, cycle: c });
      }
    }
    return list;
  }, [protocol]);

  const totalSeconds = useMemo(
    () => steps.reduce((acc, s) => acc + s.seconds, 0),
    [steps],
  );

  const [prepCountdown, setPrepCountdown] = useState<number | null>(null);
  const [running, setRunning] = useState(false);
  const [stepIdx, setStepIdx] = useState(0);
  const [secLeft, setSecLeft] = useState(steps[0].seconds);
  const [doneBanner, setDoneBanner] = useState(false);
  const completedRef = useRef(false);

  // Cyclic Power Breath (Wim Hof-style) state: 3 rounds of 30 breaths -> stopwatch hold -> 15s recovery
  const [powerRound, setPowerRound] = useState(1);
  const [powerStage, setPowerStage] = useState<'pace' | 'retention' | 'recovery'>('pace');
  const [powerBreathCount, setPowerBreathCount] = useState(1);
  const [powerInhale, setPowerInhale] = useState(true);
  const [retentionSeconds, setRetentionSeconds] = useState(0);
  const [recoveryLeft, setRecoveryLeft] = useState(15);
  const powerStartMsRef = useRef<number | null>(null);

  const fireVibrate = (pattern: number[]) => {
    try {
      navigator.vibrate?.(pattern);
    } catch {
      // ignore on desktop
    }
  };

  useEffect(() => {
    setRunning(false);
    setPrepCountdown(null);
    setStepIdx(0);
    setSecLeft(steps[0].seconds);
    setDoneBanner(false);
    completedRef.current = false;
    setPowerRound(1);
    setPowerStage('pace');
    setPowerBreathCount(1);
    setPowerInhale(true);
    setRetentionSeconds(0);
    setRecoveryLeft(15);
    powerStartMsRef.current = null;
  }, [mode, steps]);

  useEffect(() => {
    if (prepCountdown === null) return;
    if (prepCountdown <= 0) {
      setPrepCountdown(null);
      fireVibrate([60]);
      if (mode === 'power' && powerStartMsRef.current === null) {
        powerStartMsRef.current = Date.now();
      }
      setRunning(true);
      return;
    }
    const id = window.setTimeout(() => {
      setPrepCountdown((c) => (c !== null ? c - 1 : null));
    }, 1000);
    return () => window.clearTimeout(id);
  }, [prepCountdown, mode]);

  useEffect(() => {
    if (!running || mode === 'power') return;
    const id = window.setInterval(() => {
      setSecLeft((prev) => {
        if (prev > 1) return prev - 1;
        setStepIdx((idx) => {
          const nextIdx = idx + 1;
          if (nextIdx >= steps.length) {
            setRunning(false);
            setDoneBanner(true);
            fireVibrate([80, 70, 120]);
            if (!completedRef.current) {
              completedRef.current = true;
              void onComplete(protocol.shortName, totalSeconds);
            }
            return 0;
          }
          fireVibrate(steps[nextIdx].kind === 'exhale' ? [45, 45] : [55]);
          setSecLeft(steps[nextIdx].seconds);
          return nextIdx;
        });
        return prev;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [running, mode, steps, onComplete, protocol.shortName, totalSeconds]);

  // Cyclic Power Breath pacer, retention stopwatch & 15s recovery hold
  useEffect(() => {
    if (!running || mode !== 'power') return;

    if (powerStage === 'pace') {
      const delayMs = powerInhale ? 1900 : 1500;
      const id = window.setTimeout(() => {
        if (powerInhale) {
          setPowerInhale(false);
        } else if (powerBreathCount < 30) {
          setPowerBreathCount((b) => b + 1);
          setPowerInhale(true);
          fireVibrate([30]);
        } else {
          setPowerStage('retention');
          setRetentionSeconds(0);
          fireVibrate([70, 50, 70]);
        }
      }, delayMs);
      return () => window.clearTimeout(id);
    }

    if (powerStage === 'retention') {
      const id = window.setInterval(() => {
        setRetentionSeconds((s) => s + 1);
      }, 1000);
      return () => window.clearInterval(id);
    }

    const id = window.setInterval(() => {
      setRecoveryLeft((prev) => {
        if (prev > 1) return prev - 1;
        if (powerRound < 3) {
          setPowerRound((r) => r + 1);
          setPowerStage('pace');
          setPowerBreathCount(1);
          setPowerInhale(true);
          fireVibrate([60]);
        } else {
          setRunning(false);
          setDoneBanner(true);
          fireVibrate([80, 70, 120]);
          if (!completedRef.current) {
            completedRef.current = true;
            const elapsedSec = powerStartMsRef.current
              ? Math.max(60, Math.round((Date.now() - powerStartMsRef.current) / 1000))
              : 300;
            void onComplete(protocol.shortName, elapsedSec);
          }
        }
        return 15;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [running, mode, powerStage, powerInhale, powerBreathCount, powerRound, onComplete, protocol.shortName]);

  const handleTriggerRecoveryBreath = () => {
    if (mode !== 'power' || powerStage !== 'retention') return;
    fireVibrate([65]);
    setRecoveryLeft(15);
    setPowerStage('recovery');
  };

  const activeStep = steps[stepIdx] ?? steps[0];
  const nextStep = steps[stepIdx + 1];
  const progressPct = Math.round(((activeStep.seconds - secLeft) / activeStep.seconds) * 100);

  const circleScale =
    prepCountdown !== null
      ? 'scale-100 border-amber-400 bg-amber-50'
      : mode === 'power'
        ? powerStage === 'pace'
          ? powerInhale
            ? 'scale-105 border-sky-500 bg-sky-50'
            : 'scale-95 border-teal-500 bg-teal-50'
          : powerStage === 'retention'
            ? 'scale-95 border-slate-400 bg-slate-100'
            : 'scale-110 border-blue-600 bg-blue-50'
        : activeStep.kind === 'inhale'
          ? 'scale-105 border-sky-500 bg-sky-50'
          : activeStep.kind === 'topoff'
            ? 'scale-110 border-blue-600 bg-blue-50'
            : activeStep.kind === 'exhale'
              ? 'scale-95 border-teal-500 bg-teal-50'
              : 'scale-100 border-slate-300 bg-slate-50';

  const handleStartPause = () => {
    setDoneBanner(false);
    completedRef.current = false;
    if (running) {
      setRunning(false);
      return;
    }
    if (prepCountdown !== null) {
      setPrepCountdown(null);
      return;
    }
    setPrepCountdown(5);
  };

  const handleReset = () => {
    setRunning(false);
    setPrepCountdown(null);
    setStepIdx(0);
    setSecLeft(steps[0].seconds);
    setDoneBanner(false);
    completedRef.current = false;
    setPowerRound(1);
    setPowerStage('pace');
    setPowerBreathCount(1);
    setPowerInhale(true);
    setRetentionSeconds(0);
    setRecoveryLeft(15);
    powerStartMsRef.current = null;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-3 backdrop-blur-xs">
      <div className="max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-3xl bg-white p-5 shadow-2xl space-y-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-1.5 text-lg font-extrabold text-slate-900">
              <Wind className="h-5 w-5 text-teal-600" />
              <span>Breathwork &amp; Downshift</span>
              <TermHint termId="physiological_sigh" />
            </div>
            <p className="mt-0.5 text-xs text-slate-600">
              2-minute guided breathing to calm heart rate, clear stress &amp; deepen recovery.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Breathwork"
            className="rounded-xl bg-slate-100 p-2 text-slate-500 hover:bg-slate-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Mode Selector */}
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
          {(['sigh', 'box', 'sleep', 'power'] as BreathModeId[]).map((id) => {
            const p = BREATH_PROTOCOLS[id];
            const active = mode === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setMode(id)}
                className={`rounded-xl border px-2 py-2 text-center text-[11px] font-bold transition ${
                  active
                    ? 'border-teal-600 bg-teal-600 text-white shadow-xs'
                    : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                }`}
              >
                {p.shortName}
              </button>
            );
          })}
        </div>

        {mode === 'power' && (
          <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-semibold text-amber-900">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            <span>
              Safety: Practice seated or lying down only. Never in water, standing, or while driving.
            </span>
          </div>
        )}

        <div className="rounded-2xl border border-teal-100 bg-teal-50/70 p-3 text-xs text-slate-700 space-y-1">
          <div className="font-bold text-teal-900">{protocol.name}</div>
          <p className="leading-relaxed">{protocol.benefit}</p>
          <div className="text-[11px] font-semibold text-teal-700">{protocol.whenToUse}</div>
          <div className="text-[10px] text-slate-500">Science: {protocol.citation}</div>
        </div>

        {/* Visual Breathing Circle */}
        <div className="flex flex-col items-center rounded-2xl border border-slate-200 bg-slate-50/60 px-4 py-5 text-center space-y-4">
          <div
            className={`flex h-44 w-44 flex-col items-center justify-center rounded-full border-[6px] transition-all duration-700 ${circleScale}`}
          >
            {prepCountdown !== null ? (
              <>
                <span className="text-[11px] font-bold uppercase tracking-wide text-amber-700">
                  Get Ready
                </span>
                <span className="text-5xl font-black text-amber-700">{prepCountdown}</span>
                <span className="mt-1 text-[11px] text-amber-800">Sit tall · Drop shoulders</span>
              </>
            ) : mode === 'power' ? (
              <>
                <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                  Round {powerRound}/3
                </span>
                {powerStage === 'pace' ? (
                  <>
                    <span className="tabular-nums text-5xl font-black text-slate-900">
                      {powerBreathCount}/30
                    </span>
                    <span className="mt-1 px-2 text-xs font-bold text-teal-800">
                      {powerInhale ? 'Inhale Deeply' : 'Let Go'}
                    </span>
                  </>
                ) : powerStage === 'retention' ? (
                  <>
                    <span className="tabular-nums text-5xl font-black text-slate-900">
                      {retentionSeconds}s
                    </span>
                    <span className="mt-1 px-2 text-xs font-bold text-slate-700">
                      Empty-Lung Hold
                    </span>
                  </>
                ) : (
                  <>
                    <span className="tabular-nums text-5xl font-black text-blue-700">
                      {recoveryLeft}s
                    </span>
                    <span className="mt-1 px-2 text-xs font-bold text-blue-800">
                      Recovery Hold
                    </span>
                  </>
                )}
              </>
            ) : (
              <>
                <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                  Cycle {activeStep.cycle}/{protocol.cycles}
                </span>
                <span className="tabular-nums text-5xl font-black text-slate-900">{secLeft}s</span>
                <span className="mt-1 px-2 text-xs font-bold text-teal-800">
                  {activeStep.label}
                </span>
              </>
            )}
          </div>

          <p className="min-h-10 text-xs leading-relaxed text-slate-700">
            {prepCountdown !== null
              ? 'Relax your jaw, rest your hands comfortably, and follow the circle & bar below.'
              : mode === 'power'
                ? powerStage === 'pace'
                  ? 'Breathe deeply into belly then chest, and let go without forcing.'
                  : powerStage === 'retention'
                    ? 'Hold comfortably with empty lungs. Tap "Take Recovery Breath" as soon as you feel the urge to breathe.'
                    : 'Hold a full breath in for 15 seconds, then release smoothly.'
                : activeStep.cue}
          </p>

          {mode === 'power' && running && powerStage === 'retention' && (
            <button
              type="button"
              onClick={handleTriggerRecoveryBreath}
              className="w-full rounded-xl bg-blue-600 py-3 text-sm font-bold text-white shadow-sm hover:bg-blue-700"
            >
              Take Recovery Breath (15s Hold)
            </button>
          )}

          {/* Bar-Shaped Upcoming Phase Pacer (matching Stealth Kegel UX) */}
          <div className="w-full space-y-1.5 text-left">
            <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600">
              <span>Now: {activeStep.shortLabel}</span>
              <span className="flex items-center gap-1 text-teal-700">
                <ArrowRight className="h-3 w-3" />
                Next: {nextStep ? nextStep.shortLabel : 'Complete'}
              </span>
            </div>
            <div className="flex h-3 w-full gap-1 overflow-hidden rounded-full bg-slate-200 p-0.5">
              {steps.map((s, idx) => {
                const isPast = idx < stepIdx;
                const isCurrent = idx === stepIdx;
                const fillPct = isPast ? 100 : isCurrent ? progressPct : 0;
                return (
                  <div
                    key={`${s.cycle}-${idx}`}
                    style={{ flexGrow: s.seconds }}
                    className={`relative h-full overflow-hidden rounded-full ${phaseBarBase(s.kind)}`}
                  >
                    <div
                      style={{ width: `${fillPct}%` }}
                      className={`h-full transition-all duration-300 ${phaseBarFill(s.kind)}`}
                    />
                  </div>
                );
              })}
            </div>
            <div className="flex items-center justify-between text-[10px] text-slate-500">
              <span className="flex items-center gap-1">
                <span className="inline-block h-2 w-2 rounded-full bg-sky-500" /> Inhale
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block h-2 w-2 rounded-full bg-slate-400" /> Hold
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block h-2 w-2 rounded-full bg-teal-500" /> Exhale
              </span>
            </div>
          </div>

          {doneBanner && (
            <div className="flex w-full flex-col items-center gap-1.5 rounded-xl border border-teal-200 bg-teal-50 px-3 py-3 text-xs font-bold text-teal-800">
              <CelebrationBurst compact />
              <span className="flex items-center gap-1">
                <CheckCircle2 className="h-4 w-4" />
                Session logged! Notice how much calmer your breathing feels.
              </span>
            </div>
          )}

          {/* Controls */}
          <div className="flex w-full gap-2">
            <button
              type="button"
              onClick={handleStartPause}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-teal-600 py-3 text-sm font-bold text-white shadow-sm hover:bg-teal-700"
            >
              {running ? (
                <>
                  <Pause className="h-4 w-4" /> Pause
                </>
              ) : prepCountdown !== null ? (
                <>
                  <Pause className="h-4 w-4" /> Cancel ({prepCountdown}s)
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" /> Start ({Math.round(totalSeconds / 60 * 10) / 10} min)
                </>
              )}
            </button>
            <button
              type="button"
              onClick={handleReset}
              aria-label="Reset breath timer"
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-600 hover:bg-slate-100"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
