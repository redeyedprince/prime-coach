import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  AlertCircle,
  BookOpen,
  Bot,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ClipboardCheck,
  ClipboardPaste,
  Cloud,
  Code2,
  Copy,
  Download,
  ExternalLink,
  Eye,
  EyeOff,
  FileSpreadsheet,
  FileUp,
  HardDriveDownload,
  KeyRound,
  Loader2,
  MessageSquarePlus,
  RefreshCw,
  RotateCcw,
  Send,
  Share2,
  Sparkles,
  Trash2,
  Upload,
  X,
  Zap,
} from 'lucide-react';
import {
  loadAllBodyMetrics,
  loadAllPrimeAssessments,
  loadAllWorkoutLogs,
  loadDriveSyncMeta,
  loadProgramConfig,
  saveDriveSyncMeta,
  saveProgramConfig,
} from '../../db/database';
import {
  checkAppUpdateFromGitHub,
  compactLocalWorkoutStorage,
  getApkGitHubDownloadUrl,
  getDriveFolderUrl,
  GITHUB_RELEASES_URL,
  GITHUB_REPO,
  syncWithCoachDrive,
  type AppUpdateCheckResult,
} from '../../drive/driveSync';
import { requestDriveAccessToken } from '../../drive/googleAuth';
import {
  buildGeminiAssessmentPrompt,
  buildGeminiCoachPrompt,
  parseCoachJsonInput,
} from '../../engine/coachPrompt';
import { serializeWorkoutLogsToCsv } from '../../engine/csvExport';
import {
  extractReadableGeminiSummary,
  runInAppGeminiRequest,
  type InAppGeminiResult,
} from '../../services/geminiApi';
import {
  APP_BUILD_NUMBER,
  APP_VERSION,
  ProgramConfigSchema,
  type DriveSyncMeta,
  type ProgramConfig,
  type UserProfile,
} from '../../types/schemas';
import { OAuthGuideAccordion } from '../common/OAuthGuideAccordion';
import { TermHint } from '../common/TermHint';

interface SyncCoachScreenProps {
  profile: UserProfile;
  config: ProgramConfig;
  onConfigUpdated: (next: ProgramConfig) => void;
}

const QUICK_NOTE_CHIPS = [
  'Make workouts harder where I am ready',
  'My shoulder/joint feels sore — protect it',
  'Busy week — keep sessions shorter (15–20 min)',
  'Grade my body measurement progress & symmetry',
];

interface GeminiDialogState {
  mode: 'plan' | 'assess';
  result: InAppGeminiResult;
  appliedAutomatically: boolean;
  previousConfig: ProgramConfig | null;
  undone: boolean;
}

/**
 * Lightweight, safe inline bold renderer for Gemini's plain-English coaching reply.
 */
function renderInlineBold(line: string) {
  const parts = line.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={idx} className="font-bold text-slate-900">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <span key={idx}>{part}</span>;
  });
}

