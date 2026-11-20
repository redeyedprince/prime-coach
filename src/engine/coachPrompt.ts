import { ALLOWLIST_BY_SLUG, FLOOR_EXERCISE_ALLOWLIST } from '../data/exerciseCatalog';
import {
  ProgramConfigSchema,
  type BodyMetricEntry,
  type DriveSyncMeta,
  type MovementPattern,
  type PrimeAssessmentEntry,
  type ProgramConfig,
  type UserProfile,
  type WorkoutLogEntry,
} from '../types/schemas';
import { computeBodyMetricInsights } from './bodyMetrics';

function getDriveFileViewUrl(fileId?: string): string | null {
  return fileId ? `https://drive.google.com/file/d/${fileId}/view` : null;
}

/**
 * Dynamically extracts valid, safe, equipment-compatible exercise slugs from
 * Prime's real 318-exercise catalog so Gemini NEVER hallucinates an invalid slug.
 */
export function getEligibleSlugsByPattern(
  profile: UserProfile,
): Record<MovementPattern, string[]> {
  const includeGym = profile.active_location === 'gym';
  const equip = profile.available_equipment ?? [];
  const restricted = new Set(profile.joint_restrictions.filter((j) => j !== 'none'));

  const result: Record<MovementPattern, string[]> = {
    push: [],
    pull: [],
    legs: [],
    core: [],
  };

  for (const ex of FLOOR_EXERCISE_ALLOWLIST) {
    if (profile.quiet_hotel_mode && ex.impact_level === 'explosive') continue;
    if (ex.contraindicated_joints.some((j) => restricted.has(j))) continue;
    if (ex.required_equipment) {
      if (ex.required_equipment === 'gym' && !includeGym) continue;
      if (ex.required_equipment !== 'gym' && !equip.includes(ex.required_equipment)) continue;
    }
    if (result[ex.pattern].length < 24) {
      result[ex.pattern].push(ex.slug);
    }
  }

  return result;
}

/**
 * Auto-generates PRIME_COACH_CONTEXT.md uploaded to the user's Prime_Coach
 * Google Drive folder so Gemini has complete rules, exact Zod schema, and
 * 100% real catalog slugs for this specific user.
 */
