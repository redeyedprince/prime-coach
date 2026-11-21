import { useEffect, useState } from 'react';
import {
  Award,
  CheckCircle2,
  ClipboardCheck,
  Play,
  Square,
  Target,
  TrendingUp,
} from 'lucide-react';
import { appendPrimeAssessment, loadAllPrimeAssessments } from '../../db/database';
import { PRIME_PILLAR_META, scorePrimeAssessment } from '../../engine/primeCondition';
import type {
  PrimeAssessmentEntry,
  PrimeAssessmentInput,
  PrimePillarKey,
  PrimePillarScores,
  UserProfile,
} from '../../types/schemas';
import { TermHint } from '../common/TermHint';
import { ExerciseAnimator } from '../player/ExerciseAnimator';
import { BodyMetricsPanel } from './BodyMetricsPanel';

const PILLAR_ORDER: PrimePillarKey[] = [
  'strength',
  'mobility',
  'balance',
  'heart',
  'breath',
  'core',
];

const MOBILITY_OPTIONS: Array<{ value: 1 | 2 | 3 | 4 | 5; label: string }> = [
  { value: 1, label: '1 · Very stiff (hard to squat halfway or lift arms overhead)' },
  { value: 2, label: '2 · Tight (heels lift early or shoulders stop short overhead)' },
  { value: 3, label: '3 · Fair (moderate squat depth & comfortable arm raise)' },
  { value: 4, label: '4 · Good (deep squat with heels down & straight overhead reach)' },
  { value: 5, label: '5 · Fluid (effortless flat-foot deep squat + full tall reach)' },
];

const HEART_RECOVERY_OPTIONS: Array<{ value: 1 | 2 | 3 | 4 | 5; label: string }> = [
  { value: 1, label: '1 · Still winded after 2+ minutes of resting' },
  { value: 2, label: '2 · Breathing takes ~90–120s to settle back down' },
  { value: 3, label: '3 · Breathing settles smoothly in ~60s' },
  { value: 4, label: '4 · Calm nose breathing returns within ~30–45s' },
  { value: 5, label: '5 · Athletic — heart & breath calm almost immediately (<30s)' },
];

function BoltBreathVisualSvg() {
  return (
    <div className="grid grid-cols-3 gap-1.5 rounded-xl border border-teal-200/80 bg-white p-2 text-center">
      <div className="flex flex-col items-center gap-1 rounded-lg bg-teal-50/70 p-1.5">
        <svg viewBox="0 0 64 48" className="h-9 w-12" aria-hidden="true">
          <circle cx="24" cy="24" r="13" fill="none" stroke="#0f766e" strokeWidth="2.5" />
          <path d="M 37 22 Q 46 22 52 28" fill="none" stroke="#0d9488" strokeWidth="2.4" strokeLinecap="round" strokeDasharray="3 2" />
          <polyline points="48,29 53,29 52,24" fill="none" stroke="#0d9488" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span className="text-[9.5px] font-bold leading-tight text-teal-900">
          1. Normal nose exhale
        </span>
      </div>
      <div className="flex flex-col items-center gap-1 rounded-lg bg-teal-50/70 p-1.5">
        <svg viewBox="0 0 64 48" className="h-9 w-12" aria-hidden="true">
          <circle cx="32" cy="26" r="14" fill="none" stroke="#0f766e" strokeWidth="2.5" />
          <line x1="32" y1="26" x2="32" y2="17" stroke="#0d9488" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="32" y1="26" x2="39" y2="26" stroke="#0d9488" strokeWidth="2.2" strokeLinecap="round" />
          <line x1="27" y1="9" x2="37" y2="9" stroke="#0f766e" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
        <span className="text-[9.5px] font-bold leading-tight text-teal-900">
          2. Pinch nose &amp; time
        </span>
      </div>
      <div className="flex flex-col items-center gap-1 rounded-lg bg-teal-50/70 p-1.5">
        <svg viewBox="0 0 64 48" className="h-9 w-12" aria-hidden="true">
          <circle cx="38" cy="24" r="13" fill="none" stroke="#0f766e" strokeWidth="2.5" />
          <path d="M 10 26 Q 18 22 25 22" fill="none" stroke="#0d9488" strokeWidth="2.4" strokeLinecap="round" />
          <polyline points="21,19 26,22 21,25" fill="none" stroke="#0d9488" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span className="text-[9.5px] font-bold leading-tight text-teal-900">
          3. Stop at 1st urge
        </span>
      </div>
    </div>
  );
}