function FormattedGeminiText({ text }: { text: string }) {
  const lines = text.split('\n');
  return (
    <div className="space-y-1.5 text-xs leading-relaxed text-slate-700">
      {lines.map((rawLine, idx) => {
        const line = rawLine.trim();
        if (!line) return <div key={idx} className="h-1" />;

        if (line.startsWith('### ') || line.startsWith('## ') || line.startsWith('# ')) {
          const heading = line.replace(/^#{1,3}\s+/, '');
          return (
            <h4 key={idx} className="pt-1.5 text-xs font-extrabold text-blue-900">
              {renderInlineBold(heading)}
            </h4>
          );
        }

        if (/^[-*•]\s+/.test(line)) {
          return (
            <div key={idx} className="flex items-start gap-2 pl-1">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-600" />
              <span>{renderInlineBold(line.replace(/^[-*•]\s+/, ''))}</span>
            </div>
          );
        }

        if (/^\d+\.\s+/.test(line)) {
          const match = line.match(/^(\d+\.)\s+(.*)$/);
          return (
            <div key={idx} className="flex items-start gap-2 pl-0.5">
              <span className="shrink-0 font-bold text-blue-700">{match?.[1]}</span>
              <span>{renderInlineBold(match?.[2] ?? line)}</span>
            </div>
          );
        }

        return <p key={idx}>{renderInlineBold(line)}</p>;
      })}
    </div>
  );
}

export function SyncCoachScreen({
  profile,
  config,
  onConfigUpdated,
}: SyncCoachScreenProps) {
  const [meta, setMeta] = useState<DriveSyncMeta>({ id: 'singleton' });
  const [localLogCount, setLocalLogCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<AppUpdateCheckResult | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Coach mode & user note / complaints state
  const [coachWay, setCoachWay] = useState<'way1' | 'way2'>('way1');
  const [promptKind, setPromptKind] = useState<'plan' | 'assess'>('plan');
  const [userNote, setUserNote] = useState('');
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [keySavedFlash, setKeySavedFlash] = useState(false);
  const [clientIdInput, setClientIdInput] = useState('');
  const [clientIdSavedFlash, setClientIdSavedFlash] = useState(false);

  // Way 2 In-App Gemini API state & reading window
  const [runningGeminiMode, setRunningGeminiMode] = useState<'plan' | 'assess' | null>(null);
  const [geminiDialog, setGeminiDialog] = useState<GeminiDialogState | null>(null);
  const [lastGeminiDialog, setLastGeminiDialog] = useState<GeminiDialogState | null>(null);
  const [showRawJson, setShowRawJson] = useState(false);
  const [copiedReply, setCopiedReply] = useState(false);

  const [geminiGuideOpen, setGeminiGuideOpen] = useState(false);
  const [oauthBenefitOpen, setOauthBenefitOpen] = useState(false);
  const [pasteModalOpen, setPasteModalOpen] = useState(false);
  const [jsonInput, setJsonInput] = useState('');
  const [copiedPrompt, setCopiedPrompt] = useState<'copy' | 'share' | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const refreshLocalCounts = async () => {
    const [m, logs] = await Promise.all([loadDriveSyncMeta(), loadAllWorkoutLogs()]);
    setMeta(m);
    setLocalLogCount(logs.length);
    setApiKeyInput(m.geminiApiKey ?? '');
    setClientIdInput(m.googleClientId ?? '');
    if (m.geminiApiKey?.trim()) {
      setCoachWay('way2');
    }
  };

  useEffect(() => {
    void refreshLocalCounts();
  }, []);

  const effectiveClientId =
    clientIdInput.trim() ||
    meta.googleClientId?.trim() ||
    (import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined) ||
    '';

  const handleSaveClientId = async () => {
    setErrorMsg(null);
    const trimmed = clientIdInput.trim();
    const currentMeta = await loadDriveSyncMeta();
    const updatedMeta: DriveSyncMeta = {
      ...currentMeta,
      googleClientId: trimmed || undefined,
    };
    await saveDriveSyncMeta(updatedMeta);
    setMeta(updatedMeta);
    setClientIdSavedFlash(true);
    setStatusMsg(
      trimmed
        ? 'Saved Google OAuth Client ID locally. Tap Sync below — Prime will automatically create a dedicated Prime_Coach folder in your Google Drive.'
        : 'Cleared Google OAuth Client ID.',
    );
    window.setTimeout(() => setClientIdSavedFlash(false), 2500);
  };

  const savedApiKey = meta.geminiApiKey?.trim() || '';

  const hasSyncedDriveFiles = Boolean(
    meta.coachContextFileId &&
      meta.userProfileFileId &&
      meta.programConfigFileId &&
      meta.workoutLogFileId,
  );

  const appendNoteChip = (chip: string) => {
    setUserNote((prev) => {
      const trimmed = prev.trim();
      if (!trimmed) return chip;
      if (trimmed.toLowerCase().includes(chip.toLowerCase())) return prev;
      return `${trimmed}. ${chip}`;
    });
  };

  const buildCurrentPrompt = async (kind: 'plan' | 'assess', forceInlineContext: boolean) => {
    const [logs, assessments, bodyMetrics] = await Promise.all([
      loadAllWorkoutLogs(),
      loadAllPrimeAssessments(),
      loadAllBodyMetrics(),
    ]);
    const latestAssessment =
      assessments.length > 0 ? assessments[assessments.length - 1] : null;

    if (kind === 'plan') {
      return buildGeminiCoachPrompt({
        profile,
        config,
        logs,
        meta,
        latestAssessment,
        bodyMetrics,
        userNote,
        forceInlineContext,
      });
    }

    return buildGeminiAssessmentPrompt({
      profile,
      logs,
      bodyMetrics,
      meta,
      latestAssessment,
      userNote,
      forceInlineContext,
    });
  };

  const handleSaveApiKey = async () => {
    setErrorMsg(null);
    const trimmed = apiKeyInput.trim();
    const currentMeta = await loadDriveSyncMeta();
    const updatedMeta: DriveSyncMeta = {
      ...currentMeta,
      geminiApiKey: trimmed || undefined,
    };
    await saveDriveSyncMeta(updatedMeta);
    setMeta(updatedMeta);
    setKeySavedFlash(true);
    setStatusMsg(
      trimmed
        ? 'Saved Free Gemini API Key locally on this device (never uploaded to Google Drive). 1-Tap Auto-Gemini is ready!'
        : 'Removed local Gemini API Key.',
    );
    window.setTimeout(() => setKeySavedFlash(false), 2500);
  };

  // WAY 1A: Android Native Share Sheet -> Send straight to Gemini App (pre-fills new chat!)
  const handleSendToGeminiApp = async () => {
    setErrorMsg(null);
    try {
      const prompt = await buildCurrentPrompt(promptKind, false);
      if (navigator.share) {
        try {
          await navigator.share({
            title:
              promptKind === 'plan'
                ? 'Prime AI Coach — Upgrade My Plan'
                : 'Prime Fitness Assessor — Grade My Progress',
            text: prompt,
          });
          setCopiedPrompt('share');
          setStatusMsg(
            'Sent prompt via Share Sheet — pick Gemini, then tap Send to get your reply!',
          );
          window.setTimeout(() => setCopiedPrompt(null), 3000);
          return;
        } catch (shareErr) {
          if ((shareErr as Error).name === 'AbortError') return;
          // Fall through cleanly to copy + open web Gemini
        }
      }
      await navigator.clipboard.writeText(prompt);
      window.open('https://gemini.google.com/app', '_blank', 'noopener,noreferrer');
      setCopiedPrompt('copy');
      setStatusMsg(
        'Copied your prompt (including your note) and opened Gemini — paste and tap Send!',
      );
      window.setTimeout(() => setCopiedPrompt(null), 3000);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Could not share or copy prompt.');
    }
  };

  // WAY 1B: 1-Tap Copy Prompt & Open Free Gemini Web
  const handleCopyAndOpenGemini = async () => {
    setErrorMsg(null);
    try {
      const prompt = await buildCurrentPrompt(promptKind, false);
      await navigator.clipboard.writeText(prompt);
      setCopiedPrompt('copy');
      window.open('https://gemini.google.com/app', '_blank', 'noopener,noreferrer');
      setStatusMsg(
        `${promptKind === 'plan' ? 'Plan Upgrade' : 'Body Assessment'} prompt copied${userNote.trim() ? ' (with your personal note)' : ''} & opened Gemini! Paste and tap Send.`,
      );
      window.setTimeout(() => setCopiedPrompt(null), 3000);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Could not copy prompt to clipboard.');
    }
  };

  // WAY 2: 1-Tap Automatic In-App Gemini API (calls Free Flash API, auto-ingests JSON, opens Reading Window!)
  const handleRunInAppGemini = async (mode: 'plan' | 'assess') => {
    setErrorMsg(null);
    setStatusMsg(null);
    const activeKey = apiKeyInput.trim() || savedApiKey;
    if (!activeKey) {
      setErrorMsg(
        'Paste your free Gemini API key from https://aistudio.google.com/apikey first, then tap Save Key.',
      );
      return;
    }

    // Auto-save key if user typed it and tapped run right away
    if (activeKey !== savedApiKey) {
      const currentMeta = await loadDriveSyncMeta();
      const updatedMeta: DriveSyncMeta = { ...currentMeta, geminiApiKey: activeKey };
      await saveDriveSyncMeta(updatedMeta);
      setMeta(updatedMeta);
    }

    setRunningGeminiMode(mode);
    setShowRawJson(false);

    try {
      const prompt = await buildCurrentPrompt(mode, true);
      const res = await runInAppGeminiRequest({
        apiKey: activeKey,
        prompt,
        expectPlanJson: mode === 'plan',
      });

      const previousConfig = config;
      let appliedAutomatically = false;

      if (mode === 'plan' && res.parsedPlan) {
        await saveProgramConfig(res.parsedPlan);
        onConfigUpdated(res.parsedPlan);
        appliedAutomatically = true;
        setStatusMsg(
          `Gemini Coach Plan v${res.parsedPlan.meta.version} automatically ingested & applied!`,
        );
      } else if (mode === 'assess') {
        setStatusMsg(`Gemini Fitness Assessment ready (${res.modelUsed}).`);
      }

      const dialogState: GeminiDialogState = {
        mode,
        result: res,
        appliedAutomatically,
        previousConfig: appliedAutomatically ? previousConfig : null,
        undone: false,
      };
      setGeminiDialog(dialogState);
      setLastGeminiDialog(dialogState);
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'In-app Gemini request failed. Check your key & connection.',
      );
    } finally {
      setRunningGeminiMode(null);
    }
  };

  const handleUndoAutoPlan = async () => {
    if (!geminiDialog?.previousConfig) return;
    await saveProgramConfig(geminiDialog.previousConfig);
    onConfigUpdated(geminiDialog.previousConfig);
    const updated: GeminiDialogState = {
      ...geminiDialog,
      undone: true,
    };
    setGeminiDialog(updated);
    setLastGeminiDialog(updated);
    setStatusMsg(
      `Reverted to previous Plan v${geminiDialog.previousConfig.meta.version}.`,
    );
  };

  const applyParsedCoachJson = async (rawText: string) => {
    setErrorMsg(null);
    try {
      const previousConfig = config;
      const parsed = parseCoachJsonInput(rawText);
      await saveProgramConfig(parsed);
      onConfigUpdated(parsed);
      setPasteModalOpen(false);
      setJsonInput('');
      setStatusMsg(
        `Applied Gemini Coach Plan v${parsed.meta.version}: ${parsed.meta.coach_summary}`,
      );

      // Also open the clean reading window so users who pasted Gemini's full reply can read the advice too!
      const readableText = extractReadableGeminiSummary(rawText);
      const dialogState: GeminiDialogState = {
        mode: 'plan',
        result: {
          rawText,
          readableText,
          modelUsed: 'Imported Reply',
          parsedPlan: parsed,
          planParseError: null,
        },
        appliedAutomatically: true,
        previousConfig,
        undone: false,
      };
      setGeminiDialog(dialogState);
      setLastGeminiDialog(dialogState);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Invalid program_config.json format.');
    }
  };

  const handleOneTapPasteFromClipboard = async () => {
    setErrorMsg(null);
    try {
      const clipText = await navigator.clipboard.readText();
      await applyParsedCoachJson(clipText);
    } catch (err) {
      setPasteModalOpen(true);
      setErrorMsg(
        err instanceof Error
          ? `${err.message} — paste manually below.`
          : 'Clipboard access blocked — paste Gemini’s JSON below.',
      );
    }
  };

  const handleUploadJsonFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      await applyParsedCoachJson(text);
    } finally {
      e.target.value = '';
    }
  };

  const handleDriveSync = async () => {
    setErrorMsg(null);
    setStatusMsg(null);
    setSyncing(true);
    try {
      const token = await requestDriveAccessToken(effectiveClientId);
      const res = await syncWithCoachDrive(token);
      setMeta(res.meta);
      const updated = ProgramConfigSchema.parse(await loadProgramConfig());
      onConfigUpdated(updated);
      await refreshLocalCounts();
      setStatusMsg(
        res.coachUpdated
          ? `Synced & updated Prime plan + PRIME_COACH_CONTEXT.md (${res.totalCloudRows} cloud sets): ${res.coachSummary}`
          : `Synced to Prime_Coach on Google Drive (${res.totalCloudRows} cloud sets + PRIME_COACH_CONTEXT.md updated).`,
      );
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Google Drive sync failed.');
    } finally {
      setSyncing(false);
    }
  };

  const handleCompactLocal = async () => {
    setErrorMsg(null);
    const res = await compactLocalWorkoutStorage();
    await refreshLocalCounts();
    setStatusMsg(
      res.deleted > 0
        ? `Compacted local storage: removed ${res.deleted} entries older than 14 days (${res.remaining} recent entries kept).`
        : `Local database already compact (${res.remaining} entries from the last 14 days).`,
    );
  };

  const handleCheckUpdate = async () => {
    setErrorMsg(null);
    setCheckingUpdate(true);
    try {
      const res = await checkAppUpdateFromGitHub();
      setUpdateInfo(res);
      setStatusMsg(
        res.updateAvailable
          ? `New Prime APK v${res.latestVersion} is available on GitHub Releases!`
          : res.checkedOnline
            ? `You are up to date — running Prime v${res.currentVersion} (latest on GitHub: v${res.latestVersion}).`
            : `Checked GitHub Releases (${GITHUB_REPO}) — running Prime v${res.currentVersion}.`,
      );
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to check GitHub Releases.');
    } finally {
      setCheckingUpdate(false);
    }
  };

  const handleShareCsv = async () => {
    setErrorMsg(null);
    try {
      const logs = await loadAllWorkoutLogs();
      const csv = serializeWorkoutLogsToCsv(logs);
      const file = new File([csv], 'workout_log.csv', { type: 'text/csv' });

      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          title: 'Prime Workout Log',
          text: 'Offline workout_log.csv backup',
          files: [file],
        });
        setStatusMsg('Shared workout_log.csv via Share Sheet.');
      } else {
        const url = URL.createObjectURL(file);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'workout_log.csv';
        a.click();
        URL.revokeObjectURL(url);
        setStatusMsg('Downloaded offline backup workout_log.csv.');
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        setErrorMsg(err instanceof Error ? err.message : 'Failed to export CSV.');
      }
    }
  };

  const driveFolderUrl = getDriveFolderUrl(meta.folderId);
  const apkUrl = updateInfo?.apkDownloadUrl ?? getApkGitHubDownloadUrl();
  const releasesUrl = updateInfo?.releasesUrl ?? GITHUB_RELEASES_URL;

  return (
    <div className="space-y-4 pb-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">AI Coach &amp; Sync</h1>
        <p className="mt-1 text-sm text-slate-600">
          Pair Prime with Free Gemini AI coaching in 2 ways, back up to Google Drive (
          <code className="font-semibold text-blue-700">Prime_Coach</code>), and check for Android
          APK updates.
        </p>
      </div>

      {/* Seamless Free Gemini AI Coach Card */}
      <div className="rounded-2xl border border-blue-200 bg-white p-4 shadow-sm space-y-3.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 font-bold text-slate-900">
            <Bot className="h-5 w-5 text-blue-600" />
            <span>Free Gemini AI Coach</span>
          </div>
          <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-[10px] font-bold text-blue-700">
            {savedApiKey ? 'Auto API Ready' : hasSyncedDriveFiles ? 'Drive Links Ready' : '2 Free Ways'}
          </span>
        </div>

        {/* User Message / Complaints Box (Included in BOTH Way 1 & Way 2) */}
        <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <label
              htmlFor="gemini-user-note"
              className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-700"
            >
              <MessageSquarePlus className="h-3.5 w-3.5 text-blue-600" />
              Your Message or Complaints for Gemini (Optional)
            </label>
            {userNote.trim() && (
              <button
                type="button"
                onClick={() => setUserNote('')}
                className="text-[10px] font-bold text-slate-500 hover:text-rose-600"
              >
                Clear
              </button>
            )}
          </div>
          <textarea
            id="gemini-user-note"
            rows={2}
            value={userNote}
            onChange={(e) => setUserNote(e.target.value)}
            placeholder='e.g. "Left shoulder feels tight on push-ups, legs feel too easy, only have 20 min this week..."'
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 outline-none focus:border-blue-600"
          />
          <div className="flex flex-wrap gap-1.5">
            {QUICK_NOTE_CHIPS.map((chip) => (
              <button
                key={chip}
                type="button"
                onClick={() => appendNoteChip(chip)}
                className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-semibold text-slate-600 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
              >
                + {chip}
              </button>
            ))}
          </div>
          <p className="text-[10px] text-slate-500">
            Automatically embedded into every Plan Upgrade &amp; Body Assessment prompt below.
          </p>
        </div>

        {/* 2-Way Free Gemini Mode Selector */}
        <div className="grid grid-cols-2 gap-1.5 rounded-xl bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => setCoachWay('way1')}
            className={`rounded-lg py-2 px-2 text-center text-[11px] font-bold transition ${
              coachWay === 'way1'
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-800'
            }`}
          >
            <div>Way 1 · Gemini App / Web</div>
            <div className="text-[9.5px] font-medium opacity-75">Zero API key needed</div>
          </button>
          <button
            type="button"
            onClick={() => setCoachWay('way2')}
            className={`rounded-lg py-2 px-2 text-center text-[11px] font-bold transition ${
              coachWay === 'way2'
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-800'
            }`}
          >
            <div className="flex items-center justify-center gap-1">
              <Zap className="h-3 w-3 text-amber-500" />
              Way 2 · 1-Tap Auto
            </div>
            <div className="text-[9.5px] font-medium opacity-75">
              {savedApiKey ? 'Free Key Saved' : 'Free API Key · In-App'}
            </div>
          </button>
        </div>

        {/* WAY 1: Free Gemini App / Web (Zero API Key) */}
        {coachWay === 'way1' && (
          <div className="space-y-2.5 rounded-xl border border-slate-200/80 bg-slate-50/50 p-3">
            {/* Prompt Type Selector */}
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => setPromptKind('plan')}
                className={`rounded-xl border px-2.5 py-2 text-left transition ${
                  promptKind === 'plan'
                    ? 'border-blue-600 bg-blue-50 text-blue-900'
                    : 'border-slate-200 bg-white text-slate-600'
                }`}
              >
                <div className="text-xs font-bold">1. Upgrade My Plan</div>
                <div className="text-[10px] opacity-80">Returns updated JSON plan</div>
              </button>
              <button
                type="button"
                onClick={() => setPromptKind('assess')}
                className={`rounded-xl border px-2.5 py-2 text-left transition ${
                  promptKind === 'assess'
                    ? 'border-blue-600 bg-blue-50 text-blue-900'
                    : 'border-slate-200 bg-white text-slate-600'
                }`}
              >
                <div className="text-xs font-bold">2. Assess My Body</div>
                <div className="text-[10px] opacity-80">Grades weight, tape &amp; logs</div>
              </button>
            </div>

            {/* 1-Tap Send to Gemini App + Copy & Open Web */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => void handleSendToGeminiApp()}
                className="flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 py-3 px-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700"
              >
                {copiedPrompt === 'share' ? (
                  <>
                    <ClipboardCheck className="h-4 w-4" /> Shared!
                  </>
                ) : (
                  <>
                    <Share2 className="h-4 w-4" /> Send to Gemini App
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => void handleCopyAndOpenGemini()}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-blue-600 bg-white py-3 px-2 text-xs font-bold text-blue-700 hover:bg-blue-50"
              >
                {copiedPrompt === 'copy' ? (
                  <>
                    <ClipboardCheck className="h-4 w-4" /> Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" /> Copy &amp; Open Web
                  </>
                )}
              </button>
            </div>

            {/* Import Reply Back Into Prime */}
            <div className="space-y-1.5 border-t border-slate-200/80 pt-2.5">
              <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                Bring Gemini&apos;s Reply Back Into Prime (Auto-Strips Prose &amp; Captures JSON)
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => void handleOneTapPasteFromClipboard()}
                  className="flex items-center justify-center gap-1 rounded-xl border border-emerald-200 bg-emerald-50 py-2.5 text-[11px] font-bold text-emerald-800 hover:bg-emerald-100"
                >
                  <ClipboardPaste className="h-3.5 w-3.5" />
                  Paste &amp; Apply
                </button>
                <button
                  type="button"
                  onClick={() => setPasteModalOpen(true)}
                  className="flex items-center justify-center gap-1 rounded-xl border border-slate-200 bg-white py-2.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-100"
                >
                  <FileUp className="h-3.5 w-3.5 text-blue-600" />
                  Manual Paste
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center justify-center gap-1 rounded-xl border border-slate-200 bg-white py-2.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-100"
                >
                  <Upload className="h-3.5 w-3.5 text-blue-600" />
                  Upload .json
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json,application/json"
                  onChange={(e) => void handleUploadJsonFile(e)}
                  className="hidden"
                />
              </div>
            </div>
          </div>
        )}

        {/* WAY 2: 1-Tap Automatic In-App Gemini (Free API Key) */}
        {coachWay === 'way2' && (
          <div className="space-y-3 rounded-xl border border-blue-200/80 bg-blue-50/40 p-3">
            {/* Inline Free API Key Input */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-800">
                  <KeyRound className="h-3.5 w-3.5 text-blue-600" />
                  Free Gemini API Key (Stored Locally Only)
                </label>
                <a
                  href="https://aistudio.google.com/apikey"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-700 hover:underline"
                >
                  Get Free Key <ExternalLink className="h-2.5 w-2.5" />
                </a>
              </div>
              <div className="flex gap-1.5">
                <div className="relative flex-1">
                  <input
                    type={showApiKey ? 'text' : 'password'}
                    value={apiKeyInput}
                    onChange={(e) => setApiKeyInput(e.target.value)}
                    placeholder="Paste free key (AIza...)"
                    className="w-full rounded-xl border border-slate-300 bg-white py-2 pl-3 pr-9 font-mono text-xs text-slate-900 outline-none focus:border-blue-600"
                  />
                  <button
                    type="button"
                    aria-label={showApiKey ? 'Hide API key' : 'Show API key'}
                    onClick={() => setShowApiKey((v) => !v)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showApiKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => void handleSaveApiKey()}
                  className="shrink-0 rounded-xl border border-blue-600 bg-white px-3 py-2 text-xs font-bold text-blue-700 hover:bg-blue-50"
                >
                  {keySavedFlash ? 'Saved!' : 'Save Key'}
                </button>
              </div>
              <p className="text-[10px] leading-relaxed text-slate-500">
                100% free tier via Google AI Studio (no credit card). Stored privately in your
                device DB — never uploaded to Google Drive.
              </p>
            </div>

            {/* 1-Tap Auto-Run Buttons */}
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <button
                type="button"
                disabled={runningGeminiMode !== null}
                onClick={() => void handleRunInAppGemini('plan')}
                className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 px-3 text-xs font-bold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
              >
                {runningGeminiMode === 'plan' ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Running Gemini Coach...
                  </>
                ) : (
                  <>
                    <Send className="h-3.5 w-3.5" /> 1-Tap Auto-Upgrade Plan
                  </>
                )}
              </button>
              <button
                type="button"
                disabled={runningGeminiMode !== null}
                onClick={() => void handleRunInAppGemini('assess')}
                className="flex items-center justify-center gap-2 rounded-xl border border-blue-600 bg-white py-3 px-3 text-xs font-bold text-blue-700 hover:bg-blue-50 disabled:opacity-50"
              >
                {runningGeminiMode === 'assess' ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Assessing Progress...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3.5 w-3.5" /> 1-Tap Auto-Assess Body
                  </>
                )}
              </button>
            </div>

            <div className="rounded-lg border border-blue-200/70 bg-white/80 px-2.5 py-2 text-[10.5px] leading-relaxed text-slate-600">
              <strong className="text-blue-800">What happens when you tap:</strong> Prime sends
              your full logs, metric body measurements &amp; note straight to Gemini, opens an{' '}
              <strong>In-App Reading Window</strong> with Gemini&apos;s coaching reply, and{' '}
              <strong>automatically ingests &amp; applies</strong> the validated JSON plan (with
              1-tap Undo).
            </div>
          </div>
        )}

        {/* Re-open Last Gemini Reply Window Button */}
        {lastGeminiDialog && (
          <button
            type="button"
            onClick={() => setGeminiDialog(lastGeminiDialog)}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50/70 py-2 text-xs font-bold text-blue-800 hover:bg-blue-100"
          >
            <BookOpen className="h-3.5 w-3.5" />
            Read Last Gemini {lastGeminiDialog.mode === 'plan' ? 'Coach Reply' : 'Body Assessment'}
          </button>
        )}

        {/* Collapsible Dynamic Step-by-Step Guide (Adapts to Selected Way 1 or Way 2) */}
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50/80">
          <button
            type="button"
            onClick={() => setGeminiGuideOpen((v) => !v)}
            className="flex w-full items-center justify-between px-3 py-2.5 text-left text-xs font-bold text-slate-800 hover:bg-slate-100/70"
          >
            <span>
              {coachWay === 'way1'
                ? 'How to Use Way 1: Free Gemini App / Web (4 Steps)'
                : 'How to Use Way 2: 1-Tap Auto In-App Gemini (5 Steps)'}
            </span>
            {geminiGuideOpen ? (
              <ChevronUp className="h-4 w-4 text-slate-400" />
            ) : (
              <ChevronDown className="h-4 w-4 text-slate-400" />
            )}
          </button>
          {geminiGuideOpen && (
            <div className="border-t border-slate-200 bg-white px-3.5 py-3 text-[11px] leading-relaxed text-slate-700">
              {coachWay === 'way1' ? (
                <ol className="list-decimal space-y-1.5 pl-4">
                  <li>
                    <em>(Optional)</em> Type any complaints, sore joints, or goals in the{' '}
                    <strong>Message or Complaints</strong> box above.
                  </li>
                  <li>
                    Select <strong>Upgrade My Plan</strong> or <strong>Assess My Body</strong>,
                    then tap <strong>Send to Gemini App</strong> (choose <strong>Gemini</strong> in
                    Android&apos;s Share menu to pre-fill a fresh chat) — or tap{' '}
                    <strong>Copy &amp; Open Web</strong> (
                    <span className="font-mono text-blue-700">https://gemini.google.com/app</span>).
                  </li>
                  <li>
                    Tap <strong>Send</strong> in Gemini and read your personalized advice.
                  </li>
                  <li>
                    <em>(For Plan Upgrades)</em> Copy Gemini&apos;s full reply (even if it&apos;s
                    plain text with JSON inside — no file needed!) and tap{' '}
                    <strong>Paste &amp; Apply</strong> in Prime.
                  </li>
                </ol>
              ) : (
                <ol className="list-decimal space-y-1.5 pl-4">
                  <li>
                    Open{' '}
                    <span className="font-mono text-blue-700">
                      https://aistudio.google.com/apikey
                    </span>{' '}
                    and sign in with your Google account.
                  </li>
                  <li>
                    Tap <strong>Create API key</strong> (free tier — no credit card required) and
                    copy the key starting with <code>AIza...</code>.
                  </li>
                  <li>
                    Paste your key into the <strong>Free Gemini API Key</strong> box above (or in{' '}
                    <strong>Settings</strong>) and tap <strong>Save Key</strong>. It stays strictly
                    on your device and is never synced to Drive.
                  </li>
                  <li>
                    <em>(Optional)</em> Add any complaints or notes in the message box, then tap{' '}
                    <strong>1-Tap Auto-Upgrade Plan</strong> or{' '}
                    <strong>1-Tap Auto-Assess Body</strong>.
                  </li>
                  <li>
                    Wait a few seconds — Prime opens a centered <strong>Reading Window</strong>{' '}
                    showing Gemini&apos;s advice AND automatically captures &amp; applies the
                    updated JSON plan (whether raw JSON or plaintext) with a 1-tap{' '}
                    <strong>Undo</strong> button.
                  </li>
                </ol>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Google Drive Sync Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-slate-900">
            <Cloud className="h-5 w-5 text-blue-600" />
            Google Drive Cloud Sync (Optional)
          </div>
          <span className="text-xs text-slate-500">
            {meta.lastSyncedAt ? `Last: ${new Date(meta.lastSyncedAt).toLocaleDateString()}` : 'Offline only'}
          </span>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-700 space-y-1">
          <div>
            Drive Folder: <span className="font-mono font-semibold text-blue-800">Prime_Coach</span>{' '}
            <span className="text-[10px] text-slate-500">
              {meta.folderId
                ? '(Connected to your Drive)'
                : '(Auto-created in your Drive on first sync)'}
            </span>
          </div>
          <div>
            Phase: <span className="font-mono text-blue-700">{config.meta.active_phase}</span> · Local DB:{' '}
            <strong>{localLogCount}</strong> recent sets
            {typeof meta.archivedLogCount === 'number' && meta.archivedLogCount > 0
              ? ` · ${meta.archivedLogCount} archived in Drive`
              : ''}
          </div>
        </div>

        {/* Inline Google OAuth Client ID Input (Synced with Settings) */}
        <div className="space-y-1.5 rounded-xl border border-slate-200 bg-slate-50/70 p-2.5">
          <label
            htmlFor="sync-oauth-client-id"
            className="block text-[11px] font-bold text-slate-800"
          >
            Google OAuth Client ID (Optional)
          </label>
          <div className="flex gap-1.5">
            <input
              id="sync-oauth-client-id"
              type="text"
              placeholder="xxxx.apps.googleusercontent.com"
              value={clientIdInput}
              onChange={(e) => setClientIdInput(e.target.value)}
              className="flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2 font-mono text-xs text-slate-900 outline-none focus:border-blue-600"
            />
            <button
              type="button"
              onClick={() => void handleSaveClientId()}
              className="shrink-0 rounded-xl border border-blue-600 bg-white px-3 py-2 text-xs font-bold text-blue-700 hover:bg-blue-50"
            >
              {clientIdSavedFlash ? 'Saved!' : 'Save ID'}
            </button>
          </div>
          <p className="text-[10px] leading-relaxed text-slate-500">
            No manual folder setup needed — on first sync, Prime automatically creates a dedicated{' '}
            <code>Prime_Coach</code> folder inside your own Google Drive.
          </p>
        </div>

        {/* Why connect Google OAuth collapsible */}
        <div className="overflow-hidden rounded-xl border border-blue-100 bg-blue-50/50">
          <button
            type="button"
            onClick={() => setOauthBenefitOpen((v) => !v)}
            className="flex w-full items-center justify-between px-3 py-2 text-left text-xs font-bold text-blue-800"
          >
            <span>Why connect Google OAuth? (3 Optional Benefits)</span>
            {oauthBenefitOpen ? (
              <ChevronUp className="h-4 w-4 text-blue-600" />
            ) : (
              <ChevronDown className="h-4 w-4 text-blue-600" />
            )}
          </button>
          {oauthBenefitOpen && (
            <ul className="list-disc space-y-1 border-t border-blue-100 bg-white px-7 py-2.5 text-[11px] leading-relaxed text-slate-700">
              <li>
                <strong>Private Cloud Backup:</strong> Saves your profile, workout history, body
                measurements, and Prime scores to your own Google Drive so you never lose data when
                switching phones.
              </li>
              <li>
                <strong>Seamless Drive File Links:</strong> Auto-updates{' '}
                <code>PRIME_COACH_CONTEXT.md</code>, <code>body_metrics.csv</code>, and your logs in
                Drive so Way 1 Gemini gets direct file links automatically.
              </li>
              <li>
                <strong>Zero Manual Folder Setup:</strong> Prime automatically creates its own{' '}
                <code>Prime_Coach</code> folder inside your personal Google Drive on first sync.
              </li>
            </ul>
          )}
        </div>

        {!effectiveClientId && <OAuthGuideAccordion />}

        <button
          type="button"
          disabled={syncing || !effectiveClientId}
          onClick={() => void handleDriveSync()}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3.5 text-sm font-bold text-white shadow-sm hover:bg-blue-700 disabled:opacity-40"
        >
          <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
          {syncing ? 'Syncing & Updating Coach Context...' : 'Sync Logs & Coach Context (Drive)'}
        </button>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void handleCompactLocal()}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
          >
            <Trash2 className="h-3.5 w-3.5 text-blue-600" />
            Compact Local (&gt;14d)
          </button>
          <a
            href={driveFolderUrl}
            target="_blank"
            rel="noreferrer"
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 py-2.5 text-xs font-semibold text-blue-700 hover:bg-blue-100"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Open Drive Folder
          </a>
        </div>
      </div>

      {/* Android APK Updates Card (GitHub Releases — Zero Login Needed) */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-slate-900">
            <HardDriveDownload className="h-5 w-5 text-blue-600" />
            Android APK Updates (GitHub)
          </div>
          <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-bold text-blue-700">
            v{APP_VERSION} (b{APP_BUILD_NUMBER})
          </span>
        </div>

        <p className="text-xs text-slate-600">
          Official <code className="font-mono text-slate-800">Prime-latest.apk</code> releases are
          hosted on GitHub Releases (<span className="font-mono text-blue-700">{GITHUB_REPO}</span>)
          — check and download with zero login needed.
        </p>

        <div className="flex gap-2">
          <button
            type="button"
            disabled={checkingUpdate}
            onClick={() => void handleCheckUpdate()}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-blue-600 py-2.5 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${checkingUpdate ? 'animate-spin' : ''}`} />
            {checkingUpdate ? 'Checking...' : 'Check GitHub Updates'}
          </button>
          <a
            href={apkUrl}
            target="_blank"
            rel="noreferrer"
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 py-2.5 text-xs font-bold text-blue-700 hover:bg-blue-100"
          >
            <Download className="h-3.5 w-3.5" />
            Download Latest APK
          </a>
        </div>

        <a
          href={releasesUrl}
          target="_blank"
          rel="noreferrer"
          className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 py-2 text-[11px] font-semibold text-slate-700 hover:bg-slate-100"
        >
          <ExternalLink className="h-3 w-3 text-blue-600" />
          View All Releases on GitHub
        </a>

        {updateInfo && (
          <div className="rounded-xl border border-blue-100 bg-blue-50/70 p-2.5 text-xs text-slate-700">
            <div className="font-semibold text-blue-900">
              Latest on GitHub: v{updateInfo.latestVersion}
              {updateInfo.updateAvailable ? ' — New version ready!' : ' (Up to date)'}
            </div>
            <div className="mt-0.5 text-[11px] text-slate-600">{updateInfo.notes}</div>
          </div>
        )}
      </div>

      {/* Quiet Secondary Offline CSV Backup */}
      <div className="flex items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-xs">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
            <FileSpreadsheet className="h-3.5 w-3.5 text-slate-500" />
            <span>Offline Backup (CSV)</span>
            <TermHint termId="export_csv" />
          </div>
          <div className="text-[11px] text-slate-500">
            {hasSyncedDriveFiles
              ? 'Optional — your logs are already synced to Google Drive.'
              : 'For Excel/Sheets or uploading to Gemini without OAuth.'}
          </div>
        </div>
        <button
          type="button"
          onClick={() => void handleShareCsv()}
          className="shrink-0 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
        >
          Export CSV
        </button>
      </div>

      {statusMsg && (
        <div className="flex items-start gap-2 rounded-xl border border-blue-200 bg-blue-50 p-3 text-xs text-blue-900">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
          <span>{statusMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Portal-Centered Manual Paste Modal */}
      {pasteModalOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-xs"
            onClick={() => setPasteModalOpen(false)}
          >
            <div
              className="w-full max-w-md space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-slate-900">Paste Gemini Coach Reply</h2>
                <button
                  type="button"
                  aria-label="Close"
                  onClick={() => setPasteModalOpen(false)}
                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <p className="text-xs text-slate-500">
                Paste Gemini&apos;s entire reply (prose + plaintext JSON) or just the{' '}
                <code>program_config.json</code> block — Prime automatically extracts, validates,
                and displays the coaching summary.
              </p>
              <textarea
                rows={8}
                value={jsonInput}
                onChange={(e) => setJsonInput(e.target.value)}
                placeholder='Paste Gemini reply or {"meta": ...}'
                className="w-full rounded-xl border border-slate-300 bg-slate-50 p-3 font-mono text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPasteModalOpen(false)}
                  className="flex-1 rounded-xl border border-slate-200 bg-slate-50 py-2.5 text-sm font-semibold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void applyParsedCoachJson(jsonInput)}
                  className="flex-1 rounded-xl bg-blue-600 py-2.5 text-sm font-bold text-white"
                >
                  Validate &amp; Apply
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}

      {/* Portal-Centered In-App Gemini Response Reading Window */}
      {geminiDialog &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs"
            onClick={() => setGeminiDialog(null)}
          >
            <div
              className="flex max-h-[85dvh] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-blue-200 bg-white shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between gap-2 border-b border-slate-100 bg-blue-50/70 px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-600 text-white">
                    <Bot className="h-4 w-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-extrabold text-slate-900">
                      {geminiDialog.mode === 'plan'
                        ? 'Gemini AI Coach Reply'
                        : 'Gemini Fitness Assessment'}
                    </h2>
                    <div className="text-[10px] font-semibold text-blue-700">
                      Model: {geminiDialog.result.modelUsed}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  aria-label="Close Gemini reply"
                  onClick={() => setGeminiDialog(null)}
                  className="rounded-lg p-1 text-slate-400 hover:bg-white hover:text-slate-700"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Scrollable Body */}
              <div className="flex-1 space-y-3 overflow-y-auto p-4">
                {/* Auto-Ingest Plan Status Banner */}
                {geminiDialog.mode === 'plan' && geminiDialog.result.parsedPlan && (
                  <div
                    className={`rounded-xl border p-3 text-xs space-y-2 ${
                      geminiDialog.undone
                        ? 'border-amber-200 bg-amber-50 text-amber-900'
                        : 'border-emerald-200 bg-emerald-50 text-emerald-950'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 font-extrabold">
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                        <span>
                          {geminiDialog.undone
                            ? `Reverted to Plan v${geminiDialog.previousConfig?.meta.version}`
                            : `Plan v${geminiDialog.result.parsedPlan.meta.version} Applied Automatically!`}
                        </span>
                      </div>
                      {geminiDialog.previousConfig && !geminiDialog.undone && (
                        <button
                          type="button"
                          onClick={() => void handleUndoAutoPlan()}
                          className="inline-flex items-center gap-1 rounded-lg border border-emerald-300 bg-white px-2 py-1 text-[10px] font-bold text-emerald-800 hover:bg-emerald-100"
                        >
                          <RotateCcw className="h-3 w-3" />
                          Undo
                        </button>
                      )}
                    </div>
                    <div className="text-[11px] leading-relaxed opacity-90">
                      <strong>Phase:</strong> {geminiDialog.result.parsedPlan.meta.active_phase}
                      <br />
                      <strong>Summary:</strong> {geminiDialog.result.parsedPlan.meta.coach_summary}
                    </div>
                  </div>
                )}

                {geminiDialog.mode === 'plan' && geminiDialog.result.planParseError && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 space-y-1">
                    <div className="flex items-center gap-1.5 font-bold">
                      <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
                      Plan JSON Not Auto-Applied
                    </div>
                    <p className="text-[11px] leading-relaxed">
                      {geminiDialog.result.planParseError}
                    </p>
                    <p className="text-[10px] text-amber-800">
                      Your existing plan was kept safe. You can inspect the raw reply below or tap
                      Auto-Upgrade Plan again.
                    </p>
                  </div>
                )}

                {/* Clean Plain-English Coaching Summary / Assessment */}
                <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
                  <FormattedGeminiText text={geminiDialog.result.readableText} />
                </div>

                {/* Optional Raw JSON / Full Output Inspector */}
                {showRawJson && (
                  <div className="space-y-1">
                    <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                      Raw Gemini Output / Captured JSON
                    </div>
                    <pre className="max-h-48 overflow-auto rounded-xl border border-slate-200 bg-slate-900 p-3 font-mono text-[10px] leading-relaxed text-teal-200">
                      {geminiDialog.result.parsedPlan
                        ? JSON.stringify(geminiDialog.result.parsedPlan, null, 2)
                        : geminiDialog.result.rawText}
                    </pre>
                  </div>
                )}
              </div>

              {/* Footer Actions */}
              <div className="flex items-center gap-2 border-t border-slate-100 bg-slate-50 px-4 py-3">
                <button
                  type="button"
                  onClick={() => setShowRawJson((v) => !v)}
                  className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-[11px] font-semibold text-slate-700 hover:bg-slate-100"
                >
                  <Code2 className="h-3.5 w-3.5 text-blue-600" />
                  {showRawJson ? 'Hide JSON' : 'Raw JSON'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    void navigator.clipboard.writeText(geminiDialog.result.readableText);
                    setCopiedReply(true);
                    window.setTimeout(() => setCopiedReply(false), 2000);
                  }}
                  className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-[11px] font-semibold text-slate-700 hover:bg-slate-100"
                >
                  {copiedReply ? (
                    <>
                      <ClipboardCheck className="h-3.5 w-3.5 text-emerald-600" /> Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5 text-blue-600" /> Copy Text
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setGeminiDialog(null)}
                  className="ml-auto flex-1 rounded-xl bg-blue-600 py-2 text-xs font-bold text-white hover:bg-blue-700"
                >
                  Done
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