export function buildPrimeCoachContextMarkdown(
  profile: UserProfile,
  latestAssessment?: PrimeAssessmentEntry | null,
  bodyMetrics: BodyMetricEntry[] = [],
): string {
  const slugs = getEligibleSlugsByPattern(profile);
  const bodyInsights = computeBodyMetricInsights(bodyMetrics, profile);
  const bodySection = bodyInsights.latest
    ? [
        `- Entries logged: ${bodyMetrics.length} (Day 1: ${bodyInsights.baseline?.date ?? bodyInsights.latest.date} -> Latest: ${bodyInsights.latest.date})`,
        `- Weight: ${bodyInsights.latest.weight_kg} kg${bodyInsights.weightDeltaKg !== null ? ` (${bodyInsights.weightDeltaKg > 0 ? '+' : ''}${bodyInsights.weightDeltaKg} kg vs Day 1)` : ''} · Height: ${profile.height_cm ?? 'N/A'} cm`,
        bodyInsights.whtr !== null
          ? `- Waist-to-Height Ratio (WHtR): ${bodyInsights.whtr} (${bodyInsights.whtrStatus})`
          : '- Waist-to-Height Ratio: not measured yet',
        bodyInsights.navyBodyFatPct !== null
          ? `- U.S. Navy Est. Body Fat: ${bodyInsights.navyBodyFatPct}%${bodyInsights.whr !== null ? ` · Waist-Hip Ratio: ${bodyInsights.whr}` : ''}`
          : '- U.S. Navy Est. Body Fat: optional tape inputs not all entered yet',
        `- Latest Tape (cm): Waist ${bodyInsights.latest.waist_cm ?? '—'}, Shoulders ${bodyInsights.latest.shoulders_cm ?? '—'}, Chest ${bodyInsights.latest.chest_cm ?? '—'}, Hips ${bodyInsights.latest.hips_cm ?? '—'}, Neck ${bodyInsights.latest.neck_cm ?? '—'}, Arms L/R ${bodyInsights.latest.arm_left_cm ?? '—'}/${bodyInsights.latest.arm_right_cm ?? '—'}, Thighs L/R ${bodyInsights.latest.thigh_left_cm ?? '—'}/${bodyInsights.latest.thigh_right_cm ?? '—'}`,
        ...(bodyInsights.symmetryNotes.length > 0
          ? [`- Symmetry: ${bodyInsights.symmetryNotes.join(' ')}`]
          : []),
      ].join('\n')
    : '- No body measurement history logged yet.';
  const equipmentDesc =
    profile.active_location === 'gym'
      ? 'Full Gym Access'
      : profile.available_equipment.length > 0
        ? profile.available_equipment.join(', ') +
          (profile.dumbbell_kg ? ` (${profile.dumbbell_kg} kg)` : '')
        : 'Floor Only (Zero Equipment)';

  const primeSnapshot = latestAssessment
    ? [
        `- Date: ${latestAssessment.date}`,
        `- Overall Prime Score: ${latestAssessment.overall_score} / 100`,
        `- Strength: ${latestAssessment.pillar_scores.strength}% | Mobility: ${latestAssessment.pillar_scores.mobility}% | Balance: ${latestAssessment.pillar_scores.balance}% | Heart: ${latestAssessment.pillar_scores.heart}% | Breath: ${latestAssessment.pillar_scores.breath}% | Core: ${latestAssessment.pillar_scores.core}%`,
        `- Weakest Pillar to mention in coaching advice: ${latestAssessment.weakest_pillar}`,
      ].join('\n')
    : '- No 6-Pillar Prime Check-Up logged yet.';

  return `# Prime — AI Coach Context & Schema Reference

You are acting as an evidence-based Personal Physical Conditioning Coach for the **Prime** app.
Strictly obey every rule and exercise slug below so your updated \`program_config.json\` imports cleanly without errors.

## 1. How Prime Works
- **4 Movement Patterns:** \`push\`, \`pull\`, \`legs\`, \`core\`.
- **72-Hour Muscle Recovery Guard:** Intense training on a muscle pattern triggers a 48–72h cooldown; never schedule the same intense pattern on two consecutive days unless it is a light skill/deload week.
- **Autoregulated Double Progression (Reps Left in Tank / RIR):**
  - \`rir = 0\` (exhausted / failure), \`rir = 1\` (hard), \`rir = 2\` (just right), \`rir = 3+\` (too easy).
  - If the athlete hits \`max_target\` cleanly at \`rir >= 2\` for 2 consecutive sessions with \`soreness_tag = none\`, increase intensity by moving up \`active_slug\` on \`progression_ladder\` OR increasing \`sets\` / \`min_target\`–\`max_target\` / tightening \`rest_seconds\`.
  - If the athlete repeatedly logs a \`soreness_tag\` (\`wrist\`, \`shoulder\`, \`elbow\`, \`knee\`, \`lower_back\`), swap \`active_slug\` to a joint-safe slug from Section 3, keep the joint in \`global_modifiers.restricted_tags\`, or reduce \`volume_multiplier\` (e.g. \`0.75\`) / enable \`deload_active: true\`.
- **Whole-Body Prime Pillars:** Strength, Tendon Armor, Mobility & Foot Reset, Balance & Athletic Pop, Zone-2 & VO2 Max Heart Modes, Breathwork Pacer, Pelvic Floor (Kegel), Daily Sleep/Fuel Readiness, and 6-Pillar Prime Check-Up.

## 2. Exact \`program_config.json\` Schema Rules (STRICT — Validated by Zod)
- \`meta\`:
  - \`version\`: integer >= 1 (increment previous \`meta.version\` by +1)
  - \`updated_at\`: string \`YYYY-MM-DD\`
  - \`active_phase\`: short string (e.g. \`"Mesocycle 1 · Week 3 Intensity Ramp"\`)
  - \`coach_summary\`: 1–2 plain-English sentences explaining what you changed and why
- \`global_modifiers\`:
  - \`deload_active\`: boolean
  - \`volume_multiplier\`: number \`0.25..2.0\`
  - \`rest_adjustment_seconds\`: integer \`-60..120\`
  - \`quiet_hotel_mode\`: boolean
  - \`restricted_tags\`: array of strings from \`["wrist", "shoulder", "elbow", "knee", "lower_back"]\` (or \`[]\`)
- \`weekly_split\`: array of 7 objects (\`day\`: \`1..7\`), each with:
  - \`focus\`: non-empty array using ONLY \`"push"\`, \`"pull"\`, \`"legs"\`, \`"core"\`, or \`["rest"]\`
  - \`target_minutes\`: integer \`10..60\`
- \`movement_tracks\`: object with ALL FOUR keys \`"push"\`, \`"pull"\`, \`"legs"\`, \`"core"\`. Each track MUST include:
  - \`active_slug\`: string (MUST be copied verbatim from Section 3 below!)
  - \`bw_load_factor\`: number \`0.1..1.5\`
  - \`progression_ladder\`: non-empty array of valid slugs from the same pattern in Section 3
  - \`prescription\`:
    - \`sets\`: integer \`1..10\`
    - \`min_target\`: integer >= 1
    - \`max_target\`: integer >= \`min_target\`
    - \`unit\`: \`"reps"\` or \`"seconds"\` (use \`"seconds"\` for isometric holds/planks)
    - \`target_rir_range\`: 2-integer tuple \`[minRir, maxRir]\` where each is \`0..5\`
    - \`rest_seconds\`: integer \`15..300\`
    - \`tempo\`: string matching \`^\\d+-\\d+-\\d+-\\d+$\` (e.g. \`"3-1-1-0"\`)
  - \`auto_rules\`:
    - \`level_up_consecutive_sessions\`: integer \`1..10\`
    - \`level_up_min_rir\`: integer \`0..5\`
    - \`min_conditioning_weeks\`: integer \`1..12\`
    - \`hold_progression\`: boolean

## 3. Valid Safe Exercise Slugs for ${profile.user_name} (ONLY Use Slugs Listed Here)
- **Active Gear:** ${equipmentDesc}
- **Joint Restrictions:** ${profile.joint_restrictions.join(', ')}
- **Quiet Mode:** ${profile.quiet_hotel_mode ? 'ON (no jumping)' : 'OFF'}

- **push:** ${slugs.push.map((s) => `\`${s}\``).join(', ')}
- **pull:** ${slugs.pull.map((s) => `\`${s}\``).join(', ')}
- **legs:** ${slugs.legs.map((s) => `\`${s}\``).join(', ')}
- **core:** ${slugs.core.map((s) => `\`${s}\``).join(', ')}

