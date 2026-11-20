import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  ArrowRight,
  CheckCircle2,
  Flame,
  HeartPulse,
  Pause,
  Play,
  RotateCcw,
  X,
} from 'lucide-react';
import type { UserProfile, WorkoutLogEntry } from '../../types/schemas';
import { TermHint } from '../common/TermHint';

type CardioTab = 'zone2' | 'vo2max' | 'finisher';

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
  const easyMove = 'Easy slow walk in place or relaxed shoulder rolls — catch your breath through your nose.';

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

  return list; // 60 + 4*(45+75) = 540s = 9 min (warm-up + 8 min intervals)
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
    slug: 'zone2-cardio-session' | 'vo2max-interval-session',
    durationSeconds: number,
    notes: string,
  ) => Promise<void>;
  onClose: () => void;
}

export function CardioModesModal({
  profile,
  logs,
  cardioFinisherActive,
  isCardioForced,
  onToggleFinisher,
  onLogCardioSession,
  onClose,
}: CardioModesModalProps) {
  const [tab, setTab] = useState<CardioTab>('zone2');
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
  const [doneMessage, setDoneMessage] = useState<string | null>(null);
  const loggedRef = useRef(false);

  // Count weekly Zone-2 and VO2 Max sessions in last 7 days
  const weeklyCardio = useMemo(() => {
    const cutoff = new Date(Date.now() - 6 * 86_400_000).toISOString().slice(0, 10);
    const recent = logs.filter((l) => l.date >= cutoff);
    return {
      zone2Count: recent.filter((l) => l.exercise_slug === 'zone2-cardio-session').length,
      vo2Count: recent.filter((l) => l.exercise_slug === 'vo2max-interval-session').length,
    };
  }, [logs]);

  const fireVibrate = (pattern: number[]) => {
    try {
      navigator.vibrate?.(pattern);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    setRunning(false);
    setPrepCountdown(null);
    setDoneMessage(null);
    loggedRef.current = false;
    setZone2Left(zone2Minutes * 60);
    setVo2Idx(0);
    setVo2Left(vo2Steps[0].seconds);
  }, [tab, zone2Minutes, vo2Steps]);

  // 5-second Get Ready countdown
  useEffect(() => {
    if (prepCountdown === null) return;
    if (prepCountdown <= 0) {
      setPrepCountdown(null);
      fireVibrate([75]);
      setRunning(true);
      return;
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
          fireVibrate([100, 80, 120]);
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
          if (prev > 1) return prev - 1;
          setVo2Idx((idx) => {
            const nextIdx = idx + 1;
            if (nextIdx >= vo2Steps.length) {
              setRunning(false);
              fireVibrate([100, 80, 120]);
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
            fireVibrate(vo2Steps[nextIdx].kind === 'hard' ? [120, 60, 120] : [60]);
            setVo2Left(vo2Steps[nextIdx].seconds);
            return nextIdx;
          });
          return prev;
        });
      }
    }, 1000);
    return () => window.clearInterval(id);
  }, [running, tab, zone2Minutes, vo2Steps, onLogCardioSession]);

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-3 backdrop-blur-xs">
      <div className="max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-3xl bg-white p-5 shadow-2xl space-y-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-1.5 text-lg font-extrabold text-slate-900">
              <HeartPulse className="h-5 w-5 text-blue-600" />
              <span>Heart &amp; Stamina Modes</span>
            </div>
            <p className="mt-0.5 text-xs text-slate-600">
              Train both heart gears: easy Zone-2 base + one short weekly VO2 Max booster.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Heart & Stamina"
            className="rounded-xl bg-slate-100 p-2 text-slate-500 hover:bg-slate-200"
          >
            <X className="h-4 w-4" />
          </button>
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
            <div className="text-[10px] font-bold uppercase text-rose-700">VO2 Max This Week</div>
            <div className="text-sm font-extrabold text-slate-900">
              {weeklyCardio.vo2Count} / 1 session
            </div>
          </div>
        </div>

        {/* 3 Cardio Mode Tabs */}
        <div className="grid grid-cols-3 gap-1.5">
          <button
            type="button"
            onClick={() => setTab('zone2')}
            className={`rounded-xl border px-2 py-2 text-[11px] font-bold transition ${
              tab === 'zone2'
                ? 'border-blue-600 bg-blue-600 text-white'
                : 'border-slate-200 bg-slate-50 text-slate-700'
            }`}
          >
            Zone-2 Base
          </button>
          <button
            type="button"
            onClick={() => setTab('vo2max')}
            className={`rounded-xl border px-2 py-2 text-[11px] font-bold transition ${
              tab === 'vo2max'
                ? 'border-rose-600 bg-rose-600 text-white'
                : 'border-slate-200 bg-slate-50 text-slate-700'
            }`}
          >
            VO2 Max (8m)
          </button>
          <button
            type="button"
            onClick={() => setTab('finisher')}
            className={`rounded-xl border px-2 py-2 text-[11px] font-bold transition ${
              tab === 'finisher'
                ? 'border-amber-600 bg-amber-500 text-white'
                : 'border-slate-200 bg-slate-50 text-slate-700'
            }`}
          >
            5m Finisher
          </button>
        </div>

        {tab === 'zone2' && (
          <div className="space-y-3">
            <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-3 text-xs text-slate-700 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-blue-900">
                <span>Zone-2 Easy Endurance ("Talk Test" Pace)</span>
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
                      <Play className="h-4 w-4" /> Start {zone2Minutes}m Walk/Cardio
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

        {tab === 'vo2max' && (
          <div className="space-y-3">
            <div className="rounded-2xl border border-rose-100 bg-rose-50/70 p-3 text-xs text-slate-700 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-rose-900">
                <span>Weekly VO2 Max Booster (4 × 45s Push / 75s Easy)</span>
                <TermHint termId="vo2_max" />
              </div>
              <p className="leading-relaxed">
                Just <strong>once a week</strong>: 1-min warm-up + 4 crisp bursts to raise your peak
                oxygen ceiling. {profile.quiet_hotel_mode ? 'Quiet Mode active: silent fast power moves only.' : 'Use high-knees, stairs, or fast squats.'}
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
                      {activeVo2.kind === 'hard' ? 'BRISK PUSH' : activeVo2.kind === 'warmup' ? 'WARM-UP' : 'EASY WALK'}
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
                      <Activity className="h-4 w-4" /> Start VO2 Max (9 min)
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
    </div>
  );
}
