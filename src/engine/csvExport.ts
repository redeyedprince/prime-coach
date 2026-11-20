import type { WorkoutLogEntry } from '../types/schemas';

const CSV_HEADER =
  'date,session_id,readiness,bodyweight_kg,pattern,exercise_slug,set_number,target_value,completed_value,unit,rir,soreness_tag,notes';

function escapeCsvField(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function serializeWorkoutLogsToCsv(logs: WorkoutLogEntry[]): string {
  const rows = logs.map((row) =>
    [
      row.date,
      row.session_id,
      row.readiness,
      row.bodyweight_kg ?? '',
      row.pattern,
      row.exercise_slug,
      row.set_number,
      row.target_value,
      row.completed_value,
      row.unit,
      row.rir >= 3 ? '3+' : String(row.rir),
      row.soreness_tag,
      row.notes,
    ]
      .map(escapeCsvField)
      .join(','),
  );
  return [CSV_HEADER, ...rows].join('\n');
}