## 4. Latest 6-Pillar Prime Condition Snapshot
${primeSnapshot}

## 5. Metric Body Measurements & Recomposition Trend (kg / cm)
${bodySection}
`;
}

/**
 * Builds the 1-tap pre-made prompt for Gemini (works seamlessly with Google Drive
 * links when OAuth is connected, or inline self-contained for offline / In-App API).
 */
export function buildGeminiCoachPrompt(params: {
  profile: UserProfile;
  config: ProgramConfig;
  logs: WorkoutLogEntry[];
  meta: DriveSyncMeta;
  latestAssessment?: PrimeAssessmentEntry | null;
  bodyMetrics?: BodyMetricEntry[];
  userNote?: string;
  forceInlineContext?: boolean;
}): string {
  const {
    profile,
    config,
    logs,
    meta,
    latestAssessment,
    bodyMetrics = [],
    userNote,
    forceInlineContext = false,
  } = params;
  const today = new Date().toISOString().slice(0, 10);
  const trimmedNote = userNote?.trim() ?? '';

  const contextUrl = getDriveFileViewUrl(meta.coachContextFileId);
  const profileUrl = getDriveFileViewUrl(meta.userProfileFileId);
  const configUrl = getDriveFileViewUrl(meta.programConfigFileId);
  const csvUrl = getDriveFileViewUrl(meta.workoutLogFileId);
  const bodyUrl = getDriveFileViewUrl(meta.bodyMetricsFileId);
  const hasDriveLinks =
    !forceInlineContext && Boolean(contextUrl && profileUrl && configUrl && csvUrl);

  const noteBlock = trimmedNote
    ? [
        ``,
        `### Athlete's Personal Note / Complaints / Request (HIGH PRIORITY — Address This Directly)`,
        `"${trimmedNote}"`,
      ]
    : [];

  if (hasDriveLinks) {
    return [
      `You are my Personal Physical Conditioning Coach for the Prime app.`,
      ``,
      `Please read these synced files from my Prime_Coach Google Drive folder first so you understand how Prime works, my profile, my current plan, and my workout log:`,
      `1. Prime Context & Schema Rules (PRIME_COACH_CONTEXT.md): ${contextUrl}`,
      `2. My Profile (user_profile.json): ${profileUrl}`,
      `3. My Current Plan (program_config.json): ${configUrl}`,
      `4. My Workout Log (workout_log.csv): ${csvUrl}`,
      ...(bodyUrl ? [`5. My Body Measurements History (body_metrics.csv): ${bodyUrl}`] : []),
      ...noteBlock,
      ``,
      `After analyzing my files:`,
      `1. Give me a short, plain-English 3–4 bullet coaching summary (what you noticed about fatigue/soreness, how you addressed my note/complaint above, where I am ready to increase intensity, and any weak Prime pillar tip).`,
      `2. Output ONE complete, valid updated \`program_config.json\` inside a \`\`\`json ... \`\`\` code block strictly obeying every schema rule and valid exercise slug in PRIME_COACH_CONTEXT.md so I can paste it straight back into Prime.`,
      ``,
      `Today's date is ${today}. My goal: safely increase intensity where I am ready while protecting any sore joints.`,
    ].join('\n');
  }

  // Self-contained inline prompt (used for Offline Way 1 AND In-App Free Gemini API Way 2!)
  const fullContextMd = buildPrimeCoachContextMarkdown(profile, latestAssessment, bodyMetrics);
  const recentLogs = logs
    .slice(-25)
    .map(
      (l) =>
        `${l.date} | ${l.pattern} | ${l.exercise_slug} | set ${l.set_number}: ${l.completed_value}/${l.target_value} ${l.unit} | RIR:${l.rir >= 3 ? '3+' : l.rir} | soreness:${l.soreness_tag}${l.notes ? ` | "${l.notes}"` : ''}`,
    )
    .join('\n');

  return [
    `You are my Personal Physical Conditioning Coach for the Prime app.`,
    `Today's date is ${today}.`,
    ``,
    fullContextMd,
    ``,
    `### Athlete Profile Summary`,
    `- Name: ${profile.user_name} (${profile.biological_sex}, ${profile.age_bracket}, ${profile.bodyweight_kg ? `${profile.bodyweight_kg} kg` : 'weight not set'}, ${profile.height_cm ? `${profile.height_cm} cm` : 'height not set'})`,
    `- Focus: ${profile.body_focus} · Goal: ${profile.primary_goal} · ${profile.days_per_week} days/wk (${profile.session_duration_minutes} min)`,
    `- Location: ${profile.active_location} · Gear: ${profile.available_equipment.length ? profile.available_equipment.join(', ') : 'Floor Only'} · Joint Restrictions: ${profile.joint_restrictions.join(', ')}`,
    ``,
    `### Recent Logged Sets`,
    recentLogs || '(No workouts logged yet — keep or gently tailor the starting ramp.)',
    ``,
    `### Current program_config.json`,
    '```json',
    JSON.stringify(config, null, 2),
    '```',
    ...noteBlock,
    ``,
    `### Your Task`,
    `1. Give me a clear, plain-English 3–4 bullet coaching summary of what you noticed (fatigue, soreness, body trend, how you handled my note/complaint above, and what you updated).`,
    `2. Output ONE complete, valid updated \`program_config.json\` inside a \`\`\`json ... \`\`\` code block (increment \`meta.version\` from ${config.meta.version} to ${config.meta.version + 1}, set \`meta.updated_at\` to "${today}", keep valid \`tempo\` like "3-1-1-0", keep all 4 keys push/pull/legs/core, and use ONLY valid slugs listed in Section 3 above) so Prime can ingest and apply it automatically.`,
  ].join('\n');
}

