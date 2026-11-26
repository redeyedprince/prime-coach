import { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, Compass, Eye, EyeOff, Info, KeyRound, Save } from 'lucide-react';
import { HOUSEHOLD_WEIGHT_PRESETS } from '../../data/exerciseCatalog';
import { loadDriveSyncMeta, saveDriveSyncMeta, saveUserProfile } from '../../db/database';
import { getGoalsForSex } from '../../engine/planBuilder';
import {
  APP_BUILD_NUMBER,
  APP_VERSION,
  type BiologicalSex,
  type BodyFocus,
  type CueStyle,
  type EquipmentItem,
  type JointTag,
  type PacingMode,
  type UserProfile,
} from '../../types/schemas';
import { OAuthGuideAccordion } from '../common/OAuthGuideAccordion';
import { TermHint } from '../common/TermHint';

interface SettingsScreenProps {
  profile: UserProfile;
  onProfileSaved: (next: UserProfile) => void;
  onRecalibrate: () => void;
  onReplayTour: () => void;
  onRedoOnboarding: () => void;
}

const JOINTS: JointTag[] = ['none', 'wrist', 'shoulder', 'elbow', 'knee', 'lower_back'];

const RESEARCH_REFERENCES = [
  {
    topic: 'Muscle Growth & Weekly Volume',
    detail:
      'Schoenfeld et al. (2016, 2017, 2019) — training each muscle 2×/week (10–16 weekly sets) with controlled double-progression and stopping ~1–2 reps short of exhaustion.',
  },
  {
    topic: 'Strength, Recovery & 4-Week Periodization',
    detail:
      'ACSM Progression Models (2009) & NSCA Resistance Guidelines — 3:1 step-loading 4-week cycles with scheduled light recovery weeks and 48–72h intense muscle cooldowns.',
  },
  {
    topic: 'Glute & Upper-Chest / Posture Biomechanics',
    detail:
      'Contreras & Schoenfeld Tri-Planar Glute Framework (bridges, stretches, side lifts) paired with Clavicular Pectoralis EMG & upper-back posture retraction.',
  },
  {
    topic: 'Female vs. Male Recovery Calibration',
    detail:
      'Hunter & Ansdell Fatigue Resistance Research — shorter 60s intra-session female sculpt rests vs. 90s+ male tension rests.',
  },
  {
    topic: 'Motor Skill & Form Quality',
    detail:
      'Schmidt & Lee Motor Control Principles — crisp, fresh practice stopping 3+ reps before failure for harder bodyweight skills.',
  },
  {
    topic: 'Concurrent Cardio Timing',
    detail:
      'Wilson et al. & Coffey & Hawley Concurrent Training Evidence — brief 3–5 min post-lift cardio finishers and rest-day Zone-2 mobility for heart health & blood flow without blunting strength.',
  },
  {
    topic: 'Pelvic Floor & Stamina Training',
    detail:
      'Dorey et al. (2004, BJU International) & Kari Bo Clinical Pelvic Floor Protocols — combining firm endurance holds, fast 1s squeezes, and full relaxation drops.',
  },
  {
    topic: 'Tendon Conditioning & Joint Resilience',
    detail:
      'Keith Baar (2017, Sports Medicine), Rio et al. (2015, BJSM), Kongsgaard et al. (2009), & Magnusson et al. (2010) — 30–45s static isometrics & slow 3–4s lowering with 48–72h collagen synthesis windows.',
  },
  {
    topic: 'Cardiorespiratory Fitness, Zone-2, HIIT & VO2 Max',
    detail:
      'Mandsager et al. (2018, JAMA Network Open), Helgerud et al. (2007, MSSE — Norwegian 4×4), Tabata et al. (1996, MSSE — 20s/10s), Gibala et al. (McMaster Univ. — 60s/60s), Buchheit & Laursen (2013, 2022 — HIIT Science), & San-Millán & Brooks (2018) — pairing easy Zone-2 aerobic work with 1–3 weekly HIIT/VO2 sessions for peak heart longevity.',
  },
  {
    topic: 'Joint Mobility, Neck/Spine & Foot Core Stability',
    detail:
      'Behm et al. (2016, Applied Physiology, Nutrition, and Metabolism), Page (2012, IJSPT), & McKeon et al. (2015, BJSM — Intrinsic Foot Core System) — active joint range-of-motion and short-foot arch strengthening.',
  },
  {
    topic: 'Balance, Longevity & Fast-Twitch Power',
    detail:
      'Araujo et al. (2022, BJSM — 10-Second Single-Leg Balance & Survival), Springer et al. (2007, JGPT), & Reid & Fielding (2012, Exerc Sport Sci Rev) — preserving stability and crisp fast-twitch muscle power with age.',
  },
  {
    topic: 'Breathwork & Autonomic Nervous System Recovery',
    detail:
      'Balban et al. (2023, Cell Reports Medicine — Stanford Physiological Sigh trial), Zaccaro et al. (2018, Front Hum Neurosci), Laborde et al. (2022, Neurosci Biobehav Rev), & Courtney & Cohen (2008 — Breath-Hold / CO2 Tolerance).',
  },
  {
    topic: 'Sleep, Protein, Hydration & Daily Steps (NEAT)',
    detail:
      'Watson et al. (2015, AASM/SRS Sleep Consensus), Dattilo et al. (2011, Medical Hypotheses), Morton et al. (2018, BJSM — 1.6+ g/kg protein meta-analysis), Jäger et al. (2017, JISSN), Paluch et al. (2022, The Lancet Public Health — daily steps), & NASEM/ACSM Fluid Guidelines.',
  },
  {
    topic: 'Functional Benchmarks & Core Endurance',
    detail:
      'Yang et al. (2019, JAMA Network Open — Push-up Capacity & Cardiovascular Health) & McGill (2010, Strength & Conditioning Journal — Core Endurance Norms).',
  },
  {
    topic: 'Body Composition, Waist-to-Height Ratio & Recomposition',
    detail:
      'Ashwell et al. (2012, Obesity Reviews — Waist-to-Height Ratio <0.50 superiority over BMI), WHO (2008 Waist Circumference & Waist-Hip Ratio Report), & Hodgdon & Beckett (1984, Naval Health Research Center — metric circumference body-fat estimation).',
  },
];

