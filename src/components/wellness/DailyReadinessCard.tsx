import { useMemo, useState } from 'react';
import {
  BatteryLow,
  Check,
  ChevronDown,
  ChevronUp,
  Droplets,
  Footprints,
  Moon,
  Scale,
  Utensils,
} from 'lucide-react';
import { computeDailyFuelTargets } from '../../engine/primeCondition';
import type { DailyCheckIn, SleepQuality, UserProfile } from '../../types/schemas';
import { TermHint } from '../common/TermHint';

interface DailyReadinessCardProps {
  profile: UserProfile;
  checkIn: DailyCheckIn;
  onChange: (next: DailyCheckIn) => Promise<void>;
  onSaveWeight: (kg: number) => Promise<void>;
}

const SLEEP_OPTIONS: Array<{ id: SleepQuality; label: string; sub: string }> = [
  { id: 'great', label: 'Great', sub: '7–9h · Fresh' },
  { id: 'ok', label: 'Normal', sub: 'Steady energy' },
  { id: 'poor', label: 'Tired', sub: 'Ease volume -25%' },
];

export function DailyReadinessCard({
  profile,
  checkIn,
  onChange,
  onSaveWeight,
}: DailyReadinessCardProps) {
  const [open, setOpen] = useState(false);
  const [weightDraft, setWeightDraft] = useState(
    profile.bodyweight_kg ? String(profile.bodyweight_kg) : '',
  );
  const targets = useMemo(() => computeDailyFuelTargets(profile), [profile]);

  const fuelHits =
    (checkIn.protein_hit ? 1 : 0) +
    (checkIn.hydration_hit ? 1 : 0) +
    (checkIn.steps_hit ? 1 : 0);

  const updateField = (patch: Partial<DailyCheckIn>) => {
    void onChange({
      ...checkIn,
      ...patch,
      updated_at: new Date().toISOString(),
    });
  };

  const handleSaveWeightClick = async () => {
    const val = Number(weightDraft);
    if (!Number.isFinite(val) || val < 30 || val > 300) return;
    await onSaveWeight(val);
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 px-3.5 py-3 text-left hover:bg-slate-50/70"
      >
        <div className="flex items-center gap-2 min-w-0">
          <div
            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-xl ${
              checkIn.sleep_quality === 'poor'
                ? 'bg-amber-100 text-amber-700'
                : 'bg-blue-50 text-blue-600'
            }`}
          >
            {checkIn.sleep_quality === 'poor' ? (
              <BatteryLow className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </div>
          <div className="min-w-0">
            <div className="text-xs font-bold text-slate-900">
              Today&apos;s Energy, Sleep &amp; Recovery Fuel
            </div>
            <div className="truncate text-[11px] text-slate-500">
              Energy:{' '}
              <strong
                className={
                  checkIn.sleep_quality === 'poor' ? 'text-amber-700' : 'text-slate-700'
                }
              >
                {checkIn.sleep_quality === 'poor'
                  ? 'Tired (-25% vol)'
                  : checkIn.sleep_quality === 'great'
                    ? 'Great'
                    : 'Normal'}
              </strong>{' '}
              ·{' '}
              {targets.hasWeight
                ? `${fuelHits}/3 habits (${targets.proteinMinGrams}g protein · ${targets.waterBaseLiters}L water)`
                : 'Add weight to calculate protein & water'}
            </div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1 text-[11px] font-bold text-blue-600">
          <span>{open ? 'Hide' : 'Check-in'}</span>
          {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
      </button>

      {open && (
        <div className="border-t border-slate-100 bg-slate-50/60 px-3.5 py-3.5 space-y-3">
          {/* Sleep & Readiness */}
          <div className="space-y-1.5">
            <div className="text-[11px] font-bold uppercase text-slate-500">
              How Did You Sleep? ({targets.sleepRange} ideal)
            </div>
            <p className="text-[11px] leading-relaxed text-slate-600">
              Tap <strong>Tired</strong> if you slept poorly — Prime automatically trims
              today&apos;s main strength sets by ~25% and adds +15s rest (synced directly with your
              workout player).
            </p>
            <div className="grid grid-cols-3 gap-1.5">
              {SLEEP_OPTIONS.map((opt) => {
                const active = checkIn.sleep_quality === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => updateField({ sleep_quality: opt.id })}
                    className={`rounded-xl border px-2 py-2 text-center ${
                      active
                        ? opt.id === 'poor'
                          ? 'border-amber-500 bg-amber-50 text-amber-900'
                          : 'border-blue-600 bg-blue-600 text-white'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="text-xs font-bold">{opt.label}</div>
                    <div
                      className={`text-[10px] ${
                        active && opt.id !== 'poor' ? 'text-white/90' : 'text-slate-500'
                      }`}
                    >
                      {opt.sub}
                    </div>
                  </button>
                );
              })}
            </div>
            {checkIn.sleep_quality === 'poor' && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] leading-relaxed text-amber-900">
                <strong>Tired-Day Protection Active:</strong> Today&apos;s main strength sets are
                automatically eased by ~25% with +15s extra rest so you keep your habit without
                burnout or injury.
              </div>
            )}
          </div>

          {/* Recovery Fuel Targets (Never guessed!) */}
          <div className="space-y-1.5">
            <div className="text-[11px] font-bold uppercase text-slate-500">
              Outside-the-Workout Recovery Fuel{' '}
              {targets.hasWeight && (
                <span className="font-normal normal-case text-slate-400">
                  (calculated for {targets.weightKgUsed} kg)
                </span>
              )}
            </div>

            {!targets.hasWeight ? (
              <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-3 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-blue-900">
                  <Scale className="h-4 w-4 text-blue-600" />
                  Add Your Weight to Calculate Protein &amp; Water Targets
                </div>
                <p className="text-[11px] leading-relaxed text-slate-700">
                  Prime never guesses nutrition numbers. Enter your current weight (kg) once to
                  unlock exact research-based daily protein &amp; hydration targets.
                </p>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    inputMode="decimal"
                    min={30}
                    max={300}
                    placeholder="e.g. 68"
                    value={weightDraft}
                    onChange={(e) => setWeightDraft(e.target.value)}
                    className="w-28 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-900"
                  />
                  <span className="text-xs font-semibold text-slate-600">kg</span>
                  <button
                    type="button"
                    onClick={() => void handleSaveWeightClick()}
                    className="ml-auto rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700"
                  >
                    Save Weight
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-1.5">
                {/* Protein */}
                <div className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
                  <div className="flex items-start gap-2 min-w-0">
                    <Utensils className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1 text-xs font-bold text-slate-900">
                        <span>
                          Protein: {targets.proteinMinGrams}–{targets.proteinMaxGrams} g/day
                        </span>
                        <TermHint termId="protein_target" />
                      </div>
                      <div className="text-[10px] text-slate-500">{targets.proteinMealTip}</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => updateField({ protein_hit: !checkIn.protein_hit })}
                    aria-label="Toggle daily protein hit"
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border transition ${
                      checkIn.protein_hit
                        ? 'border-emerald-600 bg-emerald-600 text-white'
                        : 'border-slate-300 bg-slate-50 text-slate-400'
                    }`}
                  >
                    <Check className="h-4 w-4" />
                  </button>
                </div>

                {/* Water */}
                <div className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
                  <div className="flex items-start gap-2 min-w-0">
                    <Droplets className="mt-0.5 h-4 w-4 shrink-0 text-sky-500" />
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-900">
                        Water: {targets.waterBaseLiters} L/day ({targets.waterWorkoutLiters} L on
                        workout days)
                      </div>
                      <div className="text-[10px] text-slate-500">
                        Keeps joints lubricated, muscles full, and focus sharp.
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => updateField({ hydration_hit: !checkIn.hydration_hit })}
                    aria-label="Toggle daily hydration hit"
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border transition ${
                      checkIn.hydration_hit
                        ? 'border-emerald-600 bg-emerald-600 text-white'
                        : 'border-slate-300 bg-slate-50 text-slate-400'
                    }`}
                  >
                    <Check className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Steps (always valid regardless of weight) */}
            <div className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
              <div className="flex items-start gap-2 min-w-0">
                <Footprints className="mt-0.5 h-4 w-4 shrink-0 text-teal-600" />
                <div className="min-w-0">
                  <div className="flex items-center gap-1 text-xs font-bold text-slate-900">
                    <span>Daily Steps: {targets.stepsRange} steps</span>
                    <TermHint termId="neat_steps" />
                  </div>
                  <div className="text-[10px] text-slate-500">
                    Steady light walking improves heart health, mood &amp; fat loss.
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => updateField({ steps_hit: !checkIn.steps_hit })}
                aria-label="Toggle daily steps hit"
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border transition ${
                  checkIn.steps_hit
                    ? 'border-emerald-600 bg-emerald-600 text-white'
                    : 'border-slate-300 bg-slate-50 text-slate-400'
                }`}
              >
                <Check className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="text-[10px] leading-relaxed text-slate-500">
            Science: {targets.citation}
          </div>
        </div>
      )}
    </div>
  );
}