/**
 * Extracts a balanced top-level JSON object containing "movement_tracks" or "meta"
 * from free-form plaintext if Gemini skipped markdown ```json fences.
 */
function extractBalancedJsonObject(text: string): string | null {
  const candidates: string[] = [];
  let depth = 0;
  let start = -1;
  let inString = false;
  let escape = false;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (inString) {
      if (escape) {
        escape = false;
      } else if (ch === '\\') {
        escape = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }
    if (ch === '"') {
      inString = true;
      continue;
    }
    if (ch === '{') {
      if (depth === 0) start = i;
      depth += 1;
    } else if (ch === '}' && depth > 0) {
      depth -= 1;
      if (depth === 0 && start !== -1) {
        candidates.push(text.slice(start, i + 1));
        start = -1;
      }
    }
  }

  // Prefer the candidate that looks like ProgramConfig
  const matching = candidates.find(
    (c) => c.includes('"movement_tracks"') && c.includes('"weekly_split"'),
  );
  if (matching) return matching;
  return candidates.sort((a, b) => b.length - a.length)[0] ?? null;
}

/**
 * Smartly extracts and validates a ProgramConfig JSON even if Gemini returned
 * a raw .json file, a ```json ... ``` markdown fence, or plain unformatted JSON
 * embedded inside conversational coaching text.
 */