export function SettingsScreen({
  profile,
  onProfileSaved,
  onRecalibrate,
  onReplayTour,
  onRedoOnboarding,
}: SettingsScreenProps) {
  const [form, setForm] = useState<UserProfile>(profile);
  const [clientId, setClientId] = useState('');
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [showGeminiKey, setShowGeminiKey] = useState(false);
  const [savedBanner, setSavedBanner] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);

  useEffect(() => {
    void loadDriveSyncMeta().then((m) => {
      setClientId(m.googleClientId ?? '');
      setGeminiApiKey(m.geminiApiKey ?? '');
    });
  }, []);

  const toggleJoint = (tag: JointTag) => {
    if (tag === 'none') {
      setForm((f) => ({ ...f, joint_restrictions: ['none'] }));
      return;
    }
    const clean = form.joint_restrictions.filter((j) => j !== 'none');
    const next = clean.includes(tag) ? clean.filter((j) => j !== tag) : [...clean, tag];
    setForm((f) => ({
      ...f,
      joint_restrictions: next.length === 0 ? ['none'] : next,
    }));
  };

  const toggleEquipment = (item: EquipmentItem) => {
    const current = form.available_equipment ?? [];
    const next = current.includes(item)
      ? current.filter((i) => i !== item)
      : [...current, item];
    setForm((f) => ({
      ...f,
      available_equipment: next,
      dumbbell_kg: next.includes('dumbbell') ? (f.dumbbell_kg ?? 5) : null,
    }));
  };

  const handleSave = async () => {
    const updated: UserProfile = {
      ...form,
      user_name: form.user_name.trim() || 'Athlete',
      zero_equipment_only: true,
      updated_at: new Date().toISOString().slice(0, 10),
    };
    await saveUserProfile(updated);
    const meta = await loadDriveSyncMeta();
    await saveDriveSyncMeta({
      ...meta,
      googleClientId: clientId.trim() || undefined,
      geminiApiKey: geminiApiKey.trim() || undefined,
    });
    onProfileSaved(updated);
    setSavedBanner(true);
    window.setTimeout(() => setSavedBanner(false), 2500);
  };

  return (
    <div className="space-y-5 pb-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="mt-1 text-sm text-slate-600">
          Personal goal, household gear, tendon/cardio options &amp; reminders.
        </p>
      </div>

      <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold uppercase text-slate-500">Name</label>
            <input
              type="text"
              value={form.user_name}
              onChange={(e) => setForm({ ...form, user_name: e.target.value })}
              className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-600"
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase text-slate-500">Biological Sex</label>
            <select
              value={form.biological_sex}
              onChange={(e) => {
                const nextSex = e.target.value as BiologicalSex;
                const sexGoals = getGoalsForSex(nextSex);
                const validFocus = sexGoals.some((g) => g.id === form.body_focus)
                  ? form.body_focus
                  : sexGoals[0].id;
                setForm({ ...form, biological_sex: nextSex, body_focus: validFocus });
              }}
              className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-600"
            >
              <option value="female">Female</option>
              <option value="male">Male</option>
            </select>
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold uppercase text-slate-500">Your Goal</label>
          <select
            value={form.body_focus}
            onChange={(e) => {
              const bf = e.target.value as BodyFocus;
              const meta = getGoalsForSex(form.biological_sex).find((g) => g.id === bf);
              setForm({
                ...form,
                body_focus: bf,
                primary_goal: meta?.defaultPrimaryGoal ?? form.primary_goal,
                posture_focus: meta?.defaultPostureFocus ?? form.posture_focus,
              });
            }}
            className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-600"
          >
            {getGoalsForSex(form.biological_sex).map((goalObj) => (
              <option key={goalObj.id} value={goalObj.id}>
                {goalObj.label}
              </option>
            ))}
          </select>
          <p className="mt-1 text-[11px] text-slate-500">
            Your goal automatically configures rep ranges, rest times, and warm-up mobility.
          </p>
        </div>

        <div>
          <label className="text-xs font-semibold uppercase text-slate-500">
            Usual Workout Time (Optional Reminder)
          </label>
          <input
            type="time"
            value={form.preferred_workout_time}
            onChange={(e) => setForm({ ...form, preferred_workout_time: e.target.value })}
            className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-600"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold uppercase text-slate-500">Days / Week</label>
            <select
              value={form.days_per_week}
              onChange={(e) => setForm({ ...form, days_per_week: Number(e.target.value) })}
              className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-600"
            >
              {[3, 4, 5, 6, 7].map((d) => (
                <option key={d} value={d}>
                  {d} days
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold uppercase text-slate-500">Duration (min)</label>
            <input
              type="number"
              min={10}
              max={45}
              value={form.session_duration_minutes}
              onChange={(e) =>
                setForm({
                  ...form,
                  session_duration_minutes: Math.min(45, Math.max(10, Number(e.target.value) || 25)),
                })
              }
              className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-600"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 items-end gap-3">
          <div>
            <label className="flex min-h-[20px] items-center gap-1 text-xs font-semibold uppercase text-slate-500">
              <span>Pacing Mode</span>
              <TermHint termId="pacing_mode" />
            </label>
            <select
              value={form.pacing_mode}
              onChange={(e) => setForm({ ...form, pacing_mode: e.target.value as PacingMode })}
              className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 px-2.5 py-2.5 text-xs font-medium text-slate-900 outline-none focus:border-blue-600"
            >
              <option value="strict_time_cap">Strict Time Cap</option>
              <option value="fixed_volume">Fixed Volume</option>
            </select>
          </div>
          <div>
            <label className="flex min-h-[20px] items-center gap-1 text-xs font-semibold uppercase text-slate-500">
              <span>Cue Style</span>
            </label>
            <select
              value={form.cue_style}
              onChange={(e) => setForm({ ...form, cue_style: e.target.value as CueStyle })}
              className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 px-2.5 py-2.5 text-xs font-medium text-slate-900 outline-none focus:border-blue-600"
            >
              <option value="audio_and_vibrate">Audio + Vibrate</option>
              <option value="vibrate_only">Vibrate Only</option>
              <option value="silent_visual">Silent Visual</option>
            </select>
          </div>
        </div>

        <div className="space-y-2.5 border-t border-slate-100 pt-2.5">
          <label className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-sm font-medium text-slate-800">
              Quiet Hotel Mode
              <TermHint termId="quiet_hotel" />
            </span>
            <input
              type="checkbox"
              checked={form.quiet_hotel_mode}
              onChange={(e) => setForm({ ...form, quiet_hotel_mode: e.target.checked })}
              className="h-5 w-5 accent-blue-600"
            />
          </label>
          <label className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-sm font-medium text-slate-800">
              Include 3–5 Min Cardio Finisher
              <TermHint termId="cardio_finisher" />
            </span>
            <input
              type="checkbox"
              checked={Boolean(form.include_cardio_finisher)}
              onChange={(e) => setForm({ ...form, include_cardio_finisher: e.target.checked })}
              className="h-5 w-5 accent-blue-600"
            />
          </label>
          <label className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-sm font-medium text-slate-800">
              Include Tendon Armor (Joint Prep)
              <TermHint termId="tendon_armor" />
            </span>
            <input
              type="checkbox"
              checked={Boolean(form.include_tendon_prep)}
              onChange={(e) => setForm({ ...form, include_tendon_prep: e.target.checked })}
              className="h-5 w-5 accent-blue-600"
            />
          </label>
          <label className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-sm font-medium text-slate-800">
              Daily Discreet Kegel Reminders
              <TermHint termId="discreet_kegel" />
            </span>
            <input
              type="checkbox"
              checked={Boolean(form.kegel_reminder_enabled)}
              onChange={(e) => setForm({ ...form, kegel_reminder_enabled: e.target.checked })}
              className="h-5 w-5 accent-blue-600"
            />
          </label>
        </div>

        <div>
          <label className="flex items-center gap-1.5 text-xs font-semibold uppercase text-slate-500">
            <span>Joint Restrictions</span>
            <TermHint termId="joint_restrictions" />
          </label>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {JOINTS.map((j) => (
              <button
                key={j}
                type="button"
                onClick={() => toggleJoint(j)}
                className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                  form.joint_restrictions.includes(j)
                    ? 'border-blue-600 bg-blue-50 text-blue-700'
                    : 'border-slate-200 bg-slate-50 text-slate-600'
                }`}
              >
                {j.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold uppercase text-slate-500">
            Household Gear &amp; Equipment
          </label>
          <p className="mt-0.5 text-[11px] text-slate-500">
            No dumbbells? Pick Weight / Jug and use a water gallon (~5kg) or loaded backpack.
          </p>
          <div className="mt-2 grid grid-cols-3 gap-1.5">
            <button
              type="button"
              onClick={() => toggleEquipment('dumbbell')}
              className={`rounded-xl border px-2 py-2 text-[11px] font-semibold ${
                (form.available_equipment ?? []).includes('dumbbell')
                  ? 'border-blue-600 bg-blue-50 text-blue-700'
                  : 'border-slate-200 bg-slate-50 text-slate-600'
              }`}
            >
              Weight / Jug
            </button>
            <button
              type="button"
              onClick={() => toggleEquipment('chair_bench')}
              className={`rounded-xl border px-2 py-2 text-[11px] font-semibold ${
                (form.available_equipment ?? []).includes('chair_bench')
                  ? 'border-blue-600 bg-blue-50 text-blue-700'
                  : 'border-slate-200 bg-slate-50 text-slate-600'
              }`}
            >
              Chair / Sofa
            </button>
            <button
              type="button"
              onClick={() => toggleEquipment('pull_up_bar')}
              className={`rounded-xl border px-2 py-2 text-[11px] font-semibold ${
                (form.available_equipment ?? []).includes('pull_up_bar')
                  ? 'border-blue-600 bg-blue-50 text-blue-700'
                  : 'border-slate-200 bg-slate-50 text-slate-600'
              }`}
            >
              Pull-up Bar
            </button>
          </div>
          {(form.available_equipment ?? []).includes('dumbbell') && (
            <div className="mt-2 space-y-2">
              <div className="flex flex-wrap gap-1.5">
                {HOUSEHOLD_WEIGHT_PRESETS.map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => setForm({ ...form, dumbbell_kg: preset.kg })}
                    className={`rounded-lg border px-2 py-1 text-[10px] font-semibold ${
                      form.dumbbell_kg === preset.kg
                        ? 'border-blue-600 bg-blue-50 text-blue-700'
                        : 'border-slate-200 bg-slate-50 text-slate-600'
                    }`}
                  >
                    {preset.label} (~{preset.kg}kg)
                  </button>
                ))}
              </div>
              <div>
                <label className="text-[11px] font-semibold uppercase text-slate-500">
                  Estimated Weight (kg)
                </label>
                <input
                  type="number"
                  inputMode="decimal"
                  min={1}
                  max={200}
                  value={form.dumbbell_kg ?? ''}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      dumbbell_kg: e.target.value ? Number(e.target.value) : null,
                    })
                  }
                  placeholder="e.g. 5 for water gallon"
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-900"
                />
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold uppercase text-slate-500">Bodyweight (kg)</label>
            <input
              type="number"
              inputMode="decimal"
              value={form.bodyweight_kg ?? ''}
              onChange={(e) =>
                setForm({
                  ...form,
                  bodyweight_kg: e.target.value ? Number(e.target.value) : null,
                })
              }
              className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-900"
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase text-slate-500">Height (cm)</label>
            <input
              type="number"
              inputMode="numeric"
              value={form.height_cm ?? ''}
              onChange={(e) =>
                setForm({
                  ...form,
                  height_cm: e.target.value ? Number(e.target.value) : null,
                })
              }
              className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-900"
            />
          </div>
        </div>

        <div className="space-y-3 border-t border-slate-100 pt-3">
          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold uppercase text-slate-500">
              <KeyRound className="h-3.5 w-3.5 text-blue-600" />
              <span>Free Gemini API Key (Optional · Way 2 Auto Coach)</span>
            </label>
            <div className="relative mt-1">
              <input
                type={showGeminiKey ? 'text' : 'password'}
                placeholder="AIza... (from aistudio.google.com/apikey)"
                value={geminiApiKey}
                onChange={(e) => setGeminiApiKey(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-slate-50 py-2 pl-3 pr-9 font-mono text-xs text-slate-900"
              />
              <button
                type="button"
                aria-label={showGeminiKey ? 'Hide Gemini API key' : 'Show Gemini API key'}
                onClick={() => setShowGeminiKey((v) => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showGeminiKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </button>
            </div>
            <p className="mt-1 text-[11px] text-slate-500">
              Enables 1-tap automatic Gemini coaching &amp; in-app reply window in Sync. Stored
              strictly on this device — never uploaded to Google Drive. Free key at{' '}
              <span className="font-mono text-blue-700">https://aistudio.google.com/apikey</span>.
            </p>
          </div>

          <div className="space-y-2">
            <div>
              <label className="text-xs font-semibold uppercase text-slate-500">
                Google OAuth Client ID (Optional)
              </label>
              <input
                type="text"
                placeholder="xxxx.apps.googleusercontent.com"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 font-mono text-xs text-slate-900"
              />
            </div>
            <OAuthGuideAccordion />
          </div>
        </div>

        <button
          type="button"
          onClick={() => void handleSave()}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3.5 text-sm font-bold text-white shadow-sm hover:bg-blue-700"
        >
          <Save className="h-4 w-4" />
          Save Settings
        </button>

        {savedBanner && (
          <p className="text-center text-xs font-semibold text-blue-600">
            Settings saved to device.
          </p>
        )}
      </div>

      <div className="space-y-2.5">
        <button
          type="button"
          onClick={onReplayTour}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 py-3 text-xs font-bold text-blue-700 shadow-xs hover:bg-blue-100"
        >
          <Compass className="h-4 w-4" />
          Replay Interactive App Tutorial
        </button>
        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={onRecalibrate}
            className="rounded-xl border border-slate-200 bg-white py-3 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
          >
            Run Level Calibration
          </button>
          <button
            type="button"
            onClick={onRedoOnboarding}
            className="rounded-xl border border-rose-200 bg-white py-3 text-xs font-semibold text-rose-600 shadow-sm hover:bg-rose-50"
          >
            Redo Onboarding Setup
          </button>
        </div>
      </div>

      {/* Collapsed-by-default About, Research & Attributions Dropdown */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <button
          type="button"
          onClick={() => setAboutOpen((v) => !v)}
          className="flex w-full items-center justify-between px-4 py-3.5 text-left"
        >
          <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
            <Info className="h-4 w-4 text-blue-600" />
            About, Science &amp; Attributions
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-slate-400">
              v{APP_VERSION} (b{APP_BUILD_NUMBER})
            </span>
            {aboutOpen ? (
              <ChevronUp className="h-4 w-4 text-slate-400" />
            ) : (
              <ChevronDown className="h-4 w-4 text-slate-400" />
            )}
          </div>
        </button>

        {aboutOpen && (
          <div className="space-y-3 border-t border-slate-100 bg-slate-50/70 px-4 py-3.5 text-xs text-slate-600">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wide text-blue-700">
                Research Used to Curate Exercises &amp; Plans
              </div>
              <ul className="mt-2 space-y-2 leading-relaxed">
                {RESEARCH_REFERENCES.map((ref) => (
                  <li key={ref.topic}>
                    <strong className="text-slate-900">{ref.topic}:</strong> {ref.detail}
                  </li>
                ))}
              </ul>
            </div>

            <div className="border-t border-slate-200 pt-2.5 leading-relaxed">
              <div className="text-[11px] font-bold uppercase tracking-wide text-slate-700">
                Illustrations &amp; Licenses
              </div>
              <p className="mt-1">
                Exercise diagrams combine local custom anatomical SVGs with{' '}
                <span className="font-semibold text-slate-800">@bryllim/workout-guide</span>{' '}
                (v1.0.0) by <strong className="text-slate-900">Bryl Lim</strong>, derived from{' '}
                <strong className="text-slate-900">Everkinetic</strong>, licensed under{' '}
                <strong className="text-blue-700">CC BY-SA 4.0</strong>. Package code is licensed
                under <strong className="text-slate-900">MIT</strong>.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
