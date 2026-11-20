import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  BookOpen,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronUp,
  Moon,
  Sparkles,
} from 'lucide-react';
import { COACH_ARTICLES } from '../../data/coachArticles';
import { saveProgramConfig, saveUserProfile } from '../../db/database';
import {
  applyRecommendedPlanToConfig,
  BODY_FOCUS_PROFILES,
  buildMonthlyMesocycle,
  DAY_NAMES,
  getGoalsForSex,
  GOAL_RESEARCH_PROFILES,
} from '../../engine/planBuilder';
import type {
  BodyFocus,
  MovementPattern,
  PrimaryGoal,
  ProgramConfig,
  UserProfile,
  WeeklySplitDay,
} from '../../types/schemas';
import { TermHint } from '../common/TermHint';
import { PrimeConditionScreen } from './PrimeConditionScreen';

interface PlanBuilderScreenProps {
  profile: UserProfile;
  config: ProgramConfig;
  initialView?: 'weekly' | 'monthly' | 'prime' | 'guide';
  initialPrimeSubTab?: 'pillars' | 'body';
  onProfileUpdated: (next: UserProfile) => void;
  onConfigUpdated: (next: ProgramConfig) => void;
}

const PATTERNS: MovementPattern[] = ['push', 'pull', 'legs', 'core'];