function RadarChart({ scores }: { scores: PrimePillarScores }) {
  const cx = 140;
  const cy = 126;
  const maxR = 84;

  const pointFor = (idx: number, pct: number) => {
    const angle = (-90 + idx * 60) * (Math.PI / 180);
    const r = (pct / 100) * maxR;
    return {
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle),
    };
  };

  const rings = [25, 50, 75, 100];
  const dataPoints = PILLAR_ORDER.map((key, idx) => pointFor(idx, scores[key]));
  const polygonStr = dataPoints.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

  return (
    <svg viewBox="0 0 280 256" className="mx-auto w-full max-w-[270px]">
      {rings.map((ring) => {
        const pts = PILLAR_ORDER.map((_, idx) => pointFor(idx, ring))
          .map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`)
          .join(' ');
        return (
          <polygon
            key={ring}
            points={pts}
            fill="none"
            stroke="#e2e8f0"
            strokeWidth={ring === 100 ? 1.5 : 1}
          />
        );
      })}

      {PILLAR_ORDER.map((key, idx) => {
        const outer = pointFor(idx, 100);
        const labelPt = pointFor(idx, 124);
        return (
          <g key={key}>
            <line
              x1={cx}
              y1={cy}
              x2={outer.x}
              y2={outer.y}
              stroke="#e2e8f0"
              strokeWidth={1}
            />
            <text
              x={labelPt.x}
              y={labelPt.y}
              textAnchor="middle"
              dominantBaseline="middle"
              className="fill-slate-700 text-[10px] font-bold"
            >
              {PRIME_PILLAR_META[key].shortLabel}
            </text>
            <text
              x={labelPt.x}
              y={labelPt.y + 11}
              textAnchor="middle"
              dominantBaseline="middle"
              className="fill-blue-600 text-[9px] font-extrabold"
            >
              {scores[key]}%
            </text>
          </g>
        );
      })}

      <polygon
        points={polygonStr}
        fill="rgba(13, 148, 136, 0.20)"
        stroke="#0d9488"
        strokeWidth={2.5}
        strokeLinejoin="round"
      />
      {dataPoints.map((pt, idx) => (
        <circle
          key={PILLAR_ORDER[idx]}
          cx={pt.x}
          cy={pt.y}
          r={4}
          fill="#0d9488"
          stroke="#ffffff"
          strokeWidth={1.5}
        />
      ))}
    </svg>
  );
}

interface PrimeConditionScreenProps {
  profile: UserProfile;
  onProfileUpdated: (next: UserProfile) => void;
  initialSubTab?: 'pillars' | 'body';
}

export function PrimeConditionScreen({
  profile,
  onProfileUpdated,
  initialSubTab = 'pillars',
}: PrimeConditionScreenProps) {
  const [subTab, setSubTab] = useState<'pillars' | 'body'>(initialSubTab);
  const [history, setHistory] = useState<PrimeAssessmentEntry[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [savedNotice, setSavedNotice] = useState<string | null>(null);

  const [form, setForm] = useState<PrimeAssessmentInput>({
    pushups_max: profile.biological_sex === 'female' ? 10 : 18,
    pushup_variant: 'full',
    plank_seconds: 60,
    balance_seconds: 20,
    balance_eyes_closed: false,
    mobility_rating: 3,
    heart_recovery_rating: 3,
    bolt_seconds: 22,
  });

  // Live inline stopwatch for Plank, Balance, or BOLT test
  const [activeTimerField, setActiveTimerField] = useState<
    'plank_seconds' | 'balance_seconds' | 'bolt_seconds' | null
  >(null);
  const [timerElapsed, setTimerElapsed] = useState(0);

  useEffect(() => {
    void loadAllPrimeAssessments().then((rows) => {
      setHistory(rows);
      if (rows.length > 0) {
        const last = rows[rows.length - 1];
        setForm({
          pushups_max: last.pushups_max,
          pushup_variant: last.pushup_variant,
          plank_seconds: last.plank_seconds,
          balance_seconds: last.balance_seconds,
          balance_eyes_closed: last.balance_eyes_closed,
          mobility_rating: last.mobility_rating,
          heart_recovery_rating: last.heart_recovery_rating,
          bolt_seconds: last.bolt_seconds,
        });
      }
    });
  }, []);

  useEffect(() => {
    if (!activeTimerField) return;
    const id = window.setInterval(() => {
      setTimerElapsed((s) => s + 1);
    }, 1000);
    return () => window.clearInterval(id);
  }, [activeTimerField]);

  const toggleInlineStopwatch = (
    field: 'plank_seconds' | 'balance_seconds' | 'bolt_seconds',
  ) => {
    if (activeTimerField === field) {
      const captured = Math.max(1, timerElapsed);
      setForm((prev) => ({ ...prev, [field]: captured }));
      setActiveTimerField(null);
      setTimerElapsed(0);
    } else {
      setActiveTimerField(field);
      setTimerElapsed(0);
    }
  };

  const handleSaveAssessment = async () => {
    setActiveTimerField(null);
    const scored = scorePrimeAssessment(form, profile.biological_sex);
    const today = new Date().toISOString().slice(0, 10);
    const entry: Omit<PrimeAssessmentEntry, 'id'> = {
      ...form,
      date: today,
      created_at: new Date().toISOString(),
      ...scored,
    };
    await appendPrimeAssessment(entry);
    const refreshed = await loadAllPrimeAssessments();
    setHistory(refreshed);
    setShowForm(false);
    setSavedNotice(`Prime Check-Up saved! Overall Score: ${scored.overall_score}/100`);
    window.setTimeout(() => setSavedNotice(null), 3500);
  };

  const latest = history.length > 0 ? history[history.length - 1] : null;
  const previous = history.length > 1 ? history[history.length - 2] : null;
  const delta = latest && previous ? latest.overall_score - previous.overall_score : null;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-1.5 rounded-xl border border-slate-200 bg-white p-1 shadow-xs">
        <button
          type="button"
          onClick={() => setSubTab('pillars')}
          className={`rounded-lg py-2 text-xs font-bold transition ${
            subTab === 'pillars' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          6-Pillar Check-Up
        </button>
        <button
          type="button"
          onClick={() => setSubTab('body')}
          className={`rounded-lg py-2 text-xs font-bold transition ${
            subTab === 'body' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          Body Metrics (cm)
        </button>
      </div>

      {subTab === 'body' ? (
        <BodyMetricsPanel profile={profile} onProfileUpdated={onProfileUpdated} />
      ) : (
        <>
          <div className="rounded-2xl border border-blue-200 bg-blue-50/70 p-3.5 text-xs text-slate-700 space-y-1">
        <div className="flex items-center gap-1.5 font-bold text-blue-900">
          <ClipboardCheck className="h-4 w-4 text-blue-600" />
          <span>6-Pillar Prime Condition Check-Up</span>
          <TermHint termId="prime_score" />
        </div>
        <p className="leading-relaxed">
          An optional 5-minute monthly self-test across <strong>Strength, Mobility, Balance,
          Heart, Breath, and Core</strong> so you can see every physical strength and spot your #1
          area to upgrade next.
        </p>
      </div>

      {savedNotice && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs font-bold text-emerald-800">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          {savedNotice}
        </div>
      )}

      {latest && !showForm && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[11px] font-bold uppercase text-slate-500">
                Latest Snapshot ({latest.date})
              </div>
              <div className="mt-0.5 flex items-baseline gap-2">
                <span className="text-3xl font-black text-slate-900">
                  {latest.overall_score}
                </span>
                <span className="text-xs font-bold text-slate-500">/ 100 Prime Score</span>
                {delta !== null && (
                  <span
                    className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      delta >= 0
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-amber-100 text-amber-700'
                    }`}
                  >
                    <TrendingUp className="h-3 w-3" />
                    {delta >= 0 ? `+${delta}` : delta} pts
                  </span>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="rounded-xl bg-blue-600 px-3 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700"
            >
              New Check-Up
            </button>
          </div>

          <RadarChart scores={latest.pillar_scores} />

          {/* Strongest & Priority Cards */}
          <div className="grid grid-cols-1 gap-2.5">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 text-xs">
              <div className="flex items-center gap-1.5 font-bold text-emerald-800">
                <Award className="h-4 w-4" />
                Strongest Pillar: {PRIME_PILLAR_META[latest.strongest_pillar].label} (
                {latest.pillar_scores[latest.strongest_pillar]}%)
              </div>
              <p className="mt-1 text-slate-700">
                {PRIME_PILLAR_META[latest.strongest_pillar].whatItMeasures}
              </p>
            </div>

            <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3 text-xs">
              <div className="flex items-center gap-1.5 font-bold text-amber-900">
                <Target className="h-4 w-4 text-amber-700" />
                #1 Priority to Upgrade: {PRIME_PILLAR_META[latest.weakest_pillar].label} (
                {latest.pillar_scores[latest.weakest_pillar]}%)
              </div>
              <p className="mt-1 text-slate-800">
                <strong>Next Step:</strong> {PRIME_PILLAR_META[latest.weakest_pillar].nextStepTip}
              </p>
              <p className="mt-1 text-[10px] text-slate-500">
                Science: {PRIME_PILLAR_META[latest.weakest_pillar].citation}
              </p>
            </div>
          </div>
        </div>
      )}

      {(!latest || showForm) && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-extrabold text-slate-900">
              {latest ? 'Log a New Monthly Check-Up' : 'Run Your First 5-Min Check-Up'}
            </h2>
            {latest && (
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="text-xs font-semibold text-slate-500"
              >
                Cancel
              </button>
            )}
          </div>

          {/* 1. Strength */}
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 space-y-2.5">
            <div className="flex items-center gap-3">
              <ExerciseAnimator
                slug={form.pushup_variant === 'knee' ? 'knee-push-up' : 'push-up'}
                alt={form.pushup_variant === 'knee' ? 'Knee Push-Up' : 'Push-Up'}
                className="h-20 w-20 shrink-0"
              />
              <div className="min-w-0 flex-1 space-y-1">
                <div className="text-xs font-bold text-slate-900">
                  1. Strength — Max Clean Push-Ups
                </div>
                <p className="text-[11px] leading-snug text-slate-600">
                  Keep your body straight from head to heels (or knees). Lower chest cleanly and stop as soon as form dips.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setForm({ ...form, pushup_variant: 'full' })}
                className={`rounded-lg border px-2.5 py-1 text-[11px] font-bold ${
                  form.pushup_variant === 'full'
                    ? 'border-blue-600 bg-blue-600 text-white'
                    : 'border-slate-200 bg-white text-slate-600'
                }`}
              >
                Full Push-Ups
              </button>
              <button
                type="button"
                onClick={() => setForm({ ...form, pushup_variant: 'knee' })}
                className={`rounded-lg border px-2.5 py-1 text-[11px] font-bold ${
                  form.pushup_variant === 'knee'
                    ? 'border-blue-600 bg-blue-600 text-white'
                    : 'border-slate-200 bg-white text-slate-600'
                }`}
              >
                Knee Push-Ups
              </button>
              <input
                type="number"
                min={0}
                max={120}
                value={form.pushups_max}
                onChange={(e) =>
                  setForm({ ...form, pushups_max: Math.max(0, Number(e.target.value) || 0) })
                }
                className="ml-auto w-20 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-center text-sm font-bold text-slate-900"
              />
            </div>
            <div className="text-[10px] text-slate-500">
              Norm: Yang et al. (2019, JAMA Network Open) &amp; ACSM strength brackets.
            </div>
          </div>

          {/* 2. Core */}
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 space-y-2.5">
            <div className="flex items-center gap-3">
              <ExerciseAnimator
                slug="plank"
                alt="Forearm Plank"
                className="h-20 w-20 shrink-0"
              />
              <div className="min-w-0 flex-1 space-y-1">
                <div className="text-xs font-bold text-slate-900">
                  2. Core Endurance — Clean Forearm Plank
                </div>
                <p className="text-[11px] leading-snug text-slate-600">
                  Elbows under shoulders, ribs tucked, glutes gently squeezed. Stop when your lower back starts to sag.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => toggleInlineStopwatch('plank_seconds')}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold text-white ${
                  activeTimerField === 'plank_seconds' ? 'bg-rose-600' : 'bg-blue-600'
                }`}
              >
                {activeTimerField === 'plank_seconds' ? (
                  <>
                    <Square className="h-3.5 w-3.5" /> Stop ({timerElapsed}s)
                  </>
                ) : (
                  <>
                    <Play className="h-3.5 w-3.5" /> Live Timer
                  </>
                )}
              </button>
              <input
                type="number"
                min={0}
                max={600}
                value={form.plank_seconds}
                onChange={(e) =>
                  setForm({ ...form, plank_seconds: Math.max(0, Number(e.target.value) || 0) })
                }
                className="ml-auto w-20 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-center text-sm font-bold text-slate-900"
              />
              <span className="text-xs text-slate-500">sec</span>
            </div>
            <div className="text-[10px] text-slate-500">
              Norm: McGill (2010) Core Endurance Benchmark (120s clean hold = top score).
            </div>
          </div>

          {/* 3. Balance */}
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 space-y-2.5">
            <div className="flex items-center gap-3">
              <ExerciseAnimator
                slug="single-leg-balance-hold"
                alt="Single-Leg Balance Stand"
                className="h-20 w-20 shrink-0"
              />
              <div className="min-w-0 flex-1 space-y-1">
                <div className="text-xs font-bold text-slate-900">
                  3. Balance — Single-Leg Stand (Weaker Leg)
                </div>
                <p className="text-[11px] leading-snug text-slate-600">
                  Stand barefoot on one leg with your opposite knee lifted. Stop the timer when your lifted foot touches down.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => toggleInlineStopwatch('balance_seconds')}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold text-white ${
                  activeTimerField === 'balance_seconds' ? 'bg-rose-600' : 'bg-blue-600'
                }`}
              >
                {activeTimerField === 'balance_seconds' ? (
                  <>
                    <Square className="h-3.5 w-3.5" /> Stop ({timerElapsed}s)
                  </>
                ) : (
                  <>
                    <Play className="h-3.5 w-3.5" /> Live Timer
                  </>
                )}
              </button>
              <label className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-700">
                <input
                  type="checkbox"
                  checked={form.balance_eyes_closed}
                  onChange={(e) =>
                    setForm({ ...form, balance_eyes_closed: e.target.checked })
                  }
                  className="h-4 w-4 accent-blue-600"
                />
                Eyes Closed
              </label>
              <input
                type="number"
                min={0}
                max={180}
                value={form.balance_seconds}
                onChange={(e) =>
                  setForm({
                    ...form,
                    balance_seconds: Math.max(0, Number(e.target.value) || 0),
                  })
                }
                className="ml-auto w-20 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-center text-sm font-bold text-slate-900"
              />
              <span className="text-xs text-slate-500">sec</span>
            </div>
            <div className="text-[10px] text-slate-500">
              Norm: Araujo et al. (2022, BJSM — 10s+ longevity benchmark) &amp; Springer et al. (2007).
            </div>
          </div>

          {/* 4. Mobility */}
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 space-y-2.5">
            <div className="flex items-center gap-3">
              <ExerciseAnimator
                slug="deep-squat-ankle-opener"
                alt="Deep Squat & Overhead Reach"
                className="h-20 w-20 shrink-0"
              />
              <div className="min-w-0 flex-1 space-y-1">
                <div className="text-xs font-bold text-slate-900">
                  4. Mobility — Deep Squat &amp; Overhead Reach
                </div>
                <p className="text-[11px] leading-snug text-slate-600">
                  Sink into a slow flat-foot squat (heels down) and reach both arms tall overhead without arching your lower back.
                </p>
              </div>
            </div>
            <select
              value={form.mobility_rating}
              onChange={(e) =>
                setForm({ ...form, mobility_rating: Number(e.target.value) as 1 | 2 | 3 | 4 | 5 })
              }
              className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs text-slate-800"
            >
              {MOBILITY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* 5. Heart Recovery */}
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 space-y-2.5">
            <div className="flex items-center gap-3">
              <ExerciseAnimator
                slug="high-knees"
                alt="3-Min Brisk March or Stairs"
                className="h-20 w-20 shrink-0"
              />
              <div className="min-w-0 flex-1 space-y-1">
                <div className="text-xs font-bold text-slate-900">
                  5. Heart &amp; Stamina — 3-Min Brisk March
                </div>
                <p className="text-[11px] leading-snug text-slate-600">
                  March briskly in place (or climb stairs) for 3 minutes, then stop and notice how fast your breathing calms down.
                </p>
              </div>
            </div>
            <select
              value={form.heart_recovery_rating}
              onChange={(e) =>
                setForm({
                  ...form,
                  heart_recovery_rating: Number(e.target.value) as 1 | 2 | 3 | 4 | 5,
                })
              }
              className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs text-slate-800"
            >
              {HEART_RECOVERY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* 6. Breath Efficiency (BOLT) */}
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 space-y-2.5">
            <div className="flex items-center gap-1 text-xs font-bold text-slate-900">
              <span>6. Breath Efficiency — Comfortable Nasal Hold (BOLT)</span>
              <TermHint termId="bolt_score" />
            </div>
            <BoltBreathVisualSvg />
            <p className="text-[11px] leading-relaxed text-slate-600">
              Breathe gently out through your nose, pinch closed, and stop the timer at the{' '}
              <strong>first mild urge</strong> to inhale (not a hard gasp).
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => toggleInlineStopwatch('bolt_seconds')}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold text-white ${
                  activeTimerField === 'bolt_seconds' ? 'bg-rose-600' : 'bg-teal-600'
                }`}
              >
                {activeTimerField === 'bolt_seconds' ? (
                  <>
                    <Square className="h-3.5 w-3.5" /> Stop ({timerElapsed}s)
                  </>
                ) : (
                  <>
                    <Play className="h-3.5 w-3.5" /> Time Nasal Hold
                  </>
                )}
              </button>
              <input
                type="number"
                min={5}
                max={90}
                value={form.bolt_seconds}
                onChange={(e) =>
                  setForm({ ...form, bolt_seconds: Math.max(5, Number(e.target.value) || 5) })
                }
                className="ml-auto w-20 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-center text-sm font-bold text-slate-900"
              />
              <span className="text-xs text-slate-500">sec</span>
            </div>
            <div className="text-[10px] text-slate-500">
              Norm: Courtney &amp; Cohen (2008) breath-hold &amp; CO2 tolerance (25–40s = strong calm efficiency).
            </div>
          </div>

          <button
            type="button"
            onClick={() => void handleSaveAssessment()}
            className="w-full rounded-xl bg-blue-600 py-3.5 text-sm font-bold text-white shadow-sm hover:bg-blue-700"
          >
            Calculate My 6-Pillar Prime Score
          </button>
        </div>
      )}
        </>
      )}
    </div>
  );
}
