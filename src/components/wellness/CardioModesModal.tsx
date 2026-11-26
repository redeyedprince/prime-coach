import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Flame,
  HeartPulse,
  Pause,
  Play,
  RotateCcw,
  Timer,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import {
  buildHiitIntervals,
  formatWorkRestRatio,
  HIIT_PRESETS,
  type HiitPresetId,
} from '../../engine/hiit';
import type { UserProfile, WorkoutLogEntry } from '../../types/schemas';
import { playBeep, triggerHapticDuration } from '../../utils/cues';
import { TermHint } from '../common/TermHint';

export type CardioTab = 'zone2' | 'hiit' | 'vo2max' | 'finisher';

interface IntervalSegment {
  label: string;
  shortLabel: string;
  cue: string;
  seconds: number;
  kind: 'warmup' | 'hard' | 'easy' | 'cooldown';
}

function buildVo2Intervals(quietMode: boolean): IntervalSegment[] {
  const hardMove = quietMode
    ? 'Fast Power March, Fast Bodyweight Squats, or Fast Step-Ups (silent, brisk pace!)'
    : 'Brisk High-Knees, Fast Stairs/Step-Ups, Shadow Sprints, or Jumping Jacks';
  const easyMove =
    'Easy slow walk in place or relaxed shoulder rolls — catch your breath through your nose.';

  const list: IntervalSegment[] = [
    {
      label: 'Easy Warm-Up Pace',
      shortLabel: 'Warm-Up 60s',
      cue: 'Gentle march in place & arm swings to warm up your heart and ankles.',
      seconds: 60,
      kind: 'warmup',
    },
  ];

  for (let round = 1; round <= 4; round += 1) {
    list.push({
      label: `Round ${round}/4 · Hard Brisk Push`,
      shortLabel: `Push #${round} (45s)`,
      cue: `${hardMove} Aim for ~8/10 effort — breathing hard, only 1–2 words at a time.`,
      seconds: 45,
      kind: 'hard',
    });
    list.push({
      label: `Round ${round}/4 · Easy Recovery`,
      shortLabel: `Easy #${round} (75s)`,
      cue: easyMove,
      seconds: 75,
      kind: 'easy',
    });
  }

  return list;
}

