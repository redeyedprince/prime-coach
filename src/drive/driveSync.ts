import {
  loadAllBodyMetrics,
  loadAllPrimeAssessments,
  loadAllWorkoutLogs,
  loadDriveSyncMeta,
  loadProgramConfig,
  loadUserProfile,
  pruneOldWorkoutLogs,
  saveDriveSyncMeta,
  saveProgramConfig,
} from '../db/database';
import { serializeBodyMetricsToCsv } from '../engine/bodyMetrics';
import { buildPrimeCoachContextMarkdown } from '../engine/coachPrompt';
import { serializeWorkoutLogsToCsv } from '../engine/csvExport';
import {
  APP_BUILD_NUMBER,
  APP_VERSION,
  ProgramConfigSchema,
  type DriveSyncMeta,
  type ProgramConfig,
  type WorkoutLogEntry,
} from '../types/schemas';

const DRIVE_API = 'https://www.googleapis.com/drive/v3';
const DRIVE_UPLOAD_API = 'https://www.googleapis.com/upload/drive/v3';
const FOLDER_NAME = 'Prime_Coach';

export const GITHUB_REPO = 'redeyedprince/prime-coach';
export const GITHUB_RELEASES_URL = `https://github.com/${GITHUB_REPO}/releases`;
export const GITHUB_LATEST_APK_URL = `https://github.com/${GITHUB_REPO}/releases/latest/download/Prime-latest.apk`;
export const GITHUB_LATEST_API_URL = `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`;

export function getDriveFolderUrl(folderId?: string): string {
  return folderId
    ? `https://drive.google.com/drive/folders/${folderId}`
    : 'https://drive.google.com/drive/my-drive';
}

export function getApkGitHubDownloadUrl(): string {
  return GITHUB_LATEST_APK_URL;
}

/**
 * Compares two version strings like "2.3" and "2.2" (ignoring leading "v").
 * Returns >0 if a > b, 0 if equal, <0 if a < b.
 */
export function compareVersionStrings(a: string, b: string): number {
  const pa = a.replace(/^v/i, '').split('.').map((n) => Number.parseInt(n, 10) || 0);
  const pb = b.replace(/^v/i, '').split('.').map((n) => Number.parseInt(n, 10) || 0);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i += 1) {
    const da = pa[i] ?? 0;
    const db = pb[i] ?? 0;
    if (da !== db) return da - db;
  }
  return 0;
}

async function driveJsonFetch<T>(url: string, accessToken: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Google Drive API error (${res.status}): ${text}`);
  }
  return (await res.json()) as T;
}

async function findFileByName(
  accessToken: string,
  name: string,
  parentId?: string,
  mimeType?: string,
): Promise<string | undefined> {
  const clauses = [`name = '${name}'`, 'trashed = false'];
  if (parentId) clauses.push(`'${parentId}' in parents`);
  if (mimeType) clauses.push(`mimeType = '${mimeType}'`);
  const q = encodeURIComponent(clauses.join(' and '));
  const data = await driveJsonFetch<{ files: Array<{ id: string }> }>(
    `${DRIVE_API}/files?q=${q}&fields=files(id,name)&spaces=drive`,
    accessToken,
  );
  return data.files[0]?.id;
}

async function createFolder(accessToken: string, name: string): Promise<string> {
  const data = await driveJsonFetch<{ id: string }>(`${DRIVE_API}/files`, accessToken, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name,
      mimeType: 'application/vnd.google-apps.folder',
    }),
  });
  return data.id;
}

async function createEmptyFileInFolder(
  accessToken: string,
  name: string,
  parentId: string,
  mimeType: string,
  initialContent: string,
): Promise<string> {
  const created = await driveJsonFetch<{ id: string }>(`${DRIVE_API}/files`, accessToken, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name,
      parents: [parentId],
      mimeType,
    }),
  });

  await patchFileMedia(accessToken, created.id, mimeType, initialContent);
  return created.id;
}

async function patchFileMedia(
  accessToken: string,
  fileId: string,
  mimeType: string,
  content: string,
): Promise<void> {
  const res = await fetch(`${DRIVE_UPLOAD_API}/files/${fileId}?uploadType=media`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': mimeType,
    },
    body: content,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Drive PATCH failed for ${fileId} (${res.status}): ${text}`);
  }
}

