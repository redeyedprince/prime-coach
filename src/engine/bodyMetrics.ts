import type { BiologicalSex, BodyMetricEntry, UserProfile } from '../types/schemas';

export type TapeZoneId =
  | 'neck'
  | 'shoulders'
  | 'chest'
  | 'waist'
  | 'hips'
  | 'arm'
  | 'thigh';

export interface TapeZoneGuide {
  id: TapeZoneId;
  label: string;
  shortLabel: string;
  howToMeasure: string;
}

export const TAPE_MEASUREMENT_ZONES: Record<TapeZoneId, TapeZoneGuide> = {
  neck: {
    id: 'neck',
    label: 'Neck (cm)',
    shortLabel: 'Neck',
    howToMeasure:
      'Wrap the tape horizontally just below your Adam’s apple / larynx while looking straight ahead with relaxed shoulders.',
  },
  shoulders: {
    id: 'shoulders',
    label: 'Shoulders (cm)',
    shortLabel: 'Shoulders',
    howToMeasure:
      'Stand tall with arms relaxed at your sides and wrap the tape around the widest outer point of both shoulders.',
  },
  chest: {
    id: 'chest',
    label: 'Chest (cm)',
    shortLabel: 'Chest',
    howToMeasure:
      'Wrap horizontally across the fullest part of your chest and straight across your shoulder blades after a normal gentle exhale.',
  },
  waist: {
    id: 'waist',
    label: 'Waist (cm)',
    shortLabel: 'Waist',
    howToMeasure:
      'Stand relaxed, exhale naturally (do not suck in), and wrap the tape flat horizontally right across your navel (belly button).',
  },
  hips: {
    id: 'hips',
    label: 'Hips / Glutes (cm)',
    shortLabel: 'Hips',
    howToMeasure:
      'Stand with feet together and wrap horizontally around the widest, fullest part of your hips and glutes.',
  },
  arm: {
    id: 'arm',
    label: 'Upper Arm / Bicep (cm)',
    shortLabel: 'Arm',
    howToMeasure:
      'Measure both Left and Right mid-upper arms halfway between shoulder and elbow (choose either relaxed or flexed, and stay consistent each month).',
  },
  thigh: {
    id: 'thigh',
    label: 'Thigh (cm)',
    shortLabel: 'Thigh',
    howToMeasure:
      'Stand upright with weight evenly distributed and wrap horizontally around the fullest upper-mid part of each thigh (Left and Right).',
  },
};

/**
 * Returns clinically accurate, sex-specific tape placement guidance
 * (aligned with Hodgdon & Beckett U.S. Navy protocol & WHO guidelines).
 */
export function getTapeZoneGuide(zone: TapeZoneId, sex: BiologicalSex): TapeZoneGuide {
  const base = TAPE_MEASUREMENT_ZONES[zone];
  if (sex === 'female') {
    if (zone === 'chest') {
      return {
        ...base,
        label: 'Bust / Chest (cm)',
        shortLabel: 'Bust',
        howToMeasure:
          'Wear a thin, unpadded bra (or measure bare — avoid padded/push-up bras). Wrap horizontally across the fullest part of your bust and level straight across your shoulder blades after a gentle exhale.',
      };
    }
    if (zone === 'waist') {
      return {
        ...base,
        label: 'Natural Waist (cm)',
        shortLabel: 'Waist',
        howToMeasure:
          'Stand relaxed, exhale naturally (do not suck in), and wrap flat around the narrowest point of your natural waist — just above your navel, midway between your lowest rib and belly button (U.S. Navy female protocol).',
      };
    }
    if (zone === 'neck') {
      return {
        ...base,
        howToMeasure:
          'Wrap the tape horizontally around your mid-neck just below the larynx while looking straight ahead with relaxed shoulders.',
      };
    }
    if (zone === 'hips') {
      return {
        ...base,
        howToMeasure:
          'Stand tall with feet together and wrap horizontally around the widest, fullest curve of your hips and glutes, keeping the tape parallel to the floor.',
      };
    }
  } else {
    if (zone === 'chest') {
      return {
        ...base,
        howToMeasure:
          'Wrap horizontally across the fullest part of your chest (mid-pectoral / nipple line) and straight across your shoulder blades after a normal gentle exhale.',
      };
    }
    if (zone === 'waist') {
      return {
        ...base,
        howToMeasure:
          'Stand relaxed, exhale naturally (do not suck in), and wrap the tape flat horizontally right across your navel (belly button — U.S. Navy male protocol).',
      };
    }
  }
  return base;
}