export function PlanBuilderScreen({
  profile,
  config,
  initialView = 'weekly',
  initialPrimeSubTab = 'pillars',
  onProfileUpdated,
  onConfigUpdated,
}: PlanBuilderScreenProps) {
  const [view, setView] = useState<'weekly' | 'monthly' | 'prime' | 'guide'>(initialView);
  const [selectedFocus, setSelectedFocus] = useState<BodyFocus>(profile.body_focus ?? 'balanced');
  const [selectedGoal, setSelectedGoal] = useState<PrimaryGoal>(profile.primary_goal);
  const [daysCount, setDaysCount] = useState<number>(profile.days_per_week);
  const [editingDayIdx, setEditingDayIdx] = useState<number | null>(null);
  const [openArticleId, setOpenArticleId] = useState<string | null>('tendon');
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  const research = GOAL_RESEARCH_PROFILES[selectedGoal];
  const sexGoals = getGoalsForSex(profile.biological_sex);
  const focusMeta = sexGoals.find((g) => g.id === selectedFocus) ?? BODY_FOCUS_PROFILES[selectedFocus];

  const sevenDaySplit: WeeklySplitDay[] = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const found = config.weekly_split.find((d) => d.day === i + 1) ?? config.weekly_split[i];
      if (found) return { ...found, day: i + 1 };
      return { day: i + 1, focus: ['rest'], target_minutes: 10 };
    });
  }, [config.weekly_split]);

  const mesocycle = useMemo(() => buildMonthlyMesocycle(sevenDaySplit), [sevenDaySplit]);

  const flashSaved = (msg: string) => {
    setSavedMsg(msg);
    window.setTimeout(() => setSavedMsg(null), 2500);
  };

  const handleApplyRecommended = async () => {
    const nextConfig = applyRecommendedPlanToConfig(
      config,
      selectedGoal,
      daysCount,
      profile.session_duration_minutes,
      profile.biological_sex,
      selectedFocus,
    );
    const nextProfile: UserProfile = {
      ...profile,
      body_focus: selectedFocus,
      primary_goal: selectedGoal,
      days_per_week: daysCount,
      updated_at: new Date().toISOString().slice(0, 10),
    };
    await Promise.all([saveProgramConfig(nextConfig), saveUserProfile(nextProfile)]);
    onConfigUpdated(nextConfig);
    onProfileUpdated(nextProfile);
    flashSaved(`Applied ${focusMeta.shortLabel} · ${research.label} (${daysCount}d/wk).`);
  };

  const handleToggleDayRest = async (dayIdx: number) => {
    const updatedSplit = sevenDaySplit.map((d, i) => {
      if (i !== dayIdx) return d;
      const isRest = d.focus.includes('rest');
      return {
        ...d,
        focus: isRest ? ['push', 'pull'] : ['rest'],
        target_minutes: isRest ? profile.session_duration_minutes : 10,
      };
    });
    const nextConfig: ProgramConfig = {
      ...config,
      meta: { ...config.meta, updated_at: new Date().toISOString().slice(0, 10) },
      weekly_split: updatedSplit,
    };
    await saveProgramConfig(nextConfig);
    onConfigUpdated(nextConfig);
    flashSaved(`Updated ${DAY_NAMES[dayIdx]}.`);
  };

  const handleTogglePatternOnDay = async (dayIdx: number, pattern: MovementPattern) => {
    const updatedSplit = sevenDaySplit.map((d, i) => {
      if (i !== dayIdx) return d;
      const clean = d.focus.filter((f) => f !== 'rest');
      const next = clean.includes(pattern)
        ? clean.filter((f) => f !== pattern)
        : [...clean, pattern];
      return {
        ...d,
        focus: next.length === 0 ? ['rest'] : next,
        target_minutes: next.length === 0 ? 10 : profile.session_duration_minutes,
      };
    });
    const nextConfig: ProgramConfig = {
      ...config,
      meta: { ...config.meta, updated_at: new Date().toISOString().slice(0, 10) },
      weekly_split: updatedSplit,
    };
    await saveProgramConfig(nextConfig);
    onConfigUpdated(nextConfig);
  };

  const effectiveRest =
    profile.biological_sex === 'female' ? research.femaleRestSeconds : research.restSeconds;
  const effectiveReps =
    profile.biological_sex === 'female' ? research.femaleRepRange : research.repRange;

  return (
    <div className="space-y-4 pb-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Plan &amp; Guide</h1>
          <p className="text-xs text-slate-600">
            Schedule &amp; bite-sized coaching for {profile.user_name} ({profile.biological_sex})
          </p>
        </div>
        <div className="flex rounded-xl border border-slate-200 bg-white p-1 shadow-xs">
          <button
            type="button"
            onClick={() => setView('weekly')}
            className={`rounded-lg px-2.5 py-1.5 text-xs font-bold ${
              view === 'weekly' ? 'bg-blue-600 text-white' : 'text-slate-500'
            }`}
          >
            Weekly
          </button>
          <button
            type="button"
            onClick={() => setView('monthly')}
            className={`rounded-lg px-2.5 py-1.5 text-xs font-bold ${
              view === 'monthly' ? 'bg-blue-600 text-white' : 'text-slate-500'
            }`}
          >
            Monthly
          </button>
          <button
            type="button"
            onClick={() => setView('prime')}
            className={`rounded-lg px-2.5 py-1.5 text-xs font-bold ${
              view === 'prime' ? 'bg-blue-600 text-white' : 'text-slate-500'
            }`}
          >
            Prime
          </button>
          <button
            type="button"
            onClick={() => setView('guide')}
            className={`rounded-lg px-2.5 py-1.5 text-xs font-bold ${
              view === 'guide' ? 'bg-blue-600 text-white' : 'text-slate-500'
            }`}
          >
            Guide
          </button>
        </div>
      </div>

      {view === 'prime' ? (
        <PrimeConditionScreen
          profile={profile}
          onProfileUpdated={onProfileUpdated}
          initialSubTab={initialPrimeSubTab}
        />
      ) : view === 'guide' ? (
        <div className="space-y-3">
          <div className="rounded-2xl border border-blue-200 bg-blue-50/70 p-3.5 text-xs text-blue-900">
            <div className="flex items-center gap-1.5 font-bold text-blue-800">
              <BookOpen className="h-4 w-4" />
              Coach&apos;s Guide — Why Each Feature Exists ({COACH_ARTICLES.length} Guides)
            </div>
            <p className="mt-1 leading-relaxed text-slate-700">
              Short 30-second plain-English guides with peer-reviewed citations explaining tendon
              armor, mobility, balance &amp; power, Zone-2 vs. VO2 Max, breathwork, sleep, protein,
              hydration, pelvic floor training, and household weights.
            </p>
          </div>

          {COACH_ARTICLES.map((article) => {
            const isOpen = openArticleId === article.id;
            return (
              <div
                key={article.id}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
              >
                <button
                  type="button"
                  onClick={() => setOpenArticleId(isOpen ? null : article.id)}
                  className="flex w-full items-start justify-between gap-3 p-4 text-left"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold uppercase text-blue-700">
                        {article.tag}
                      </span>
                      <span className="text-[10px] font-semibold text-slate-400">
                        {article.readTime}
                      </span>
                    </div>
                    <h2 className="mt-1 text-sm font-bold text-slate-900">{article.title}</h2>
                    {!isOpen && (
                      <p className="mt-0.5 text-xs text-slate-500 line-clamp-1">
                        {article.headline}
                      </p>
                    )}
                  </div>
                  {isOpen ? (
                    <ChevronUp className="mt-1 h-4 w-4 shrink-0 text-slate-400" />
                  ) : (
                    <ChevronDown className="mt-1 h-4 w-4 shrink-0 text-slate-400" />
                  )}
                </button>

                {isOpen && (
                  <div className="space-y-2.5 border-t border-slate-100 bg-slate-50/60 px-4 py-3.5 text-xs text-slate-700">
                    <p className="font-semibold text-slate-900 leading-relaxed">
                      {article.headline}
                    </p>
                    <ul className="list-disc space-y-1.5 pl-4 leading-relaxed">
                      {article.bullets.map((bullet, idx) => (
                        <li key={idx}>{bullet}</li>
                      ))}
                    </ul>
                    <div className="border-t border-slate-200/80 pt-2 text-[10px] text-slate-500">
                      {article.researchNote}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <>
          {/* Goal & Training Style Recommendation Card */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase text-blue-600">
              <BookOpen className="h-4 w-4" />
              Tailored Program Settings
            </div>

            <div className="space-y-1.5">
              <div className="text-[10px] font-semibold uppercase text-slate-500">Body Focus</div>
              <div className="flex flex-wrap gap-1.5">
                {sexGoals.map((goalObj) => (
                  <button
                    key={goalObj.id}
                    type="button"
                    onClick={() => setSelectedFocus(goalObj.id)}
                    className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
                      selectedFocus === goalObj.id
                        ? 'border-blue-600 bg-blue-50 text-blue-700'
                        : 'border-slate-200 bg-slate-50 text-slate-600'
                    }`}
                  >
                    {goalObj.shortLabel}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center gap-1 text-[10px] font-semibold uppercase text-slate-500">
                <span>Training Style</span>
                <TermHint termId={selectedGoal} />
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {(['strength', 'hypertrophy', 'conditioning', 'skill'] as PrimaryGoal[]).map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => {
                      setSelectedGoal(g);
                      setDaysCount(GOAL_RESEARCH_PROFILES[g].recommendedDays);
                    }}
                    className={`rounded-lg border py-2 text-[11px] font-bold ${
                      selectedGoal === g
                        ? 'border-blue-600 bg-blue-50 text-blue-700'
                        : 'border-slate-200 bg-slate-50 text-slate-600'
                    }`}
                  >
                    {g === 'hypertrophy' ? 'Sculpt' : GOAL_RESEARCH_PROFILES[g].label}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-3 space-y-1.5">
              <p className="text-xs leading-relaxed text-slate-800">{focusMeta.summary}</p>
              <p className="text-[11px] leading-relaxed text-slate-600">{research.rationale}</p>
            </div>

            <div className="grid grid-cols-3 gap-2 rounded-xl border border-slate-100 bg-slate-50 p-2.5 text-center">
              <div>
                <div className="text-[10px] font-semibold uppercase text-slate-500">Rep Range</div>
                <div className="text-xs font-bold text-slate-900">
                  {effectiveReps[0]}–{effectiveReps[1]}
                </div>
              </div>
              <div>
                <div className="text-[10px] font-semibold uppercase text-slate-500">
                  Rest ({profile.biological_sex})
                </div>
                <div className="text-xs font-bold text-slate-900">{effectiveRest}s</div>
              </div>
              <div>
                <div className="flex items-center justify-center gap-0.5 text-[10px] font-semibold uppercase text-slate-500">
                  <span>Left in Tank</span>
                  <TermHint termId="reps_in_tank" />
                </div>
                <div className="text-xs font-bold text-slate-900">
                  {research.targetRirRange[0]}–{research.targetRirRange[1]} reps
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-medium text-slate-600">Days/wk:</span>
              <div className="flex gap-1">
                {[3, 4, 5, 6].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDaysCount(d)}
                    className={`h-7 w-7 rounded-lg text-xs font-bold ${
                      daysCount === d
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            {daysCount > 4 && (
              <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-2.5 text-[11px] leading-relaxed text-amber-900">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
                <span>
                  <strong>Recovery Notice ({daysCount} days/week):</strong> 3–4 days/week is the
                  research sweet spot for muscle &amp; tendon recovery. Training {daysCount} days/wk
                  works best when you sleep 7–9h, hit your daily protein target, and let Prime&apos;s
                  72-hour Recovery Guard alternate upper/lower muscle groups.
                </span>
              </div>
            )}

            <button
              type="button"
              onClick={() => void handleApplyRecommended()}
              className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-blue-600 py-3 text-xs font-bold text-white shadow-sm hover:bg-blue-700"
            >
              <Sparkles className="h-4 w-4" />
              Apply Recommended {focusMeta.shortLabel} Plan
            </button>
          </div>

          {savedMsg && (
            <div className="flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-800">
              <Check className="h-4 w-4 text-blue-600" />
              {savedMsg}
            </div>
          )}

          {view === 'weekly' ? (
            <div className="space-y-2.5">
              <div className="text-xs font-semibold uppercase text-slate-500">
                Weekly Schedule (Tap a day to customize)
              </div>
              {sevenDaySplit.map((day, idx) => {
                const isRest = day.focus.includes('rest');
                const isEditing = editingDayIdx === idx;
                return (
                  <div
                    key={day.day}
                    className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => setEditingDayIdx(isEditing ? null : idx)}
                        className="flex flex-1 items-center gap-3 text-left"
                      >
                        <span
                          className={`flex h-9 w-11 items-center justify-center rounded-xl text-xs font-bold ${
                            isRest
                              ? 'bg-slate-100 text-slate-500'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {DAY_NAMES[idx]}
                        </span>
                        <div>
                          <div className="text-sm font-bold text-slate-900">
                            {isRest
                              ? 'Rest & Recovery'
                              : day.focus.map((f) => f.toUpperCase()).join(' + ')}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {isRest ? 'Active cardio or full rest' : `${day.target_minutes} min session`}
                          </div>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => void handleToggleDayRest(idx)}
                        className={`flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold ${
                          isRest
                            ? 'border-slate-200 bg-slate-100 text-slate-600'
                            : 'border-blue-200 bg-blue-50 text-blue-700'
                        }`}
                      >
                        {isRest ? <Moon className="h-3 w-3" /> : null}
                        {isRest ? 'Rest' : 'Train'}
                      </button>
                    </div>

                    {isEditing && !isRest && (
                      <div className="flex flex-wrap gap-1.5 border-t border-slate-100 pt-2.5">
                        {PATTERNS.map((p) => {
                          const active = day.focus.includes(p);
                          return (
                            <button
                              key={p}
                              type="button"
                              onClick={() => void handleTogglePatternOnDay(idx, p)}
                              className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase ${
                                active
                                  ? 'border-blue-600 bg-blue-50 text-blue-700'
                                  : 'border-slate-200 bg-slate-50 text-slate-500'
                              }`}
                            >
                              {p}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-1.5 text-xs font-semibold uppercase text-slate-500">
                <CalendarDays className="h-4 w-4 text-blue-600" />
                <span>4-Week Cycle (3 Build + 1 Light Week)</span>
                <TermHint termId="mesocycle" />
              </div>
              {mesocycle.map((week) => (
                <div
                  key={week.weekNumber}
                  className={`rounded-2xl border p-3.5 shadow-sm space-y-2.5 ${
                    week.isDeload
                      ? 'border-sky-200 bg-sky-50/70'
                      : 'border-slate-200 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-900">{week.label}</span>
                    {week.isDeload && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-bold uppercase text-sky-800">
                        Light Recovery
                        <TermHint termId="light_recovery" />
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-600">{week.volumeNote}</p>
                  <div className="grid grid-cols-7 gap-1">
                    {week.days.map((d, i) => {
                      const isRest = d.focus.includes('rest');
                      return (
                        <div
                          key={d.day}
                          className={`rounded-lg p-1.5 text-center ${
                            isRest
                              ? 'bg-slate-100 text-slate-400'
                              : week.isDeload
                                ? 'bg-sky-100 text-sky-800'
                                : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          <div className="text-[10px] font-bold">{DAY_NAMES[i]}</div>
                          <div className="mt-0.5 text-[9px] uppercase">
                            {isRest ? 'Rest' : d.focus.map((f) => f[0]).join('+')}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
