import { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  Plus,
  Ruler,
  Scale,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { appendBodyMetric, loadAllBodyMetrics, saveUserProfile } from '../../db/database';
import {
  computeBodyMetricInsights,
  type TapeZoneId,
} from '../../engine/bodyMetrics';
import type { BodyMetricEntry, UserProfile } from '../../types/schemas';
import { BodyMeasurementGuideSvg } from '../common/BodyMeasurementGuideSvg';
import { TermHint } from '../common/TermHint';

interface BodyMetricsPanelProps {
  profile: UserProfile;
  onProfileUpdated: (next: UserProfile) => void;
}

function parseCm(val: string): number | null {
  const n = Number(val);
  if (!val.trim() || !Number.isFinite(n) || n <= 0 || n > 300) return null;
  return Math.round(n * 10) / 10;
}

function formatDelta(val: number | null, unit: string): string | null {
  if (val === null) return null;
  const sign = val > 0 ? '+' : '';
  return `${sign}${val} ${unit}`;
}

export function BodyMetricsPanel({ profile, onProfileUpdated }: BodyMetricsPanelProps) {
  const [entries, setEntries] = useState<BodyMetricEntry[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [activeZone, setActiveZone] = useState<TapeZoneId>('waist');
  const [savedNotice, setSavedNotice] = useState<string | null>(null);

  const [weightKg, setWeightKg] = useState(
    profile.bodyweight_kg ? String(profile.bodyweight_kg) : '',
  );
  const [neckCm, setNeckCm] = useState('');
  const [shouldersCm, setShouldersCm] = useState('');
  const [chestCm, setChestCm] = useState('');
  const [waistCm, setWaistCm] = useState('');
  const [hipsCm, setHipsCm] = useState('');
  const [armLeftCm, setArmLeftCm] = useState('');
  const [armRightCm, setArmRightCm] = useState('');
  const [thighLeftCm, setThighLeftCm] = useState('');
  const [thighRightCm, setThighRightCm] = useState('');
  const [notes, setNotes] = useState('');

  const refresh = async () => {
    const rows = await loadAllBodyMetrics();
    setEntries(rows);
    if (rows.length > 0) {
      const last = rows[rows.length - 1];
      setWeightKg(String(last.weight_kg));
      setNeckCm(last.neck_cm ? String(last.neck_cm) : '');
      setShouldersCm(last.shoulders_cm ? String(last.shoulders_cm) : '');
      setChestCm(last.chest_cm ? String(last.chest_cm) : '');
      setWaistCm(last.waist_cm ? String(last.waist_cm) : '');
      setHipsCm(last.hips_cm ? String(last.hips_cm) : '');
      setArmLeftCm(last.arm_left_cm ? String(last.arm_left_cm) : '');
      setArmRightCm(last.arm_right_cm ? String(last.arm_right_cm) : '');
      setThighLeftCm(last.thigh_left_cm ? String(last.thigh_left_cm) : '');
      setThighRightCm(last.thigh_right_cm ? String(last.thigh_right_cm) : '');
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  const insights = useMemo(
    () => computeBodyMetricInsights(entries, profile),
    [entries, profile],
  );

  const handleSaveEntry = async () => {
    const w = Number(weightKg);
    if (!Number.isFinite(w) || w < 30 || w > 300) return;

    const today = new Date().toISOString().slice(0, 10);
    const roundedWeight = Math.round(w * 10) / 10;

    await appendBodyMetric({
      date: today,
      created_at: new Date().toISOString(),
      weight_kg: roundedWeight,
      neck_cm: parseCm(neckCm),
      shoulders_cm: parseCm(shouldersCm),
      chest_cm: parseCm(chestCm),
      waist_cm: parseCm(waistCm),
      hips_cm: parseCm(hipsCm),
      arm_left_cm: parseCm(armLeftCm),
      arm_right_cm: parseCm(armRightCm),
      thigh_left_cm: parseCm(thighLeftCm),
      thigh_right_cm: parseCm(thighRightCm),
      notes: notes.trim() || undefined,
    });

    const nextProfile: UserProfile = {
      ...profile,
      bodyweight_kg: roundedWeight,
      last_weight_updated_at: today,
      weight_reminder_snoozed_until: undefined,
      updated_at: today,
    };
    await saveUserProfile(nextProfile);
    onProfileUpdated(nextProfile);
    await refresh();
    setShowForm(false);
    setNotes('');
    setSavedNotice(`Saved ${roundedWeight} kg + measurements for ${today}!`);
    window.setTimeout(() => setSavedNotice(null), 3500);
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-blue-200 bg-blue-50/70 p-3.5 text-xs text-slate-700 space-y-1">
        <div className="flex items-center gap-1.5 font-bold text-blue-900">
          <Ruler className="h-4 w-4 text-blue-600" />
          <span>Metric Body &amp; Recomposition Tracker (kg / cm)</span>
          <TermHint termId="body_recomp" />
        </div>
        <p className="leading-relaxed">
          Track monthly weight and optional tape measurements — Prime feeds these straight into your{' '}
          <strong>Free Gemini Fitness Assessor</strong> to measure real muscle gain &amp; fat loss.
        </p>
      </div>

      {savedNotice && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs font-bold text-emerald-800">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          {savedNotice}
        </div>
      )}

      {/* Summary Snapshot & Clinical Insights */}
      {insights.latest && !showForm && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3.5">
          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="text-[11px] font-bold uppercase text-slate-500">
                Latest Check-In ({insights.latest.date})
              </div>
              <div className="mt-0.5 flex items-baseline gap-2">
                <span className="tabular-nums text-3xl font-black text-slate-900">
                  {insights.latest.weight_kg}
                </span>
                <span className="text-xs font-bold text-slate-500">kg</span>
                {insights.weightDeltaKg !== null && (
                  <span className="inline-flex items-center gap-0.5 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                    {insights.weightDeltaKg <= 0 ? (
                      <TrendingDown className="h-3 w-3" />
                    ) : (
                      <TrendingUp className="h-3 w-3" />
                    )}
                    {formatDelta(insights.weightDeltaKg, 'kg')} vs Day 1
                  </span>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="flex items-center gap-1 rounded-xl bg-blue-600 px-3 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700"
            >
              <Plus className="h-3.5 w-3.5" />
              Log Check-In
            </button>
          </div>

          {/* Clinical Ratios Grid */}
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5">
              <div className="flex items-center gap-1 text-[10px] font-bold uppercase text-slate-500">
                <span>Waist-to-Height</span>
                <TermHint termId="whtr_ratio" className="h-3 w-3" />
              </div>
              <div className="mt-0.5 tabular-nums text-sm font-extrabold text-slate-900">
                {insights.whtr !== null ? insights.whtr : 'Add waist (cm)'}
              </div>
              {insights.whtrStatus && (
                <div className="text-[10px] font-semibold text-blue-700">{insights.whtrStatus}</div>
              )}
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5">
              <div className="text-[10px] font-bold uppercase text-slate-500">
                U.S. Navy Est. Body Fat
              </div>
              <div className="mt-0.5 tabular-nums text-sm font-extrabold text-slate-900">
                {insights.navyBodyFatPct !== null
                  ? `${insights.navyBodyFatPct}%`
                  : profile.biological_sex === 'female'
                    ? 'Add neck, waist, hips'
                    : 'Add neck & waist'}
              </div>
              <div className="text-[10px] text-slate-500">
                {insights.whr !== null ? `Waist-Hip Ratio: ${insights.whr}` : 'Metric formula · never guessed'}
              </div>
            </div>
          </div>

          {/* Recorded Tape Circumferences + Deltas */}
          <div className="grid grid-cols-3 gap-1.5 text-center">
            {[
              { label: 'Waist', val: insights.latest.waist_cm, delta: insights.waistDeltaCm },
              { label: 'Shoulders', val: insights.latest.shoulders_cm, delta: insights.shouldersDeltaCm },
              { label: 'Chest', val: insights.latest.chest_cm, delta: insights.chestDeltaCm },
              { label: 'Hips', val: insights.latest.hips_cm, delta: insights.hipsDeltaCm },
              { label: 'Neck', val: insights.latest.neck_cm, delta: null },
              {
                label: 'Arms (L/R)',
                val:
                  insights.latest.arm_left_cm || insights.latest.arm_right_cm
                    ? `${insights.latest.arm_left_cm ?? '–'}/${insights.latest.arm_right_cm ?? '–'}`
                    : null,
                delta: null,
              },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-xl border border-slate-100 bg-slate-50/80 px-2 py-2"
              >
                <div className="text-[10px] font-bold uppercase text-slate-500">{item.label}</div>
                <div className="mt-0.5 tabular-nums text-xs font-extrabold text-slate-900">
                  {item.val !== null && item.val !== undefined
                    ? typeof item.val === 'number'
                      ? `${item.val} cm`
                      : `${item.val}`
                    : '—'}
                </div>
                {item.delta !== null && (
                  <div className="text-[9px] font-bold text-blue-700">
                    {formatDelta(item.delta, 'cm')}
                  </div>
                )}
              </div>
            ))}
          </div>

          {insights.symmetryNotes.length > 0 && (
            <div className="rounded-xl border border-blue-100 bg-blue-50/70 px-3 py-2 text-[11px] text-slate-700 space-y-0.5">
              <div className="flex items-center gap-1 font-bold text-blue-900">
                <Sparkles className="h-3.5 w-3.5 text-blue-600" />
                Left vs. Right Symmetry
              </div>
              {insights.symmetryNotes.map((note) => (
                <div key={note}>{note}</div>
              ))}
            </div>
          )}

          <div className="text-[10px] text-slate-500">
            Science: Ashwell et al. (2012, Obesity Reviews), WHO (2008), &amp; Hodgdon &amp; Beckett (1984).
          </div>
        </div>
      )}

      {/* Interactive Measurement Entry Form */}
      {(!insights.latest || showForm) && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-sm font-extrabold text-slate-900">
              <Scale className="h-4 w-4 text-blue-600" />
              Log Monthly Weight &amp; Tape Measurements (Metric)
            </div>
            {insights.latest && (
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="text-xs font-semibold text-slate-500"
              >
                Cancel
              </button>
            )}
          </div>

          <BodyMeasurementGuideSvg
            sex={profile.biological_sex}
            activeZone={activeZone}
            onSelectZone={setActiveZone}
          />

          <div>
            <label className="text-xs font-bold uppercase text-slate-600">
              Current Weight (kg) <span className="text-rose-600">*</span>
            </label>
            <input
              type="number"
              inputMode="decimal"
              step="0.1"
              min={30}
              max={300}
              placeholder="e.g. 68.5"
              value={weightKg}
              onChange={(e) => setWeightKg(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm font-bold text-slate-900 outline-none focus:border-blue-600"
            />
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            {[
              { label: 'Neck (cm)', val: neckCm, set: setNeckCm, zone: 'neck' as TapeZoneId, ph: '36' },
              { label: 'Shoulders (cm)', val: shouldersCm, set: setShouldersCm, zone: 'shoulders' as TapeZoneId, ph: '112' },
              { label: profile.biological_sex === 'female' ? 'Bust / Chest (cm)' : 'Chest (cm)', val: chestCm, set: setChestCm, zone: 'chest' as TapeZoneId, ph: profile.biological_sex === 'female' ? '88' : '95' },
              { label: profile.biological_sex === 'female' ? 'Natural Waist (cm)' : 'Waist (cm)', val: waistCm, set: setWaistCm, zone: 'waist' as TapeZoneId, ph: profile.biological_sex === 'female' ? '68' : '78' },
              { label: 'Hips / Glutes (cm)', val: hipsCm, set: setHipsCm, zone: 'hips' as TapeZoneId, ph: '96' },
              { label: 'Left Arm (cm)', val: armLeftCm, set: setArmLeftCm, zone: 'arm' as TapeZoneId, ph: '32' },
              { label: 'Right Arm (cm)', val: armRightCm, set: setArmRightCm, zone: 'arm' as TapeZoneId, ph: '32.5' },
              { label: 'Left Thigh (cm)', val: thighLeftCm, set: setThighLeftCm, zone: 'thigh' as TapeZoneId, ph: '55' },
              { label: 'Right Thigh (cm)', val: thighRightCm, set: setThighRightCm, zone: 'thigh' as TapeZoneId, ph: '55' },
            ].map((f) => (
              <div key={f.label}>
                <label className="text-[11px] font-semibold text-slate-600">{f.label}</label>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.1"
                  placeholder={`Optional (e.g. ${f.ph})`}
                  value={f.val}
                  onFocus={() => setActiveZone(f.zone)}
                  onChange={(e) => f.set(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-900 outline-none focus:border-blue-600"
                />
              </div>
            ))}
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-600">
              Optional Note for Gemini Assessor
            </label>
            <input
              type="text"
              placeholder="e.g. Feeling leaner around waist, clothes fit better"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs text-slate-900 outline-none focus:border-blue-600"
            />
          </div>

          <button
            type="button"
            onClick={() => void handleSaveEntry()}
            className="w-full rounded-xl bg-blue-600 py-3.5 text-sm font-bold text-white shadow-sm hover:bg-blue-700"
          >
            Save Metric Check-In
          </button>
        </div>
      )}

      {/* Recent Metric History */}
      {entries.length > 0 && !showForm && (
        <div className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-xs space-y-2">
          <div className="text-[11px] font-bold uppercase text-slate-500">
            Measurement History ({entries.length})
          </div>
          <div className="space-y-1.5">
            {[...entries]
              .reverse()
              .slice(0, 6)
              .map((row) => (
                <div
                  key={row.id ?? row.created_at}
                  className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-xs"
                >
                  <div>
                    <span className="font-bold text-slate-900">{row.date}</span>
                    {row.waist_cm && (
                      <span className="ml-2 text-slate-500">Waist {row.waist_cm} cm</span>
                    )}
                    {row.hips_cm && (
                      <span className="ml-2 text-slate-500">Hips {row.hips_cm} cm</span>
                    )}
                  </div>
                  <span className="tabular-nums font-extrabold text-blue-700">
                    {row.weight_kg} kg
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