export function parseCoachJsonInput(rawText: string): ProgramConfig {
  const trimmed = rawText.trim();
  if (!trimmed) {
    throw new Error('Paste Gemini’s response or a program_config.json first.');
  }

  let candidate: string | null = null;
  const fenceRegex = /```(?:json)?\s*([\s\S]*?)```/gi;
  let match: RegExpExecArray | null;
  while ((match = fenceRegex.exec(trimmed)) !== null) {
    const inner = match[1]?.trim() ?? '';
    if (inner.startsWith('{') && inner.endsWith('}')) {
      if (inner.includes('"movement_tracks"') || !candidate) {
        candidate = inner;
      }
    }
  }

  if (!candidate) {
    candidate = extractBalancedJsonObject(trimmed) ?? trimmed;
  }

  const parsed = ProgramConfigSchema.parse(JSON.parse(candidate));
  for (const [pattern, track] of Object.entries(parsed.movement_tracks)) {
    if (!ALLOWLIST_BY_SLUG[track.active_slug]) {
      throw new Error(
        `Exercise "${track.active_slug}" in ${pattern} is not in Prime's exercise catalog. Ask Gemini to use only slugs from PRIME_COACH_CONTEXT.md.`,
      );
    }
  }
  return parsed;
}

/**
 * Builds a dedicated 1-tap prompt asking Free Gemini to act as a comprehensive
 * Fitness Assessor grading body recomposition, symmetry, 6-pillar prime scores,
 * and workout progress (using Drive links if synced, or full metric summary offline/in-app).
 */