function formatClock(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

interface CardioModesModalProps {
  profile: UserProfile;
  logs: WorkoutLogEntry[];
  cardioFinisherActive: boolean;
  isCardioForced: boolean;
  onToggleFinisher: () => Promise<void>;
  onLogCardioSession: (
    slug: 'zone2-cardio-session' | 'vo2max-interval-session' | 'hiit-interval-session',
    durationSeconds: number,
    notes: string,
  ) => Promise<void>;
  initialTab?: CardioTab;
  onClose: () => void;
}

export function CardioModesModal({
  profile,
  logs,
  cardioFinisherActive,
  isCardioForced,
  onToggleFinisher,
  onLogCardioSession,
  initialTab = 'zone2',
  onClose,
}: CardioModesModalProps) {
  const [tab, setTab] = useState<CardioTab>(initialTab);
  const [audioEnabled, setAudioEnabled] = useState(profile.cue_style !== 'silent_visual');
  const audioRef = useRef(audioEnabled);
  audioRef.current = audioEnabled;

  const [zone2Minutes, setZone2Minutes] = useState<15 | 20 | 30>(20);
  const [prepCountdown, setPrepCountdown] = useState<number | null>(null);
  const [running, setRunning] = useState(false);

  // Zone-2 timer state
  const [zone2Left, setZone2Left] = useState(20 * 60);

  // VO2 Max interval state
  const vo2Steps = useMemo(
    () => buildVo2Intervals(profile.quiet_hotel_mode),
    [profile.quiet_hotel_mode],
  );
  const [vo2Idx, setVo2Idx] = useState(0);
  const [vo2Left, setVo2Left] = useState(vo2Steps[0].seconds);

  // HIIT Timer state (3 research presets + custom builder)
  const [hiitPreset, setHiitPreset] = useState<HiitPresetId>('tabata');
  const [customWork, setCustomWork] = useState(40);
  const [customRest, setCustomRest] = useState(20);
  const [customRounds, setCustomRounds] = useState(6);
  const [customWarmup, setCustomWarmup] = useState(60);
  const [customCooldown, setCustomCooldown] = useState(60);

  const hiitSteps = useMemo(() => {
    if (hiitPreset === 'custom') {
      return buildHiitIntervals({
        workSeconds: customWork,
        restSeconds: customRest,
        rounds: customRounds,
        warmupSeconds: customWarmup,
        cooldownSeconds: customCooldown,
        quietMode: profile.quiet_hotel_mode,
      });
    }
    const spec = HIIT_PRESETS[hiitPreset];
    return buildHiitIntervals({
      workSeconds: spec.workSeconds,
      restSeconds: spec.restSeconds,
      rounds: spec.rounds,
      warmupSeconds: spec.warmupSeconds,
      cooldownSeconds: spec.cooldownSeconds,
      quietMode: profile.quiet_hotel_mode,
    });
  }, [
    hiitPreset,
    customWork,
    customRest,
    customRounds,
    customWarmup,
    customCooldown,
    profile.quiet_hotel_mode,
  ]);

  const hiitTotalSeconds = useMemo(
    () => hiitSteps.reduce((acc, s) => acc + s.seconds, 0),
    [hiitSteps],
  );
  const [hiitIdx, setHiitIdx] = useState(0);
  const [hiitLeft, setHiitLeft] = useState(hiitSteps[0]?.seconds ?? 20);

  const [doneMessage, setDoneMessage] = useState<string | null>(null);
  const loggedRef = useRef(false);

  // Count weekly Zone-2 and intense HIIT/VO2 sessions in last 7 days
  const weeklyCardio = useMemo(() => {
    const cutoff = new Date(Date.now() - 6 * 86_400_000).toISOString().slice(0, 10);
    const recent = logs.filter((l) => l.date >= cutoff);
    return {
      zone2Count: recent.filter((l) => l.exercise_slug === 'zone2-cardio-session').length,
      hiitAndVo2Count: recent.filter(
        (l) =>
          l.exercise_slug === 'vo2max-interval-session' ||
          l.exercise_slug === 'hiit-interval-session',
      ).length,
    };
  }, [logs]);

  const cueSignal = (kind: 'tick' | 'work' | 'rest' | 'finish') => {
    if (kind === 'tick') {
      if (audioRef.current) playBeep(540, 65);
      return;
    }
    if (kind === 'work') {
      if (audioRef.current) playBeep(880, 210);
      triggerHapticDuration(260);
      return;
    }
    if (kind === 'rest') {
      if (audioRef.current) playBeep(520, 170);
      triggerHapticDuration(120);
      return;
    }
    if (audioRef.current) playBeep(980, 280);
    triggerHapticDuration(350);
  };

  // Reset only when switching tabs, presets, or custom parameters (NEVER on pause!)
  useEffect(() => {
    setRunning(false);
    setPrepCountdown(null);
    setDoneMessage(null);
    loggedRef.current = false;
    setZone2Left(zone2Minutes * 60);
    setVo2Idx(0);
    setVo2Left(vo2Steps[0].seconds);
    setHiitIdx(0);
    setHiitLeft(hiitSteps[0]?.seconds ?? 20);
  }, [tab, zone2Minutes, vo2Steps, hiitSteps]);

  // 5-second Get Ready countdown
  useEffect(() => {
    if (prepCountdown === null) return;
    if (prepCountdown <= 0) {
      setPrepCountdown(null);
      cueSignal('work');
      setRunning(true);
      return;
    }
    if (prepCountdown <= 3) {
      cueSignal('tick');
    }
    const id = window.setTimeout(() => {
      setPrepCountdown((c) => (c !== null ? c - 1 : null));
    }, 1000);
    return () => window.clearTimeout(id);
  }, [prepCountdown]);

  // Active running timer
  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      if (tab === 'zone2') {
        setZone2Left((prev) => {
          if (prev > 1) return prev - 1;
          setRunning(false);
          cueSignal('finish');
          if (!loggedRef.current) {
            loggedRef.current = true;
            setDoneMessage(`Logged ${zone2Minutes}-min Zone-2 Base session!`);
            void onLogCardioSession(
              'zone2-cardio-session',
              zone2Minutes * 60,
              `Zone-2 Aerobic Base (${zone2Minutes} min)`,
            );
          }
          return 0;
        });
      } else if (tab === 'vo2max') {
        setVo2Left((prev) => {
          if (prev > 1) {
            if (prev <= 4) cueSignal('tick');
            return prev - 1;
          }
          setVo2Idx((idx) => {
            const nextIdx = idx + 1;
            if (nextIdx >= vo2Steps.length) {
              setRunning(false);
              cueSignal('finish');
              if (!loggedRef.current) {
                loggedRef.current = true;
                const total = vo2Steps.reduce((a, s) => a + s.seconds, 0);
                setDoneMessage('Weekly VO2 Max Booster complete & logged!');
                void onLogCardioSession(
                  'vo2max-interval-session',
                  total,
                  'VO2 Max 4x45s/75s Intervals',
                );
              }
              return 0;
            }
            cueSignal(vo2Steps[nextIdx].kind === 'hard' ? 'work' : 'rest');
            setVo2Left(vo2Steps[nextIdx].seconds);
            return nextIdx;
          });
          return prev;
        });
      } else if (tab === 'hiit') {
        setHiitLeft((prev) => {
          if (prev > 1) {
            if (prev <= 4) cueSignal('tick');
            return prev - 1;
          }
          setHiitIdx((idx) => {
            const nextIdx = idx + 1;
            if (nextIdx >= hiitSteps.length) {
              setRunning(false);
              cueSignal('finish');
              if (!loggedRef.current) {
                loggedRef.current = true;
                const label =
                  hiitPreset === 'custom'
                    ? `Custom HIIT (${customWork}s/${customRest}s × ${customRounds})`
                    : HIIT_PRESETS[hiitPreset].label;
                setDoneMessage(`${label} complete & logged!`);
                void onLogCardioSession('hiit-interval-session', hiitTotalSeconds, label);
              }
              return 0;
            }
            cueSignal(hiitSteps[nextIdx].kind === 'work' ? 'work' : 'rest');
            setHiitLeft(hiitSteps[nextIdx].seconds);
            return nextIdx;
          });
          return prev;
        });
      }
    }, 1000);
    return () => window.clearInterval(id);
  }, [
    running,
    tab,
    zone2Minutes,
    vo2Steps,
    hiitSteps,
    hiitPreset,
    hiitTotalSeconds,
    customWork,
    customRest,
    customRounds,
    onLogCardioSession,
  ]);

  const handleStartPause = () => {
    setDoneMessage(null);
    loggedRef.current = false;
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

  const handleManualLogZone2 = async () => {
    const elapsed = zone2Minutes * 60 - zone2Left;
    const secsToLog = elapsed >= 60 ? elapsed : zone2Minutes * 60;
    setRunning(false);
    setPrepCountdown(null);
    await onLogCardioSession(
      'zone2-cardio-session',
      secsToLog,
      `Zone-2 Walk/Cardio (${Math.round(secsToLog / 60)} min)`,
    );
    setDoneMessage(`Logged ${Math.round(secsToLog / 60)}-min Zone-2 session to history!`);
  };

  const activeVo2 = vo2Steps[vo2Idx] ?? vo2Steps[0];
  const nextVo2 = vo2Steps[vo2Idx + 1];
  const vo2SegPct = Math.round(((activeVo2.seconds - vo2Left) / activeVo2.seconds) * 100);

  const activeHiit = hiitSteps[hiitIdx] ?? hiitSteps[0];
  const nextHiit = hiitSteps[hiitIdx + 1];
  const hiitSegPct = activeHiit
    ? Math.round(((activeHiit.seconds - hiitLeft) / activeHiit.seconds) * 100)
    : 0;
  const activePresetMeta = hiitPreset === 'custom' ? null : HIIT_PRESETS[hiitPreset];

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-[115] flex items-center justify-center bg-slate-900/55 p-3 backdrop-blur-xs">
      <div className="max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-3xl bg-white p-5 shadow-2xl space-y-4">
        {/* Header with Audio Cue Toggle & Close */}
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-1.5 text-lg font-extrabold text-slate-900">
              <HeartPulse className="h-5 w-5 text-blue-600" />
              <span>Heart &amp; Stamina Modes</span>
            </div>
            <p className="mt-0.5 text-xs text-slate-600">
              Easy Zone-2 base, research-backed HIIT timer, and VO2 Max booster.
            </p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setAudioEnabled((v) => !v)}
              aria-label={audioEnabled ? 'Mute audio cues' : 'Enable audio cues'}
              className={`flex items-center gap-1 rounded-xl border px-2.5 py-2 text-[11px] font-bold transition ${
                audioEnabled
                  ? 'border-blue-200 bg-blue-50 text-blue-700'
                  : 'border-slate-200 bg-slate-100 text-slate-500'
              }`}
            >
              {audioEnabled ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
              {audioEnabled ? 'Audio ON' : 'Audio OFF'}
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close Heart & Stamina"
              className="rounded-xl bg-slate-100 p-2 text-slate-500 hover:bg-slate-200"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Weekly Heart Progress Badges */}
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl border border-blue-100 bg-blue-50/70 px-3 py-2 text-center">
            <div className="text-[10px] font-bold uppercase text-blue-700">Zone-2 This Week</div>
            <div className="text-sm font-extrabold text-slate-900">
              {weeklyCardio.zone2Count} / 2 sessions
            </div>
          </div>
          <div className="rounded-xl border border-rose-100 bg-rose-50/70 px-3 py-2 text-center">
            <div className="text-[10px] font-bold uppercase text-rose-700">HIIT / VO2 This Week</div>
            <div className="text-sm font-extrabold text-slate-900">
              {weeklyCardio.hiitAndVo2Count} / 2–3 max
            </div>
          </div>
        </div>

        {/* 4 Cardio Mode Tabs */}
        <div className="grid grid-cols-4 gap-1">
          <button
            type="button"
            onClick={() => setTab('zone2')}
            className={`rounded-xl border px-1.5 py-2 text-[10.5px] font-bold transition ${
              tab === 'zone2'
                ? 'border-blue-600 bg-blue-600 text-white'
                : 'border-slate-200 bg-slate-50 text-slate-700'
            }`}
          >
            Zone-2
          </button>
          <button
            type="button"
            onClick={() => setTab('hiit')}
            className={`rounded-xl border px-1.5 py-2 text-[10.5px] font-bold transition ${
              tab === 'hiit'
                ? 'border-rose-600 bg-rose-600 text-white'
                : 'border-slate-200 bg-slate-50 text-slate-700'
            }`}
          >
            HIIT Timer
          </button>
          <button
            type="button"
            onClick={() => setTab('vo2max')}
            className={`rounded-xl border px-1.5 py-2 text-[10.5px] font-bold transition ${
              tab === 'vo2max'
                ? 'border-blue-600 bg-blue-600 text-white'
                : 'border-slate-200 bg-slate-50 text-slate-700'
            }`}
          >
            VO2 (8m)
          </button>
          <button
            type="button"
            onClick={() => setTab('finisher')}
            className={`rounded-xl border px-1.5 py-2 text-[10.5px] font-bold transition ${
              tab === 'finisher'
                ? 'border-amber-600 bg-amber-500 text-white'
                : 'border-slate-200 bg-slate-50 text-slate-700'
            }`}
          >
            Finisher
          </button>
        </div>

        {tab === 'zone2' && (
          <div className="space-y-3">
            <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-3 text-xs text-slate-700 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-blue-900">
                <span>Zone-2 Easy Endurance (&ldquo;Talk Test&rdquo; Pace)</span>
                <TermHint termId="zone2_cardio" />
              </div>
              <p className="leading-relaxed">
                Brisk walk, easy jog, bike, or steady indoor march. You should breathe a bit faster
                but still speak in full sentences comfortably.
              </p>
              <div className="text-[10px] text-slate-500">
                Science: San-Millán &amp; Brooks (2018, Sports Medicine) &amp; Mandsager et al. (2018, JAMA).
              </div>
            </div>

            <div className="flex items-center justify-center gap-2">
              {([15, 20, 30] as const).map((mins) => (
                <button
                  key={mins}
                  type="button"
                  onClick={() => setZone2Minutes(mins)}
                  className={`rounded-xl border px-4 py-1.5 text-xs font-bold ${
                    zone2Minutes === mins
                      ? 'border-blue-600 bg-blue-600 text-white'
                      : 'border-slate-200 bg-slate-50 text-slate-700'
                  }`}
                >
                  {mins} min
                </button>
              ))}
            </div>

            <div className="flex flex-col items-center rounded-2xl border border-slate-200 bg-slate-50/60 p-5 text-center space-y-3">
              <div className="flex h-40 w-40 flex-col items-center justify-center rounded-full border-[6px] border-blue-500 bg-white shadow-xs">
                {prepCountdown !== null ? (
                  <>
                    <span className="text-[11px] font-bold uppercase text-amber-600">Get Ready</span>
                    <span className="text-5xl font-black text-amber-700">{prepCountdown}</span>
                  </>
                ) : (
                  <>
                    <span className="text-[10px] font-bold uppercase text-blue-600">Zone-2 Timer</span>
                    <span className="text-4xl font-black text-slate-900">
                      {formatClock(zone2Left)}
                    </span>
                    <span className="text-[10px] text-slate-500">Conversational pace</span>
                  </>
                )}
              </div>

              {doneMessage && (
                <div className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800">
                  <CheckCircle2 className="h-4 w-4" />
                  {doneMessage}
                </div>
              )}

              <div className="flex w-full gap-2">
                <button
                  type="button"
                  onClick={handleStartPause}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-sm font-bold text-white shadow-sm hover:bg-blue-700"
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
                      <Play className="h-4 w-4" />{' '}
                      {zone2Left < zone2Minutes * 60 && zone2Left > 0
                        ? 'Resume Walk/Cardio'
                        : `Start ${zone2Minutes}m Walk/Cardio`}
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRunning(false);
                    setPrepCountdown(null);
                    setZone2Left(zone2Minutes * 60);
                  }}
                  aria-label="Reset Zone-2 timer"
                  className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-600"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
              </div>
              <button
                type="button"
                onClick={() => void handleManualLogZone2()}
                className="w-full rounded-xl border border-blue-200 bg-white py-2 text-xs font-bold text-blue-700 hover:bg-blue-50"
              >
                Already did a {zone2Minutes}-min brisk walk outside? Tap to log it
              </button>
            </div>
          </div>
        )}

        {tab === 'hiit' && (
          <div className="space-y-3">
            {/* Weekly Frequency Recovery Guard */}
            {weeklyCardio.hiitAndVo2Count >= 3 && (
              <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-2.5 text-[11px] leading-relaxed text-amber-900">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
                <span>
                  <strong>Recovery Guard:</strong> You already logged {weeklyCardio.hiitAndVo2Count}{' '}
                  high-intensity sessions this week. ACSM &amp; Buchheit/Laursen research recommends
                  2–3 HIIT sessions/week on non-consecutive days; consider Zone-2 today.
                </span>
              </div>
            )}

            {/* 4 HIIT Protocol Pills */}
            <div className="grid grid-cols-2 gap-1.5">
              {(['tabata', 'gibala', 'norwegian_4x4', 'custom'] as HiitPresetId[]).map((pid) => {
                const active = hiitPreset === pid;
                const title =
                  pid === 'tabata'
                    ? 'Tabata (20s/10s)'
                    : pid === 'gibala'
                      ? 'Gibala (60s/60s)'
                      : pid === 'norwegian_4x4'
                        ? 'Norwegian 4×4'
                        : 'Custom HIIT';
                const sub =
                  pid === 'custom'
                    ? `${customWork}s/${customRest}s × ${customRounds}`
                    : HIIT_PRESETS[pid].shortTag;
                return (
                  <button
                    key={pid}
                    type="button"
                    onClick={() => setHiitPreset(pid)}
                    className={`rounded-xl border p-2 text-left transition ${
                      active
                        ? 'border-rose-600 bg-rose-50 text-rose-950 ring-1 ring-rose-600'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="text-[11px] font-extrabold">{title}</div>
                    <div className="text-[10px] opacity-80">{sub}</div>
                  </button>
                );
              })}
            </div>

            {/* Per-Preset Benefit Explanation Card */}
            {activePresetMeta ? (
              <div className="rounded-2xl border border-rose-100 bg-rose-50/70 p-3 text-xs text-slate-700 space-y-1">
                <div className="flex items-center justify-between gap-2 font-bold text-rose-900">
                  <span>{activePresetMeta.label}</span>
                  <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold text-rose-700 border border-rose-200">
                    Total {Math.round(hiitTotalSeconds / 60)}m
                  </span>
                </div>
                <p className="leading-relaxed">
                  <strong>Why this preset:</strong> {activePresetMeta.benefitSummary}
                </p>
                <div className="text-[10px] text-slate-600">
                  <strong>Target Effort:</strong> {activePresetMeta.intensityLabel}
                </div>
                <div className="text-[10px] text-slate-500">
                  Science: {activePresetMeta.citation}
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-rose-100 bg-rose-50/70 p-3 text-xs text-slate-700 space-y-2.5">
                <div className="flex items-center justify-between gap-2 font-bold text-rose-900">
                  <span>Custom HIIT Builder</span>
                  <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold text-rose-700 border border-rose-200">
                    Ratio {formatWorkRestRatio(customWork, customRest)} ·{' '}
                    {formatClock(hiitTotalSeconds)}
                  </span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  <strong>Why custom ratios matter:</strong> <code>1:1</code> builds balanced
                  metabolic fitness, <code>2:1</code> pushes peak lactic tolerance, and{' '}
                  <code>1:2</code> lets you hit higher sprint speed each round (ACSM &amp; Buchheit
                  / Laursen, 2013/2022).
                </p>
                <div className="grid grid-cols-3 gap-1.5 text-center">
                  <div className="rounded-lg bg-white p-1.5 border border-rose-100">
                    <div className="text-[9.5px] font-bold text-slate-500">WORK (SEC)</div>
                    <input
                      type="number"
                      min={10}
                      max={240}
                      step={5}
                      value={customWork}
                      onChange={(e) =>
                        setCustomWork(Math.max(10, Math.min(240, Number(e.target.value) || 20)))
                      }
                      className="mt-0.5 w-full text-center text-xs font-extrabold text-slate-900 outline-none"
                    />
                  </div>
                  <div className="rounded-lg bg-white p-1.5 border border-rose-100">
                    <div className="text-[9.5px] font-bold text-slate-500">REST (SEC)</div>
                    <input
                      type="number"
                      min={10}
                      max={180}
                      step={5}
                      value={customRest}
                      onChange={(e) =>
                        setCustomRest(Math.max(10, Math.min(180, Number(e.target.value) || 10)))
                      }
                      className="mt-0.5 w-full text-center text-xs font-extrabold text-slate-900 outline-none"
                    />
                  </div>
                  <div className="rounded-lg bg-white p-1.5 border border-rose-100">
                    <div className="text-[9.5px] font-bold text-slate-500">ROUNDS</div>
                    <input
                      type="number"
                      min={2}
                      max={12}
                      value={customRounds}
                      onChange={(e) =>
                        setCustomRounds(Math.max(2, Math.min(12, Number(e.target.value) || 4)))
                      }
                      className="mt-0.5 w-full text-center text-xs font-extrabold text-slate-900 outline-none"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-1.5 text-[10.5px]">
                  <label className="flex items-center justify-between rounded-lg bg-white px-2 py-1.5 border border-rose-100">
                    <span className="font-semibold text-slate-600">Warm-Up:</span>
                    <select
                      value={customWarmup}
                      onChange={(e) => setCustomWarmup(Number(e.target.value))}
                      className="font-bold text-slate-900 outline-none bg-transparent"
                    >
                      <option value={0}>0s (Off)</option>
                      <option value={60}>60s</option>
                      <option value={120}>2m</option>
                    </select>
                  </label>
                  <label className="flex items-center justify-between rounded-lg bg-white px-2 py-1.5 border border-rose-100">
                    <span className="font-semibold text-slate-600">Cool-Down:</span>
                    <select
                      value={customCooldown}
                      onChange={(e) => setCustomCooldown(Number(e.target.value))}
                      className="font-bold text-slate-900 outline-none bg-transparent"
                    >
                      <option value={0}>0s (Off)</option>
                      <option value={60}>60s</option>
                      <option value={120}>2m</option>
                    </select>
                  </label>
                </div>
              </div>
            )}

            {/* HIIT Timer Ring + Timeline Pacer */}
            <div className="flex flex-col items-center rounded-2xl border border-slate-200 bg-slate-50/60 p-4 text-center space-y-3">
              <div
                className={`flex h-40 w-40 flex-col items-center justify-center rounded-full border-[6px] transition-all ${
                  prepCountdown !== null
                    ? 'border-amber-400 bg-amber-50'
                    : activeHiit?.kind === 'work'
                      ? 'border-rose-500 bg-rose-50'
                      : activeHiit?.kind === 'warmup' || activeHiit?.kind === 'cooldown'
                        ? 'border-teal-500 bg-teal-50'
                        : 'border-blue-400 bg-blue-50'
                }`}
              >
                {prepCountdown !== null ? (
                  <>
                    <span className="text-[11px] font-bold uppercase text-amber-700">Get Ready</span>
                    <span className="text-5xl font-black text-amber-700">{prepCountdown}</span>
                  </>
                ) : (
                  <>
                    <span className="text-[10px] font-bold uppercase text-slate-600">
                      {activeHiit?.kind === 'work'
                        ? 'WORK HARD'
                        : activeHiit?.kind === 'warmup'
                          ? 'WARM-UP'
                          : activeHiit?.kind === 'cooldown'
                            ? 'COOL-DOWN'
                            : 'REST'}
                    </span>
                    <span className="text-4xl font-black tabular-nums text-slate-900">
                      {formatClock(hiitLeft)}
                    </span>
                    <span className="mt-0.5 px-2 text-[10px] font-bold text-slate-700">
                      {activeHiit?.shortLabel}
                    </span>
                  </>
                )}
              </div>

              <p className="min-h-10 text-xs leading-relaxed text-slate-700">
                {prepCountdown !== null
                  ? 'Clear a small space around you — audio & vibration cues will guide every switch.'
                  : activeHiit?.cue}
              </p>

              {/* Visual Bar Pacer */}
              <div className="w-full space-y-1 text-left">
                <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600">
                  <span>Now: {activeHiit?.shortLabel}</span>
                  <span className="flex items-center gap-1 text-rose-700">
                    <ArrowRight className="h-3 w-3" />
                    Next: {nextHiit ? nextHiit.shortLabel : 'Finish'}
                  </span>
                </div>
                <div className="flex h-3 w-full gap-0.5 overflow-hidden rounded-full bg-slate-200 p-0.5">
                  {hiitSteps.map((s, idx) => {
                    const fill = idx < hiitIdx ? 100 : idx === hiitIdx ? hiitSegPct : 0;
                    const base =
                      s.kind === 'work'
                        ? 'bg-rose-200'
                        : s.kind === 'rest'
                          ? 'bg-blue-200'
                          : 'bg-teal-200';
                    const bar =
                      s.kind === 'work'
                        ? 'bg-rose-600'
                        : s.kind === 'rest'
                          ? 'bg-blue-500'
                          : 'bg-teal-500';
                    return (
                      <div
                        key={idx}
                        style={{ flexGrow: s.seconds }}
                        className={`h-full overflow-hidden rounded-full ${base}`}
                      >
                        <div
                          style={{ width: `${fill}%` }}
                          className={`h-full transition-all duration-300 ${bar}`}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              {doneMessage && (
                <div className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800">
                  <CheckCircle2 className="h-4 w-4" />
                  {doneMessage}
                </div>
              )}

              <div className="flex w-full gap-2">
                <button
                  type="button"
                  onClick={handleStartPause}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-rose-600 py-3 text-sm font-bold text-white shadow-sm hover:bg-rose-700"
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
                      <Timer className="h-4 w-4" />{' '}
                      {hiitIdx > 0 || hiitLeft < (hiitSteps[0]?.seconds ?? 0)
                        ? 'Resume HIIT'
                        : 'Start HIIT Timer'}
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRunning(false);
                    setPrepCountdown(null);
                    setHiitIdx(0);
                    setHiitLeft(hiitSteps[0]?.seconds ?? 20);
                  }}
                  aria-label="Reset HIIT timer"
                  className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-600"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {tab === 'vo2max' && (
          <div className="space-y-3">
            <div className="rounded-2xl border border-rose-100 bg-rose-50/70 p-3 text-xs text-slate-700 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-rose-900">
                <span>Weekly VO2 Max Booster (4 × 45s Push / 75s Easy)</span>
                <TermHint termId="vo2_max" />
              </div>
              <p className="leading-relaxed">
                Just <strong>once a week</strong>: 1-min warm-up + 4 crisp bursts to raise your peak
                oxygen ceiling.{' '}
                {profile.quiet_hotel_mode
                  ? 'Quiet Mode active: silent fast power moves only.'
                  : 'Use high-knees, stairs, or fast squats.'}
              </p>
              <div className="text-[10px] text-slate-500">
                Science: Helgerud et al. (2007, MSSE) &amp; Mandsager et al. (2018, JAMA Network Open).
              </div>
            </div>

            <div className="flex flex-col items-center rounded-2xl border border-slate-200 bg-slate-50/60 p-4 text-center space-y-3">
              <div
                className={`flex h-40 w-40 flex-col items-center justify-center rounded-full border-[6px] transition-all ${
                  prepCountdown !== null
                    ? 'border-amber-400 bg-amber-50'
                    : activeVo2.kind === 'hard'
                      ? 'border-rose-500 bg-rose-50'
                      : 'border-blue-400 bg-blue-50'
                }`}
              >
                {prepCountdown !== null ? (
                  <>
                    <span className="text-[11px] font-bold uppercase text-amber-700">Get Ready</span>
                    <span className="text-5xl font-black text-amber-700">{prepCountdown}</span>
                  </>
                ) : (
                  <>
                    <span className="text-[10px] font-bold uppercase text-slate-600">
                      {activeVo2.kind === 'hard'
                        ? 'BRISK PUSH'
                        : activeVo2.kind === 'warmup'
                          ? 'WARM-UP'
                          : 'EASY WALK'}
                    </span>
                    <span className="text-5xl font-black text-slate-900">{vo2Left}s</span>
                    <span className="mt-0.5 px-2 text-[10px] font-bold text-slate-700">
                      {activeVo2.shortLabel}
                    </span>
                  </>
                )}
              </div>

              <p className="min-h-10 text-xs leading-relaxed text-slate-700">
                {prepCountdown !== null
                  ? 'Clear a small space around you — starting with an easy 60s warm-up.'
                  : activeVo2.cue}
              </p>

              {/* Visual Bar Pacer */}
              <div className="w-full space-y-1 text-left">
                <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600">
                  <span>Now: {activeVo2.shortLabel}</span>
                  <span className="flex items-center gap-1 text-rose-700">
                    <ArrowRight className="h-3 w-3" />
                    Next: {nextVo2 ? nextVo2.shortLabel : 'Finish'}
                  </span>
                </div>
                <div className="flex h-3 w-full gap-1 overflow-hidden rounded-full bg-slate-200 p-0.5">
                  {vo2Steps.map((s, idx) => {
                    const fill = idx < vo2Idx ? 100 : idx === vo2Idx ? vo2SegPct : 0;
                    const base = s.kind === 'hard' ? 'bg-rose-200' : 'bg-blue-200';
                    const bar = s.kind === 'hard' ? 'bg-rose-600' : 'bg-blue-500';
                    return (
                      <div
                        key={idx}
                        style={{ flexGrow: s.seconds }}
                        className={`h-full overflow-hidden rounded-full ${base}`}
                      >
                        <div
                          style={{ width: `${fill}%` }}
                          className={`h-full transition-all duration-300 ${bar}`}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              {doneMessage && (
                <div className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800">
                  <CheckCircle2 className="h-4 w-4" />
                  {doneMessage}
                </div>
              )}

              <div className="flex w-full gap-2">
                <button
                  type="button"
                  onClick={handleStartPause}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-rose-600 py-3 text-sm font-bold text-white shadow-sm hover:bg-rose-700"
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
                      <Activity className="h-4 w-4" />{' '}
                      {vo2Idx > 0 || vo2Left < vo2Steps[0].seconds
                        ? 'Resume VO2 Max'
                        : 'Start VO2 Max (9 min)'}
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRunning(false);
                    setPrepCountdown(null);
                    setVo2Idx(0);
                    setVo2Left(vo2Steps[0].seconds);
                  }}
                  aria-label="Reset VO2 Max timer"
                  className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-600"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {tab === 'finisher' && (
          <div className="space-y-3">
            <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 text-xs text-slate-700 space-y-2">
              <div className="flex items-center gap-1.5 font-bold text-amber-900">
                <Flame className="h-4 w-4 text-amber-600" />
                <span>3–5 Min Post-Workout Cardio Finisher</span>
                <TermHint termId="cardio_finisher" />
              </div>
              <p className="leading-relaxed">
                Automatically appends 2 crisp 45–60s cardio rounds at the very end of your strength
                workout to boost heart health, calorie burn, and muscle-clearing blood flow without
                weakening strength gains.
              </p>
              <div className="text-[10px] text-slate-500">
                Science: Wilson et al. &amp; Coffey &amp; Hawley Concurrent Training Research.
              </div>
              <button
                type="button"
                disabled={isCardioForced}
                onClick={() => void onToggleFinisher()}
                className={`mt-2 w-full rounded-xl py-2.5 text-xs font-bold transition ${
                  cardioFinisherActive
                    ? 'bg-blue-600 text-white'
                    : 'border border-slate-300 bg-white text-slate-800 hover:bg-slate-50'
                }`}
              >
                {isCardioForced
                  ? 'Auto-Enabled for Pelvic & Stamina Goal'
                  : cardioFinisherActive
                    ? 'Post-Workout Cardio Finisher: ON (Tap to Turn Off)'
                    : 'Turn ON Post-Workout Cardio Finisher'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
