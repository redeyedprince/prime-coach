import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  Bell,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  EyeOff,
  HelpCircle,
  Pause,
  Play,
  RotateCcw,
  Shield,
  SkipForward,
  Smartphone,
  Sparkles,
} from 'lucide-react';
import type { KegelLevel, UserProfile, WorkoutLogEntry } from '../../types/schemas';
import { triggerHapticDuration } from '../../utils/cues';
import {
  checkNotificationPermission,
  requestNotificationPermission,
  sendTestDiscreetNotification,
  syncDiscreetKegelNotifications,
  type PrimeNotifPermission,
} from '../../utils/notifications';
import { TermHint } from '../common/TermHint';

interface StealthKegelScreenProps {
  profile: UserProfile;
  logs: WorkoutLogEntry[];
  todayIso: string;
  onUpdateProfile: (next: UserProfile) => Promise<void>;
  onCompleteSession: (level: KegelLevel, durationSeconds: number, setsCompleted: number) => Promise<void>;
}

interface KegelProtocolConfig {
  label: string;
  subtitle: string;
  slowHolds: number;
  holdSec: number;
  restSec: number;
  quickFlicks: number;
  reverseSec: number;
}

const KEGEL_PROTOCOLS: Record<KegelLevel, KegelProtocolConfig> = {
  foundation: {
    label: 'Foundation',
    subtitle: '5× 5s firm holds · 5 fast squeezes · 20s full relax',
    slowHolds: 5,
    holdSec: 5,
    restSec: 5,
    quickFlicks: 5,
    reverseSec: 20,
  },
  intermediate: {
    label: 'Intermediate',
    subtitle: '8× 8s firm holds · 8 fast squeezes · 25s full relax',
    slowHolds: 8,
    holdSec: 8,
    restSec: 6,
    quickFlicks: 8,
    reverseSec: 25,
  },
  advanced: {
    label: 'Advanced',
    subtitle: '10× 10s firm holds · 10 fast squeezes · 30s full relax',
    slowHolds: 10,
    holdSec: 10,
    restSec: 6,
    quickFlicks: 10,
    reverseSec: 30,
  },
};

interface KegelStep {
  phaseName: string;
  shortLabel: string;
  cue: string;
  effortBadge: string;
  discreetCue: string;
  discreetNext: string;
  seconds: number;
  mode: 'contract' | 'rest' | 'flick' | 'reverse';
}

function buildSteps(cfg: KegelProtocolConfig): KegelStep[] {
  const steps: KegelStep[] = [];
  for (let i = 1; i <= cfg.slowHolds; i += 1) {
    steps.push({
      phaseName: `Firm Squeeze & Hold (${i}/${cfg.slowHolds})`,
      shortLabel: `Squeeze & Hold (${cfg.holdSec}s)`,
      cue: 'Squeeze your pelvic floor muscle inward & upward (like stopping urine mid-stream). Keep butt, thighs & stomach relaxed and keep breathing.',
      effortBadge: '70–80% firm effort · Don’t hold breath',
      discreetCue: `Inhale soft · Steady focus hold (${i}/${cfg.slowHolds})`,
      discreetNext: `Focus Hold (${cfg.holdSec}s)`,
      seconds: cfg.holdSec,
      mode: 'contract',
    });
    steps.push({
      phaseName: `Relax Completely (${i}/${cfg.slowHolds})`,
      shortLabel: `Relax (${cfg.restSec}s)`,
      cue: 'Let the muscle drop all the way to 0% tension. Let your belly soften before the next hold.',
      effortBadge: '0% tension · Full release',
      discreetCue: 'Release completely · Relax shoulders',
      discreetNext: `Relax & Breathe (${cfg.restSec}s)`,
      seconds: cfg.restSec,
      mode: 'rest',
    });
  }
  for (let i = 1; i <= cfg.quickFlicks; i += 1) {
    steps.push({
      phaseName: `Fast 1s Squeeze (${i}/${cfg.quickFlicks})`,
      shortLabel: 'Fast 1s Squeeze',
      cue: 'Do one crisp, quick 1-second pelvic floor squeeze (~80% effort) — trains fast reaction & stamina.',
      effortBadge: 'Quick 80% squeeze (1s)',
      discreetCue: `Brief rhythm focus (${i}/${cfg.quickFlicks})`,
      discreetNext: 'Quick Pulse (1s)',
      seconds: 1,
      mode: 'flick',
    });
    steps.push({
      phaseName: 'Instant Release',
      shortLabel: 'Instant Release (1s)',
      cue: 'Drop tension immediately for 1 second before the next fast squeeze.',
      effortBadge: '0% instant drop',
      discreetCue: 'Soft reset',
      discreetNext: 'Soft Reset (1s)',
      seconds: 1,
      mode: 'rest',
    });
  }
  steps.push({
    phaseName: 'Full Relax & Breathe',
    shortLabel: `Full Relax (${cfg.reverseSec}s)`,
    cue: 'Take slow, deep belly breaths and gently soften the pelvic floor downward to 0% tension so the muscle never gets overly tight.',
    effortBadge: '0% tension · Deep belly exhale',
    discreetCue: 'Deep belly exhale · Lengthen spine',
    discreetNext: `Deep Exhale (${cfg.reverseSec}s)`,
    seconds: cfg.reverseSec,
    mode: 'reverse',
  });
  return steps;
}

