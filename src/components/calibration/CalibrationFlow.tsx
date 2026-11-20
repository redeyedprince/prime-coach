import { useState } from 'react';
import { CheckCircle2, Minus, Plus } from 'lucide-react';
import { getTierRepresentative, resolveSafeExercise } from '../../data/exerciseCatalog';
import { buildCalibratedProgramConfig, type CalibrationResult } from '../../engine/calibration';
import type { MovementPattern, ProgramConfig, UserProfile } from '../../types/schemas';
import { ExerciseAnimator } from '../player/ExerciseAnimator';

interface CalibrationFlowProps {
  profile: UserProfile;
  onComplete: (config: ProgramConfig) => void;
}

const PATTERNS: MovementPattern[] = ['push', 'pull', 'legs', 'core'];

const PATTERN_LABELS: Record<MovementPattern, string> = {
  push: 'Push',
  pull: 'Pull / Posterior Chain',
  legs: 'Legs',
  core: 'Core',
};

export function CalibrationFlow({ profile, onComplete }: CalibrationFlowProps) {
  const [idx, setIdx] = useState(0);
  const [results, setResults] = useState<CalibrationResult[]>([]);

  const pattern = PATTERNS[idx];
  const patternTier =
    pattern === 'push' || pattern === 'pull'
      ? profile.upper_starting_tier ?? profile.starting_tier
      : profile.lower_starting_tier ?? profile.starting_tier;
  const baseRep = getTierRepresentative(pattern, patternTier);
  const exercise = resolveSafeExercise(
    baseRep.slug,
    profile.quiet_hotel_mode,
    profile.joint_restrictions,
    profile.available_equipment ?? [],
  );

  const defaultVal = exercise.unit === 'seconds' ? 25 : 8;
  const [value, setValue] = useState(defaultVal);

  const handleLogTest = () => {
    const nextResults = [
      ...results,
      { pattern, slug: exercise.slug, completed_value: value },
    ];
    if (idx < PATTERNS.length - 1) {
      const nextPattern = PATTERNS[idx + 1];
      const nextTier =
        nextPattern === 'push' || nextPattern === 'pull'
          ? profile.upper_starting_tier ?? profile.starting_tier
          : profile.lower_starting_tier ?? profile.starting_tier;
      const nextEx = resolveSafeExercise(
        getTierRepresentative(nextPattern, nextTier).slug,
        profile.quiet_hotel_mode,
        profile.joint_restrictions,
        profile.available_equipment ?? [],
      );
      setResults(nextResults);
      setIdx(idx + 1);
      setValue(nextEx.unit === 'seconds' ? 25 : 8);
    } else {
      const config = buildCalibratedProgramConfig(profile, nextResults);
      onComplete(config);
    }
  };

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-between bg-slate-50 px-4 py-6 text-slate-900">
      <div className="space-y-5">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-blue-600">
            Day-1 Calibration · {idx + 1} of 4
          </span>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">{PATTERN_LABELS[pattern]}</h1>
          <p className="mt-1 text-sm text-amber-700">
            Perform 1 comfortable test set and stop when you have <strong>~2 clean reps left in the tank</strong> (firm effort, not exhaustion).
          </p>
        </div>

        <div className="flex flex-col items-center rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <ExerciseAnimator slug={exercise.slug} alt={exercise.name} className="h-44 w-44" />
          <h2 className="mt-3 text-lg font-bold text-slate-900">{exercise.name}</h2>
          <p className="mt-1 text-center text-xs text-slate-600">{exercise.cues}</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-center text-xs font-semibold uppercase text-slate-500">
            Clean {exercise.unit} completed (stopping with ~2 left)
          </div>
          <div className="mt-3 flex items-center justify-center gap-6">
            <button
              type="button"
              onClick={() => setValue((v) => Math.max(1, v - (exercise.unit === 'seconds' ? 5 : 1)))}
              className="flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-800 hover:bg-slate-100 active:scale-95"
            >
              <Minus className="h-6 w-6" />
            </button>
            <span className="w-20 text-center text-4xl font-extrabold tabular-nums text-blue-600">
              {value}
            </span>
            <button
              type="button"
              onClick={() => setValue((v) => v + (exercise.unit === 'seconds' ? 5 : 1))}
              className="flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-800 hover:bg-slate-100 active:scale-95"
            >
              <Plus className="h-6 w-6" />
            </button>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={handleLogTest}
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-4 text-base font-bold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700"
      >
        <CheckCircle2 className="h-5 w-5" />
        {idx < PATTERNS.length - 1 ? 'Log & Next Pattern' : 'Finish Calibration'}
      </button>
    </div>
  );
}