async function fetchProgramConfigMedia(accessToken: string, fileId: string): Promise<ProgramConfig> {
  const res = await fetch(`${DRIVE_API}/files/${fileId}?alt=media`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Drive GET failed for program_config.json (${res.status}): ${text}`);
  }
  const raw = await res.json();
  return ProgramConfigSchema.parse(raw);
}

async function fetchFileTextOptional(accessToken: string, fileId: string): Promise<string | null> {
  try {
    const res = await fetch(`${DRIVE_API}/files/${fileId}?alt=media`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

function splitCsvRow(line: string): string[] {
  const cols: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      cols.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  cols.push(cur);
  return cols;
}

function mergeRemoteCsvWithLocalLogs(
  remoteCsvText: string | null,
  localLogs: WorkoutLogEntry[],
): { mergedCsv: string; totalRows: number } {
  const localCsvLines = serializeWorkoutLogsToCsv(localLogs).split('\n');
  const header = localCsvLines[0];
  const rowMap = new Map<string, string>();

  if (remoteCsvText) {
    const remoteLines = remoteCsvText.split(/\r?\n/).slice(1);
    for (const line of remoteLines) {
      if (!line.trim()) continue;
      const cols = splitCsvRow(line);
      const key = `${cols[0] ?? ''}|${cols[1] ?? ''}|${cols[4] ?? ''}|${cols[5] ?? ''}|${cols[6] ?? ''}`;
      rowMap.set(key, line);
    }
  }

  for (const line of localCsvLines.slice(1)) {
    if (!line.trim()) continue;
    const cols = splitCsvRow(line);
    const key = `${cols[0] ?? ''}|${cols[1] ?? ''}|${cols[4] ?? ''}|${cols[5] ?? ''}|${cols[6] ?? ''}`;
    rowMap.set(key, line);
  }

  const rows = Array.from(rowMap.values()).sort();
  return {
    mergedCsv: [header, ...rows].join('\n'),
    totalRows: rows.length,
  };
}

export async function compactLocalWorkoutStorage(): Promise<{
  deleted: number;
  remaining: number;
}> {
  return pruneOldWorkoutLogs(14);
}

export async function syncWithCoachDrive(accessToken: string): Promise<{
  meta: DriveSyncMeta;
  coachUpdated: boolean;
  coachSummary: string;
  archivedDeleted: number;
  totalCloudRows: number;
}> {
  const profile = await loadUserProfile();
  const localConfig = await loadProgramConfig();
  const logs = await loadAllWorkoutLogs();
  const assessments = await loadAllPrimeAssessments();
  const bodyMetrics = await loadAllBodyMetrics();
  const latestAssessment = assessments.length > 0 ? assessments[assessments.length - 1] : null;

  if (!profile || !localConfig) {
    throw new Error('Complete onboarding and calibration before syncing.');
  }

  let meta = await loadDriveSyncMeta();

  // Always find or auto-create a dedicated `Prime_Coach` folder in the signed-in user's own Drive
  if (!meta.folderId) {
    const existingFolder = await findFileByName(
      accessToken,
      FOLDER_NAME,
      undefined,
      'application/vnd.google-apps.folder',
    );
    meta.folderId = existingFolder ?? (await createFolder(accessToken, FOLDER_NAME));
  }

  const profileJson = JSON.stringify(profile, null, 2);
  const configJson = JSON.stringify(localConfig, null, 2);
  const contextMd = buildPrimeCoachContextMarkdown(profile, latestAssessment, bodyMetrics);
  const bodyCsv = serializeBodyMetricsToCsv(bodyMetrics);

  if (!meta.coachContextFileId) {
    const existing = await findFileByName(accessToken, 'PRIME_COACH_CONTEXT.md', meta.folderId);
    meta.coachContextFileId =
      existing ??
      (await createEmptyFileInFolder(
        accessToken,
        'PRIME_COACH_CONTEXT.md',
        meta.folderId,
        'text/markdown',
        contextMd,
      ));
  }

  if (!meta.bodyMetricsFileId) {
    const existing = await findFileByName(accessToken, 'body_metrics.csv', meta.folderId);
    meta.bodyMetricsFileId =
      existing ??
      (await createEmptyFileInFolder(
        accessToken,
        'body_metrics.csv',
        meta.folderId,
        'text/csv',
        bodyCsv,
      ));
  }

  if (!meta.userProfileFileId) {
    const existing = await findFileByName(accessToken, 'user_profile.json', meta.folderId);
    meta.userProfileFileId =
      existing ??
      (await createEmptyFileInFolder(
        accessToken,
        'user_profile.json',
        meta.folderId,
        'application/json',
        profileJson,
      ));
  }

  let existingRemoteCsv: string | null = null;
  if (!meta.workoutLogFileId) {
    const existing = await findFileByName(accessToken, 'workout_log.csv', meta.folderId);
    if (existing) {
      meta.workoutLogFileId = existing;
      existingRemoteCsv = await fetchFileTextOptional(accessToken, existing);
    } else {
      const initialCsv = serializeWorkoutLogsToCsv(logs);
      meta.workoutLogFileId = await createEmptyFileInFolder(
        accessToken,
        'workout_log.csv',
        meta.folderId,
        'text/csv',
        initialCsv,
      );
    }
  } else {
    existingRemoteCsv = await fetchFileTextOptional(accessToken, meta.workoutLogFileId);
  }

  const { mergedCsv, totalRows } = mergeRemoteCsvWithLocalLogs(existingRemoteCsv, logs);

  if (!meta.programConfigFileId) {
    const existing = await findFileByName(accessToken, 'program_config.json', meta.folderId);
    meta.programConfigFileId =
      existing ??
      (await createEmptyFileInFolder(
        accessToken,
        'program_config.json',
        meta.folderId,
        'application/json',
        configJson,
      ));
  }

  // In-place PATCH so fileIds remain permanent for external AI tools
  await patchFileMedia(accessToken, meta.userProfileFileId, 'application/json', profileJson);
  await patchFileMedia(accessToken, meta.workoutLogFileId, 'text/csv', mergedCsv);
  await patchFileMedia(accessToken, meta.coachContextFileId, 'text/markdown', contextMd);
  await patchFileMedia(accessToken, meta.bodyMetricsFileId, 'text/csv', bodyCsv);

  // Safe local compaction: prune >14 day local logs once Drive archive succeeded
  const pruneRes = await pruneOldWorkoutLogs(14);

  // Pull & validate latest program_config.json
  const remoteConfig = await fetchProgramConfigMedia(accessToken, meta.programConfigFileId);
  const coachUpdated = remoteConfig.meta.version !== localConfig.meta.version ||
    remoteConfig.meta.updated_at !== localConfig.meta.updated_at;

  await saveProgramConfig(remoteConfig);

  meta = {
    ...meta,
    archivedLogCount: Math.max(0, totalRows - pruneRes.remaining),
    lastSyncedAt: new Date().toISOString(),
  };
  await saveDriveSyncMeta(meta);

  return {
    meta,
    coachUpdated,
    coachSummary: remoteConfig.meta.coach_summary,
    archivedDeleted: pruneRes.deleted,
    totalCloudRows: totalRows,
  };
}

export interface AppUpdateCheckResult {
  currentVersion: string;
  currentBuild: number;
  latestVersion: string;
  updateAvailable: boolean;
  apkDownloadUrl: string;
  releasesUrl: string;
  notes: string;
  checkedOnline: boolean;
}

/**
 * Checks GitHub Releases (https://github.com/redeyedprince/prime-coach/releases)
 * directly with zero login/OAuth required.
 */
export async function checkAppUpdateFromGitHub(): Promise<AppUpdateCheckResult> {
  try {
    const res = await fetch(GITHUB_LATEST_API_URL, {
      headers: { Accept: 'application/vnd.github+json' },
    });
    if (res.ok) {
      const data = (await res.json()) as {
        tag_name?: string;
        name?: string;
        body?: string;
        html_url?: string;
        assets?: Array<{ name?: string; browser_download_url?: string }>;
      };
      const latestVersion = (data.tag_name ?? APP_VERSION).replace(/^v/i, '');
      const apkAsset = data.assets?.find((a) => a.name?.toLowerCase().endsWith('.apk'));
      const apkDownloadUrl = apkAsset?.browser_download_url || GITHUB_LATEST_APK_URL;
      const updateAvailable = compareVersionStrings(latestVersion, APP_VERSION) > 0;
      const firstNoteLine =
        data.body
          ?.split('\n')
          .map((l) => l.trim())
          .find((l) => l.length > 0) ||
        data.name ||
        `Latest Prime release v${latestVersion} on GitHub.`;

      return {
        currentVersion: APP_VERSION,
        currentBuild: APP_BUILD_NUMBER,
        latestVersion,
        updateAvailable,
        apkDownloadUrl,
        releasesUrl: data.html_url || GITHUB_RELEASES_URL,
        notes: firstNoteLine,
        checkedOnline: true,
      };
    }
  } catch {
    // Offline or no published release yet — fall through gracefully
  }

  return {
    currentVersion: APP_VERSION,
    currentBuild: APP_BUILD_NUMBER,
    latestVersion: APP_VERSION,
    updateAvailable: false,
    apkDownloadUrl: GITHUB_LATEST_APK_URL,
    releasesUrl: GITHUB_RELEASES_URL,
    notes: `Open GitHub Releases (${GITHUB_REPO}) to view or download the latest Prime APK.`,
    checkedOnline: false,
  };
}