const PRESET_SLOTS = ['09:00', '10:30', '13:30', '15:00', '18:00', '20:30'];

function segmentBaseColor(mode: KegelStep['mode']): string {
  if (mode === 'contract') return 'bg-blue-200';
  if (mode === 'flick') return 'bg-sky-200';
  if (mode === 'reverse') return 'bg-teal-200';
  return 'bg-slate-200';
}

function segmentFillColor(mode: KegelStep['mode']): string {
  if (mode === 'contract') return 'bg-blue-600';
  if (mode === 'flick') return 'bg-sky-500';
  if (mode === 'reverse') return 'bg-teal-500';
  return 'bg-slate-400';
}

export function StealthKegelScreen({
  profile,
  logs,
  todayIso,
  onUpdateProfile,
  onCompleteSession,
}: StealthKegelScreenProps) {
  const level = profile.kegel_level ?? 'foundation';
  const cfg = KEGEL_PROTOCOLS[level];
  const steps = useMemo(() => buildSteps(cfg), [cfg]);
  const totalSessionSeconds = useMemo(
    () => steps.reduce((acc, s) => acc + s.seconds, 0),
    [steps],
  );

  const [stealthText, setStealthText] = useState(false);
  const [guideOpen, setGuideOpen] = useState(true);
  const [hapticEnabled, setHapticEnabled] = useState(true);
  const hapticRef = useRef(hapticEnabled);
  hapticRef.current = hapticEnabled;

  // 5-second Get Ready countdown before starting
  const [prepCountdown, setPrepCountdown] = useState<number | null>(null);
  const [running, setRunning] = useState(false);
  const [stepIdx, setStepIdx] = useState(0);
  const [secLeft, setSecLeft] = useState(steps[0].seconds);
  const [completedBanner, setCompletedBanner] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [notifPerm, setNotifPerm] = useState<PrimeNotifPermission>('prompt');

  useEffect(() => {
    void checkNotificationPermission().then((p) => {
      setNotifPerm(p);
      if (p === 'granted' && profile.kegel_reminder_enabled) {
        void syncDiscreetKegelNotifications(
          true,
          profile.kegel_reminder_times ?? ['10:30', '15:00', '20:30'],
        );
      }
    });
  }, []);

  const todayCount = useMemo(
    () =>
      logs.filter(
        (l) => l.date === todayIso && l.exercise_slug === 'stealth-kegel-protocol',
      ).length,
    [logs, todayIso],
  );

  const fireVibrate = (durationMs: number) => {
    if (!hapticRef.current) return;
    triggerHapticDuration(durationMs);
  };

  // Only reset pacer when the user switches difficulty level (never on Pause!)
  useEffect(() => {
    setPrepCountdown(null);
    setRunning(false);
    setStepIdx(0);
    setSecLeft(steps[0].seconds);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [level]);

  // 5-second Get Ready countdown effect
  useEffect(() => {
    if (prepCountdown === null) return;
    if (prepCountdown <= 0) {
      setPrepCountdown(null);
      if (steps[0]?.mode === 'contract' || steps[0]?.mode === 'flick') {
        fireVibrate(850);
      }
      setRunning(true);
      return;
    }
    const id = window.setTimeout(() => {
      setPrepCountdown((c) => (c !== null ? c - 1 : null));
    }, 1000);
    return () => window.clearTimeout(id);
  }, [prepCountdown]);

  const completedRef = useRef(false);

  useEffect(() => {
    if (!running) return;
    completedRef.current = false;

    const timer = window.setInterval(() => {
      setSecLeft((prev) => {
        if (prev > 1) return prev - 1;

        setStepIdx((curIdx) => {
          const nextIdx = curIdx + 1;
          if (nextIdx >= steps.length) {
            if (!completedRef.current) {
              completedRef.current = true;
              setRunning(false);
              setCompletedBanner(true);
              fireVibrate(350);
              void onCompleteSession(level, totalSessionSeconds, 1);
            }
            return 0;
          }
          const nextStep = steps[nextIdx];
          setSecLeft(nextStep.seconds);
          return nextIdx;
        });
        return 0;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [running, steps, level, totalSessionSeconds, onCompleteSession]);

  const currentStep = steps[stepIdx] ?? steps[0];
  const nextStep = steps[stepIdx + 1] ?? null;

  // Continuous vibrate-on-squeeze / completely-still-on-relax
  useEffect(() => {
    if (!running || !hapticEnabled) return;
    if (currentStep.mode === 'contract' || currentStep.mode === 'flick') {
      fireVibrate(850);
    }
  }, [running, hapticEnabled, stepIdx, secLeft, currentStep.mode]);
  const activeStepElapsedPct = running
    ? Math.min(100, Math.round(((currentStep.seconds - secLeft + 1) / currentStep.seconds) * 100))
    : 0;

  const handleToggleStart = () => {
    setCompletedBanner(false);
    if (prepCountdown !== null) {
      setPrepCountdown(null);
      return;
    }
    if (!running) {
      setPrepCountdown(5);
    } else {
      setRunning(false);
    }
  };

  const handleSkipPrep = () => {
    setPrepCountdown(null);
    if (steps[0]?.mode === 'contract' || steps[0]?.mode === 'flick') {
      fireVibrate(850);
    }
    setRunning(true);
  };

  const handleReset = () => {
    setPrepCountdown(null);
    setRunning(false);
    setStepIdx(0);
    setSecLeft(steps[0].seconds);
    setCompletedBanner(false);
  };

  const handleSelectLevel = async (nextLevel: KegelLevel) => {
    setPrepCountdown(null);
    setRunning(false);
    await onUpdateProfile({
      ...profile,
      kegel_level: nextLevel,
      updated_at: new Date().toISOString(),
    });
  };

  const showToast = (msg: string) => {
    setToastMsg(msg);
    window.setTimeout(() => setToastMsg(null), 4500);
  };

  const handleRequestPermission = async () => {
    const res = await requestNotificationPermission();
    setNotifPerm(res);
    if (res === 'granted') {
      const times = profile.kegel_reminder_times ?? ['10:30', '15:00', '20:30'];
      await syncDiscreetKegelNotifications(Boolean(profile.kegel_reminder_enabled), times);
      showToast('Notifications allowed! Daily discreet reminders are now scheduled.');
    } else if (res === 'denied') {
      showToast('Notification permission denied. Enable it anytime in Android App Settings.');
    } else {
      showToast('System notifications require the Android APK or a supported browser.');
    }
  };

  const handleToggleReminder = async () => {
    const nextEnabled = !profile.kegel_reminder_enabled;
    const times = profile.kegel_reminder_times ?? ['10:30', '15:00', '20:30'];
    if (nextEnabled) {
      const res = await requestNotificationPermission();
      setNotifPerm(res);
    }
    await onUpdateProfile({
      ...profile,
      kegel_reminder_enabled: nextEnabled,
      updated_at: new Date().toISOString(),
    });
    await syncDiscreetKegelNotifications(nextEnabled, times);
    showToast(
      nextEnabled
        ? `Daily discreet reminders enabled (${times.join(', ')}).`
        : 'Daily discreet reminders paused.',
    );
  };

  const handleToggleSlot = async (time: string) => {
    const current = profile.kegel_reminder_times ?? ['10:30', '15:00', '20:30'];
    const exists = current.includes(time);
    const next = exists
      ? current.filter((t) => t !== time)
      : [...current, time].sort();
    const finalTimes = next.length > 0 ? next : ['10:30'];
    if (profile.kegel_reminder_enabled && notifPerm === 'prompt') {
      const res = await requestNotificationPermission();
      setNotifPerm(res);
    }
    await onUpdateProfile({
      ...profile,
      kegel_reminder_times: finalTimes,
      updated_at: new Date().toISOString(),
    });
    await syncDiscreetKegelNotifications(Boolean(profile.kegel_reminder_enabled), finalTimes);
  };

  const handleTestDiscreetAlert = async () => {
    fireVibrate(120);
    const res = await sendTestDiscreetNotification();
    setNotifPerm(res.permission);
    showToast(res.message);
  };

  const ringColor =
    prepCountdown !== null
      ? 'border-amber-400 bg-amber-50 text-amber-700 scale-100'
      : currentStep.mode === 'contract'
        ? 'border-blue-600 bg-blue-50 text-blue-700 scale-105'
        : currentStep.mode === 'flick'
          ? 'border-sky-500 bg-sky-50 text-sky-700 scale-105'
          : currentStep.mode === 'reverse'
            ? 'border-teal-500 bg-teal-50 text-teal-700 scale-100'
            : 'border-slate-300 bg-slate-50 text-slate-600 scale-95';

  return (
    <div className="space-y-4 pb-4">
      {/* Header Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-blue-600" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600">
                {stealthText ? 'Office-Safe Mode' : 'Seated Desk Training'}
              </span>
            </div>
            <h2 className="mt-1 flex items-center gap-1.5 text-lg font-extrabold text-slate-900">
              <span>{stealthText ? 'Seated Core & Focus Reset' : 'Pelvic Floor & Kegel Mode'}</span>
              {!stealthText && <TermHint termId="kegel_benefits" />}
            </h2>
            <p className="mt-0.5 text-xs text-slate-600">
              {stealthText
                ? 'Discreet seated breathing & posture pacing you can do at your desk.'
                : profile.biological_sex === 'male'
                  ? 'Evidence-based pelvic floor training: improves stamina, erection control & deep core support.'
                  : 'Evidence-based pelvic floor training: builds pelvic tone, bladder control, core stability & sensation.'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              const next = !stealthText;
              setStealthText(next);
              if (next) setGuideOpen(false);
            }}
            className={`flex shrink-0 items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-[11px] font-semibold transition ${
              stealthText
                ? 'border-blue-600 bg-blue-600 text-white'
                : 'border-blue-200 bg-blue-50 text-blue-700'
            }`}
          >
            <EyeOff className="h-3.5 w-3.5" />
            {stealthText ? 'Stealth ON' : 'Office Stealth'}
          </button>
        </div>

        {/* Daily Progress Bar */}
        <div className="mt-3 rounded-xl border border-blue-100 bg-blue-50/70 p-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-800">Today&apos;s Daily Sets</span>
            <span className="font-bold text-blue-700">{todayCount} / 3 completed</span>
          </div>
          <div className="mt-2 grid grid-cols-3 gap-1.5">
            {[0, 1, 2].map((idx) => (
              <div
                key={idx}
                className={`h-2 rounded-full transition-colors ${
                  idx < todayCount ? 'bg-blue-600' : 'bg-blue-200'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Plain-English How-To Quick Guide */}
      {!stealthText && (
        <div className="rounded-2xl border border-blue-200 bg-white shadow-sm overflow-hidden">
          <button
            type="button"
            onClick={() => setGuideOpen((v) => !v)}
            className="flex w-full items-center justify-between px-4 py-3 text-left"
          >
            <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-blue-700">
              <HelpCircle className="h-4 w-4" />
              How to Do It (Which Muscle &amp; How Strong)
            </span>
            {guideOpen ? (
              <ChevronUp className="h-4 w-4 text-slate-400" />
            ) : (
              <ChevronDown className="h-4 w-4 text-slate-400" />
            )}
          </button>

          {guideOpen && (
            <div className="space-y-2.5 border-t border-blue-100 bg-blue-50/40 px-4 py-3 text-xs text-slate-700 leading-relaxed">
              <div>
                <strong className="text-slate-900">1. Which muscle to squeeze?</strong> Imagine
                stopping urine flow mid-stream and gently lifting that muscle inward &amp; upward.
                Keep your <strong>butt, thighs, and stomach relaxed</strong>, and breathe normally.
              </div>
              <div>
                <strong className="text-slate-900">2. Firm Squeeze &amp; Hold (Endurance):</strong>{' '}
                Squeeze at <strong>70–80% firm effort</strong> (strong and steady, never straining)
                until the timer hits 0, then release completely.
              </div>
              <div>
                <strong className="text-slate-900">3. Fast 1s Squeeze (Quick Control):</strong> Do a
                crisp <strong>1-second squeeze at ~80% effort</strong>, then immediately let go for 1
                second. Builds fast-twitch control.
              </div>
              <div>
                <strong className="text-slate-900">4. Full Relax &amp; Breathe (0% Tension):</strong>{' '}
                Take slow belly breaths and soften the pelvic floor downward so it stays elastic and
                never gets overly tight.
              </div>
            </div>
          )}
        </div>
      )}

      {/* Interactive Breathing / Pacing Ring + Bar Timeline Pacer */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm text-center">
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span className="font-semibold text-slate-700">
            {prepCountdown !== null
              ? 'Get Ready...'
              : stealthText
                ? currentStep.mode === 'contract'
                  ? 'Focus Hold'
                  : currentStep.mode === 'reverse'
                    ? 'Soft Exhale Drop'
                    : currentStep.mode === 'flick'
                      ? 'Quick Pulse'
                      : 'Relax & Breathe'
                : currentStep.phaseName}
          </span>
          <span>
            Step {stepIdx + 1}/{steps.length} · ~{Math.ceil(totalSessionSeconds / 60)} min
          </span>
        </div>

        <div className="my-5 flex justify-center">
          <div
            className={`flex h-44 w-44 flex-col items-center justify-center rounded-full border-4 transition-all duration-500 shadow-inner ${ringColor}`}
          >
            <span className="text-[11px] font-bold uppercase tracking-wider opacity-85">
              {prepCountdown !== null
                ? 'GET READY'
                : currentStep.mode === 'contract'
                  ? stealthText
                    ? 'HOLD LIFT'
                    : 'SQUEEZE & HOLD'
                  : currentStep.mode === 'flick'
                    ? stealthText
                      ? 'PULSE'
                      : 'FAST SQUEEZE'
                    : currentStep.mode === 'reverse'
                      ? 'FULL RELAX'
                      : 'RELEASE (0%)'}
            </span>
            <span className="mt-1 text-5xl font-black tabular-nums">
              {prepCountdown !== null ? prepCountdown : secLeft}
            </span>
            <span className="mt-1 text-[11px] font-semibold">sec</span>
          </div>
        </div>

        {prepCountdown !== null ? (
          <div className="mb-3 space-y-2">
            <p className="mx-auto max-w-xs text-xs font-semibold text-amber-800">
              Sit tall, relax your shoulders &amp; belly — starting in {prepCountdown}s.
            </p>
            <button
              type="button"
              onClick={handleSkipPrep}
              className="inline-flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-bold text-amber-800 hover:bg-amber-100"
            >
              <SkipForward className="h-3 w-3" />
              Skip Countdown
            </button>
          </div>
        ) : (
          <>
            {!stealthText && (
              <div className="mb-2 inline-block rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-[11px] font-bold text-blue-700">
                {currentStep.effortBadge}
              </div>
            )}
            <p className="mx-auto max-w-xs text-xs font-medium text-slate-700 leading-relaxed">
              {stealthText ? currentStep.discreetCue : currentStep.cue}
            </p>
          </>
        )}

        {/* Segmented Visual Bar-Shaped Pacer */}
        <div className="mt-4 space-y-2 text-left">
          <div className="flex items-center justify-between text-[10px] font-semibold text-slate-500">
            <span>Session Timeline Pacer</span>
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-blue-600" />
                Hold
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-slate-400" />
                Relax
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-sky-500" />
                Fast
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-teal-500" />
                Drop
              </span>
            </div>
          </div>

          <div className="flex h-3.5 w-full items-center gap-0.5 overflow-hidden rounded-full bg-slate-100 p-0.5">
            {steps.map((st, idx) => {
              const isPast = idx < stepIdx;
              const isActive = idx === stepIdx;
              return (
                <div
                  key={`${st.mode}-${idx}`}
                  style={{ flexGrow: Math.max(1, st.seconds) }}
                  className={`relative h-full overflow-hidden rounded-full transition-all ${
                    isActive
                      ? `${segmentBaseColor(st.mode)} ring-1 ring-blue-600`
                      : isPast
                        ? segmentFillColor(st.mode)
                        : segmentBaseColor(st.mode)
                  }`}
                >
                  {isActive && (
                    <div
                      className={`h-full transition-all duration-300 ${segmentFillColor(st.mode)}`}
                      style={{ width: `${activeStepElapsedPct}%` }}
                    />
                  )}
                </div>
              );
            })}
          </div>

          {/* Up Next Preview Chip */}
          <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs">
            <span className="flex items-center gap-1.5 font-semibold text-slate-500">
              <ArrowRight className="h-3.5 w-3.5 text-blue-600" />
              Up Next:
            </span>
            <span className="font-bold text-slate-800">
              {prepCountdown !== null
                ? stealthText
                  ? currentStep.discreetNext
                  : currentStep.shortLabel
                : nextStep
                  ? stealthText
                    ? nextStep.discreetNext
                    : nextStep.shortLabel
                  : 'Session Complete!'}
            </span>
          </div>
        </div>

        {completedBanner && (
          <div className="mt-4 flex items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-800">
            <CheckCircle2 className="h-4 w-4 text-blue-600" />
            Session logged! Keep your pelvis relaxed and stay hydrated.
          </div>
        )}

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={handleToggleStart}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white shadow-sm hover:bg-blue-700 active:scale-[0.99]"
          >
            {running || prepCountdown !== null ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            {prepCountdown !== null
              ? 'Cancel Countdown'
              : running
                ? 'Pause Pacer'
                : stepIdx > 0
                  ? 'Resume (5s Prep)'
                  : 'Start Desk Session (5s Prep)'}
          </button>
          <button
            type="button"
            onClick={handleReset}
            aria-label="Reset session"
            className="flex items-center justify-center rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-slate-700 hover:bg-slate-100"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        </div>

        {/* Desk Vibration + Protocol Tiers */}
        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-left space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-2 font-medium text-slate-700">
              <Smartphone className="h-4 w-4 text-blue-600" />
              Eyes-Free Vibration Cues
            </span>
            <button
              type="button"
              onClick={() => setHapticEnabled((v) => !v)}
              className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition ${
                hapticEnabled
                  ? 'bg-blue-600 text-white'
                  : 'border border-slate-300 bg-white text-slate-600'
              }`}
            >
              {hapticEnabled ? 'ON (Pocket Safe)' : 'OFF'}
            </button>
          </div>
          <p className="text-[10.5px] leading-snug text-slate-500">
            <strong className="text-slate-700">How it works:</strong> Phone{' '}
            <strong className="text-blue-700">vibrates steadily</strong> while you should{' '}
            <strong>squeeze</strong>, and stays{' '}
            <strong className="text-slate-700">completely still</strong> when you should{' '}
            <strong>relax (0%)</strong>.
          </p>
        </div>

        <div className="mt-3 space-y-2 text-left">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wide text-slate-600">
              Difficulty Level
            </span>
            <span className="text-[10px] font-semibold text-blue-700">
              {level === 'foundation'
                ? 'Best for beginners'
                : level === 'intermediate'
                  ? 'Steady daily control'
                  : 'Peak endurance'}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {(['foundation', 'intermediate', 'advanced'] as KegelLevel[]).map((lvl) => {
              const active = level === lvl;
              const recLabel =
                lvl === 'foundation'
                  ? 'Start here'
                  : lvl === 'intermediate'
                    ? 'After 2–4 wks'
                    : 'Pro stamina';
              return (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => void handleSelectLevel(lvl)}
                  className={`rounded-xl border p-2.5 transition ${
                    active
                      ? 'border-blue-600 bg-blue-50 text-blue-900 ring-1 ring-blue-600'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="text-xs font-bold capitalize">{KEGEL_PROTOCOLS[lvl].label}</div>
                  <div className="mt-0.5 text-[10px] leading-tight text-slate-500">
                    {KEGEL_PROTOCOLS[lvl].holdSec}s hold · {KEGEL_PROTOCOLS[lvl].quickFlicks} fast
                  </div>
                  <div className="mt-1 text-[9.5px] font-semibold text-blue-700">{recLabel}</div>
                </button>
              );
            })}
          </div>

          {!stealthText && (
            <div className="rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2 text-[10.5px] leading-relaxed text-slate-600 space-y-1">
              <div className="font-bold text-slate-800">Which level should I pick?</div>
              <div>
                <strong>Foundation:</strong> Start here if you are new or if a 5s squeeze fades
                before the timer ends.
              </div>
              <div>
                <strong>Intermediate:</strong> Move up once 3 daily Foundation sets feel steady
                without tensing your butt, thighs, or stomach.
              </div>
              <div>
                <strong>Advanced:</strong> For experienced users who hold 8s smoothly and want peak
                pelvic endurance &amp; control.
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Daily Discreet Reminders Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-blue-600" />
            <div>
              <h3 className="text-sm font-bold text-slate-900">Daily Discreet Reminders</h3>
              <p className="text-[11px] text-slate-500">
                Lock-screen alert reads &ldquo;2-Min Focus &amp; Posture Reset&rdquo;
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void handleToggleReminder()}
            className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
              profile.kegel_reminder_enabled
                ? 'bg-blue-600 text-white'
                : 'border border-slate-200 bg-slate-100 text-slate-600'
            }`}
          >
            {profile.kegel_reminder_enabled ? 'Enabled' : 'Paused'}
          </button>
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {PRESET_SLOTS.map((slot) => {
            const active = (profile.kegel_reminder_times ?? []).includes(slot);
            return (
              <button
                key={slot}
                type="button"
                onClick={() => void handleToggleSlot(slot)}
                className={`rounded-lg border px-2.5 py-1 text-xs font-semibold transition ${
                  active
                    ? 'border-blue-600 bg-blue-50 text-blue-700'
                    : 'border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100'
                }`}
              >
                {slot}
              </button>
            );
          })}
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
          <div className="flex items-center gap-2 text-[11px] text-slate-500">
            <span>
              Notifications:{' '}
              <strong
                className={
                  notifPerm === 'granted'
                    ? 'text-emerald-700'
                    : notifPerm === 'denied'
                      ? 'text-rose-600'
                      : 'text-slate-700'
                }
              >
                {notifPerm === 'granted'
                  ? 'Allowed'
                  : notifPerm === 'prompt'
                    ? 'Tap to Allow'
                    : notifPerm === 'denied'
                      ? 'Blocked'
                      : 'Web Only'}
              </strong>
            </span>
            {notifPerm !== 'granted' && (
              <button
                type="button"
                onClick={() => void handleRequestPermission()}
                className="rounded-lg bg-blue-600 px-2.5 py-1 text-[10px] font-bold text-white hover:bg-blue-700"
              >
                Allow Alerts
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={() => void handleTestDiscreetAlert()}
            className="flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Test Discreet Alert
          </button>
        </div>

        {toastMsg && (
          <p className="mt-2 rounded-lg bg-blue-50 px-3 py-2 text-xs font-medium text-blue-800">
            {toastMsg}
          </p>
        )}
      </div>
    </div>
  );
}