export function isMonthlyWeightReminderDue(
  profile: UserProfile,
  todayIso: string,
): { due: boolean; daysSince: number } {
  if (
    profile.weight_reminder_snoozed_until &&
    profile.weight_reminder_snoozed_until > todayIso
  ) {
    return { due: false, daysSince: 0 };
  }
  const refDate = profile.last_weight_updated_at || profile.updated_at;
  if (!refDate) return { due: false, daysSince: 0 };

  const refMs = Date.parse(`${refDate}T00:00:00Z`);
  const todayMs = Date.parse(`${todayIso}T00:00:00Z`);
  if (Number.isNaN(refMs) || Number.isNaN(todayMs)) {
    return { due: false, daysSince: 0 };
  }
  const daysSince = Math.max(0, Math.floor((todayMs - refMs) / 86_400_000));
  return { due: daysSince >= 30, daysSince };
}

export interface BodyMetricInsights {
  latest: BodyMetricEntry | null;
  baseline: BodyMetricEntry | null;
  weightDeltaKg: number | null;
  waistDeltaCm: number | null;
  shouldersDeltaCm: number | null;
  hipsDeltaCm: number | null;
  chestDeltaCm: number | null;
  whtr: number | null;
  whtrStatus: string | null;
  whr: number | null;
  navyBodyFatPct: number | null;
  symmetryNotes: string[];
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Computes clinically validated, metric-only body insights:
 * - Waist-to-Height Ratio (WHtR): Ashwell et al. (2012, Obesity Reviews) (<0.50 optimal)
 * - Waist-to-Hip Ratio (WHR): WHO (2008)
 * - Optional U.S. Navy Body Fat % Estimate: Hodgdon & Beckett (1984) (strictly when required cm exist)
 * - Left vs. Right symmetry comparison
 */
export function computeBodyMetricInsights(
  entries: BodyMetricEntry[],
  profile: UserProfile,
): BodyMetricInsights {
  if (entries.length === 0) {
    return {
      latest: null,
      baseline: null,
      weightDeltaKg: null,
      waistDeltaCm: null,
      shouldersDeltaCm: null,
      hipsDeltaCm: null,
      chestDeltaCm: null,
      whtr: null,
      whtrStatus: null,
      whr: null,
      navyBodyFatPct: null,
      symmetryNotes: [],
    };
  }

  const sorted = [...entries].sort((a, b) => a.created_at.localeCompare(b.created_at));
  const baseline = sorted[0];
  const latest = sorted[sorted.length - 1];
  const hasMultiple = sorted.length >= 2;

  const weightDeltaKg = hasMultiple
    ? round1(latest.weight_kg - baseline.weight_kg)
    : null;
  const waistDeltaCm =
    hasMultiple && latest.waist_cm && baseline.waist_cm
      ? round1(latest.waist_cm - baseline.waist_cm)
      : null;
  const shouldersDeltaCm =
    hasMultiple && latest.shoulders_cm && baseline.shoulders_cm
      ? round1(latest.shoulders_cm - baseline.shoulders_cm)
      : null;
  const hipsDeltaCm =
    hasMultiple && latest.hips_cm && baseline.hips_cm
      ? round1(latest.hips_cm - baseline.hips_cm)
      : null;
  const chestDeltaCm =
    hasMultiple && latest.chest_cm && baseline.chest_cm
      ? round1(latest.chest_cm - baseline.chest_cm)
      : null;

  const heightCm = profile.height_cm ?? null;
  let whtr: number | null = null;
  let whtrStatus: string | null = null;
  if (latest.waist_cm && heightCm && heightCm >= 100) {
    whtr = round2(latest.waist_cm / heightCm);
    if (whtr < 0.43) whtrStatus = 'Lean / Slender (<0.43)';
    else if (whtr < 0.5) whtrStatus = 'Optimal Healthy Zone (<0.50)';
    else if (whtr < 0.58) whtrStatus = 'Above Optimal — Steady Waist Trim Focus';
    else whtrStatus = 'Elevated — Prioritize Zone-2, Steps & Protein';
  }

  const whr =
    latest.waist_cm && latest.hips_cm
      ? round2(latest.waist_cm / latest.hips_cm)
      : null;

  // U.S. Navy Metric Circumference Body Fat % Formula (Hodgdon & Beckett, 1984)
  let navyBodyFatPct: number | null = null;
  if (heightCm && heightCm >= 100 && latest.waist_cm && latest.neck_cm) {
    if (profile.biological_sex === 'male') {
      const diff = latest.waist_cm - latest.neck_cm;
      if (diff > 5) {
        const pct =
          495 /
            (1.0324 -
              0.19077 * Math.log10(diff) +
              0.15456 * Math.log10(heightCm)) -
          450;
        if (pct >= 4 && pct <= 55) navyBodyFatPct = round1(pct);
      }
    } else if (latest.hips_cm) {
      const sum = latest.waist_cm + latest.hips_cm - latest.neck_cm;
      if (sum > 20) {
        const pct =
          495 /
            (1.29579 -
              0.35004 * Math.log10(sum) +
              0.221 * Math.log10(heightCm)) -
          450;
        if (pct >= 8 && pct <= 60) navyBodyFatPct = round1(pct);
      }
    }
  }

  const symmetryNotes: string[] = [];
  if (latest.arm_left_cm && latest.arm_right_cm) {
    const diff = round1(Math.abs(latest.arm_left_cm - latest.arm_right_cm));
    if (diff >= 1.5) {
      const smaller = latest.arm_left_cm < latest.arm_right_cm ? 'Left' : 'Right';
      symmetryNotes.push(
        `Arms differ by ${diff} cm — start single-arm moves with your ${smaller} arm.`,
      );
    } else {
      symmetryNotes.push(`Arms well balanced (${diff} cm difference).`);
    }
  }
  if (latest.thigh_left_cm && latest.thigh_right_cm) {
    const diff = round1(Math.abs(latest.thigh_left_cm - latest.thigh_right_cm));
    if (diff >= 1.5) {
      const smaller = latest.thigh_left_cm < latest.thigh_right_cm ? 'Left' : 'Right';
      symmetryNotes.push(
        `Thighs differ by ${diff} cm — lead lunges & split squats with your ${smaller} leg.`,
      );
    } else {
      symmetryNotes.push(`Thighs well balanced (${diff} cm difference).`);
    }
  }

  return {
    latest,
    baseline,
    weightDeltaKg,
    waistDeltaCm,
    shouldersDeltaCm,
    hipsDeltaCm,
    chestDeltaCm,
    whtr,
    whtrStatus,
    whr,
    navyBodyFatPct,
    symmetryNotes,
  };
}

const BODY_CSV_HEADER =
  'date,weight_kg,neck_cm,shoulders_cm,chest_cm,waist_cm,hips_cm,arm_left_cm,arm_right_cm,thigh_left_cm,thigh_right_cm,notes';

export function serializeBodyMetricsToCsv(entries: BodyMetricEntry[]): string {
  const rows = entries.map((e) =>
    [
      e.date,
      e.weight_kg,
      e.neck_cm ?? '',
      e.shoulders_cm ?? '',
      e.chest_cm ?? '',
      e.waist_cm ?? '',
      e.hips_cm ?? '',
      e.arm_left_cm ?? '',
      e.arm_right_cm ?? '',
      e.thigh_left_cm ?? '',
      e.thigh_right_cm ?? '',
      e.notes ? `"${e.notes.replace(/"/g, '""')}"` : '',
    ].join(','),
  );
  return [BODY_CSV_HEADER, ...rows].join('\n');
}