export function buildGeminiAssessmentPrompt(params: {
  profile: UserProfile;
  logs: WorkoutLogEntry[];
  bodyMetrics: BodyMetricEntry[];
  meta: DriveSyncMeta;
  latestAssessment?: PrimeAssessmentEntry | null;
  userNote?: string;
  forceInlineContext?: boolean;
}): string {
  const {
    profile,
    logs,
    bodyMetrics,
    meta,
    latestAssessment,
    userNote,
    forceInlineContext = false,
  } = params;
  const today = new Date().toISOString().slice(0, 10);
  const trimmedNote = userNote?.trim() ?? '';
  const insights = computeBodyMetricInsights(bodyMetrics, profile);

  const contextUrl = getDriveFileViewUrl(meta.coachContextFileId);
  const profileUrl = getDriveFileViewUrl(meta.userProfileFileId);
  const csvUrl = getDriveFileViewUrl(meta.workoutLogFileId);
  const bodyUrl = getDriveFileViewUrl(meta.bodyMetricsFileId);
  const hasDriveLinks =
    !forceInlineContext && Boolean(contextUrl && profileUrl && csvUrl);

  const noteBlock = trimmedNote
    ? [
        ``,
        `### Athlete's Personal Note / Complaints / Questions (Address Directly)`,
        `"${trimmedNote}"`,
      ]
    : [];

  const taskBlock = [
    `Please give me an honest, encouraging, plain-English **Monthly Fitness Assessment** covering:`,
    `1. **Body Recomposition & Health Ratios:** Analyze my weight trend (kg), tape changes (cm), Waist-to-Height Ratio (WHtR), and Left/Right symmetry.`,
    `2. **Strength & Consistency Verdict:** Based on my logged workouts and reps-in-tank (RIR), where am I progressing well and where am I plateauing?`,
    `3. **6-Pillar Whole-Body Balance:** Highlight my strongest physical trait and my #1 weak link across Strength, Mobility, Balance, Heart, Breath, and Core.`,
    ...(trimmedNote
      ? [`4. **Response to My Note / Complaint:** Directly answer the personal message I wrote above.`]
      : []),
    `${trimmedNote ? '5' : '4'}. **Top 3 Actionable Next-Month Priorities:** Give 3 crisp, realistic upgrades (training, recovery fuel/protein, or mobility/cardio) for the next 30 days.`,
  ].join('\n');

  if (hasDriveLinks) {
    return [
      `You are my Personal Fitness Assessor & Physical Conditioning Coach for the Prime app (${today}).`,
      ``,
      `Please read my synced Prime_Coach Google Drive files:`,
      `1. Prime Context & Trends (PRIME_COACH_CONTEXT.md): ${contextUrl}`,
      `2. My Profile (user_profile.json): ${profileUrl}`,
      `3. My Workout Log (workout_log.csv): ${csvUrl}`,
      ...(bodyUrl ? [`4. My Body Measurements History (body_metrics.csv): ${bodyUrl}`] : []),
      ...noteBlock,
      ``,
      taskBlock,
    ].join('\n');
  }

  const metricTimeline = bodyMetrics
    .slice(-8)
    .map(
      (m) =>
        `${m.date}: ${m.weight_kg} kg | Waist:${m.waist_cm ?? '-'}cm | Shoulders:${m.shoulders_cm ?? '-'}cm | Chest:${m.chest_cm ?? '-'}cm | Hips:${m.hips_cm ?? '-'}cm | Arms L/R:${m.arm_left_cm ?? '-'}/${m.arm_right_cm ?? '-'}cm | Thighs L/R:${m.thigh_left_cm ?? '-'}/${m.thigh_right_cm ?? '-'}cm${m.notes ? ` | "${m.notes}"` : ''}`,
    )
    .join('\n');

  const recentWorkouts = logs
    .slice(-15)
    .map(
      (l) =>
        `${l.date} | ${l.pattern} | ${l.exercise_slug} | ${l.completed_value}/${l.target_value} ${l.unit} | RIR:${l.rir >= 3 ? '3+' : l.rir} | soreness:${l.soreness_tag}`,
    )
    .join('\n');

  return [
    `You are my Personal Fitness Assessor & Physical Conditioning Coach for the Prime app (${today}).`,
    ``,
    `### My Profile (Metric)`,
    `- ${profile.user_name} · ${profile.biological_sex} · ${profile.age_bracket} · Weight: ${profile.bodyweight_kg ?? 'N/A'} kg · Height: ${profile.height_cm ?? 'N/A'} cm`,
    `- Goal: ${profile.body_focus} (${profile.days_per_week}d/wk, ${profile.session_duration_minutes} min) · Joint Restrictions: ${profile.joint_restrictions.join(', ')}`,
    latestAssessment
      ? `- Latest 6-Pillar Prime Score (${latestAssessment.date}): ${latestAssessment.overall_score}/100 (Strength ${latestAssessment.pillar_scores.strength}%, Mobility ${latestAssessment.pillar_scores.mobility}%, Balance ${latestAssessment.pillar_scores.balance}%, Heart ${latestAssessment.pillar_scores.heart}%, Breath ${latestAssessment.pillar_scores.breath}%, Core ${latestAssessment.pillar_scores.core}%)`
      : `- 6-Pillar Prime Check-Up: Not logged yet`,
    insights.whtr !== null
      ? `- Computed Ratios: WHtR ${insights.whtr} (${insights.whtrStatus})${insights.navyBodyFatPct !== null ? ` · Navy Est. BF ${insights.navyBodyFatPct}%` : ''}`
      : '',
    ``,
    `### My Metric Body Measurements Timeline`,
    metricTimeline || '(Only baseline weight recorded so far)',
    ``,
    `### Recent Logged Workouts`,
    recentWorkouts || '(No workouts logged yet — assess my starting baseline & give a strong Month-1 roadmap.)',
    ...noteBlock,
    ``,
    taskBlock,
  ]
    .filter(Boolean)
    .join('\n');
}
