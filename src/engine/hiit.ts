export type HiitPresetId = 'tabata' | 'gibala' | 'norwegian_4x4' | 'custom';

export interface HiitPresetSpec {
  id: HiitPresetId;
  label: string;
  shortTag: string;
  workSeconds: number;
  restSeconds: number;
  rounds: number;
  warmupSeconds: number;
  cooldownSeconds: number;
  intensityLabel: string;
  benefitSummary: string;
  citation: string;
}

export const HIIT_PRESETS: Record<Exclude<HiitPresetId, 'custom'>, HiitPresetSpec> = {
  tabata: {
    id: 'tabata',
    label: 'Tabata (20s / 10s)',
    shortTag: '4 min · All-Out',
    workSeconds: 20,
    restSeconds: 10,
    rounds: 8,
    warmupSeconds: 60,
    cooldownSeconds: 60,
    intensityLabel: '~95–100% effort (supramaximal burst)',
    benefitSummary:
      'Trains both aerobic and anaerobic energy systems simultaneously — delivers maximum metabolic conditioning & explosive stamina in just 4 minutes of work.',
    citation: 'Tabata et al. (1996, Medicine & Science in Sports & Exercise)',
  },
  gibala: {
    id: 'gibala',
    label: 'Gibala 1:1 (60s / 60s)',
    shortTag: '16 min · Metabolic',
    workSeconds: 60,
    restSeconds: 60,
    rounds: 8,
    warmupSeconds: 60,
    cooldownSeconds: 60,
    intensityLabel: '~85–95% effort (vigorous, repeatable)',
    benefitSummary:
      'Time-efficient low-volume HIIT proven to trigger mitochondrial biogenesis (PGC-1α), boost fat oxidation, and improve insulin sensitivity without total exhaustion.',
    citation: 'Gibala et al. (McMaster University Low-Volume HIIT Trials)',
  },
  norwegian_4x4: {
    id: 'norwegian_4x4',
    label: 'Norwegian 4×4 (4m / 3m)',
    shortTag: '28 min · VO2 Max',
    workSeconds: 240,
    restSeconds: 180,
    rounds: 4,
    warmupSeconds: 120,
    cooldownSeconds: 120,
    intensityLabel: '90–95% HRmax (hard steady, 70% easy recovery)',
    benefitSummary:
      'Clinical gold standard for raising VO2 Max and cardiac stroke volume — sustained 4-minute bouts maximize time spent near peak oxygen uptake for heart longevity.',
    citation: 'Helgerud, Hoff et al. (2007, MSSE) & NTNU Clinical Trials',
  },
};

export interface HiitSegment {
  label: string;
  shortLabel: string;
  cue: string;
  seconds: number;
  kind: 'warmup' | 'work' | 'rest' | 'cooldown';
}

export function buildHiitIntervals(params: {
  workSeconds: number;
  restSeconds: number;
  rounds: number;
  warmupSeconds: number;
  cooldownSeconds: number;
  quietMode: boolean;
}): HiitSegment[] {
  const { workSeconds, restSeconds, rounds, warmupSeconds, cooldownSeconds, quietMode } = params;
  const workMove = quietMode
    ? 'Fast Power March, Fast Bodyweight Squats, or Shadow Punches (silent & brisk)'
    : 'Brisk High-Knees, Fast Stairs/Step-Ups, Burpees, or Jumping Jacks';

  const segments: HiitSegment[] = [];

  if (warmupSeconds > 0) {
    segments.push({
      label: 'Progressive Warm-Up',
      shortLabel: `Warm-Up (${warmupSeconds}s)`,
      cue: 'Easy march, arm circles, and light squats to raise heart rate and prep joints safely.',
      seconds: warmupSeconds,
      kind: 'warmup',
    });
  }

  for (let r = 1; r <= rounds; r += 1) {
    segments.push({
      label: `Round ${r}/${rounds} · WORK`,
      shortLabel: `Work #${r}`,
      cue: `${workMove} — push hard with crisp form!`,
      seconds: workSeconds,
      kind: 'work',
    });

    // Include rest after every work round (skip final rest only if cooldown immediately follows)
    if (r < rounds || cooldownSeconds === 0) {
      segments.push({
        label: `Round ${r}/${rounds} · REST`,
        shortLabel: `Rest #${r}`,
        cue: 'Slow nasal breathing, easy step in place — let your heart rate come down.',
        seconds: restSeconds,
        kind: 'rest',
      });
    }
  }

  if (cooldownSeconds > 0) {
    segments.push({
      label: 'Active Cool-Down',
      shortLabel: `Cool-Down (${cooldownSeconds}s)`,
      cue: 'Slow walk in place & deep belly exhales so blood pressure settles smoothly.',
      seconds: cooldownSeconds,
      kind: 'cooldown',
    });
  }

  return segments;
}

export function formatWorkRestRatio(workSeconds: number, restSeconds: number): string {
  if (workSeconds <= 0 || restSeconds <= 0) return '1:1';
  if (workSeconds >= restSeconds) {
    const r = Number((workSeconds / restSeconds).toFixed(1));
    return `${r}:1`;
  }
  const r = Number((restSeconds / workSeconds).toFixed(1));
  return `1:${r}`;
}
