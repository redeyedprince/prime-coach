import { parseCoachJsonInput } from '../engine/coachPrompt';
import type { ProgramConfig } from '../types/schemas';

export interface InAppGeminiResult {
  rawText: string;
  readableText: string;
  modelUsed: string;
  parsedPlan: ProgramConfig | null;
  planParseError: string | null;
}

export interface DiscoveredGeminiModel {
  id: string;
  displayName: string;
}

const FALLBACK_MODELS = ['gemini-2.5-flash', 'gemini-2.0-flash'];
const MODEL_CACHE_KEY = 'prime_gemini_models_cache_v1';
const MODEL_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * Strips raw JSON code fences OR bare top-level program_config JSON objects
 * from Gemini's coaching reply so the user sees a clean, human-readable
 * coaching summary or fitness assessment in the reading window.
 */
export function extractReadableGeminiSummary(rawText: string): string {
  let cleaned = rawText.replace(/```(?:json)?\s*[\s\S]*?```/gi, '');

  // Also strip any bare un-fenced top-level ProgramConfig JSON blob if Gemini omitted backticks
  const spansToRemove: Array<[number, number]> = [];
  let depth = 0;
  let start = -1;
  let inStr = false;
  let esc = false;

  for (let i = 0; i < cleaned.length; i += 1) {
    const ch = cleaned[i];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === '\\') esc = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') {
      inStr = true;
    } else if (ch === '{') {
      if (depth === 0) start = i;
      depth += 1;
    } else if (ch === '}' && depth > 0) {
      depth -= 1;
      if (depth === 0 && start !== -1) {
        const snippet = cleaned.slice(start, i + 1);
        if (snippet.includes('"movement_tracks"') && snippet.includes('"weekly_split"')) {
          spansToRemove.push([start, i + 1]);
        }
        start = -1;
      }
    }
  }

  for (let i = spansToRemove.length - 1; i >= 0; i -= 1) {
    const [s, e] = spansToRemove[i];
    cleaned = `${cleaned.slice(0, s)}\n${cleaned.slice(e)}`;
  }

  cleaned = cleaned.replace(/\n{3,}/g, '\n\n').trim();
  if (cleaned.length > 0) {
    return cleaned;
  }
  return 'Gemini returned an updated training plan JSON cleanly without extra commentary.';
}

/**
 * Scores & ranks Gemini models dynamically from Google's live /v1beta/models catalog
 * so future releases (e.g. gemini-3.8-flash, gemini-4-*, etc.) are automatically
 * prioritized without hardcoding future model names.
 */
export function rankGeminiModels(
  rawModels: Array<{
    name?: string;
    displayName?: string;
    supportedGenerationMethods?: string[];
  }>,
): DiscoveredGeminiModel[] {
  const excludedPattern =
    /embedding|aqa|imagen|veo|lyria|tts|audio|live|robotics|computer-use|deep-research|gemma/i;

  const scored = rawModels
    .filter((m) => {
      const id = (m.name ?? '').replace(/^models\//, '');
      if (!id.toLowerCase().startsWith('gemini-')) return false;
      if (!m.supportedGenerationMethods?.includes('generateContent')) return false;
      if (excludedPattern.test(id)) return false;
      return true;
    })
    .map((m) => {
      const id = (m.name ?? '').replace(/^models\//, '');
      const lower = id.toLowerCase();

      // Extract version numbers e.g. gemini-3.8-flash -> [3, 8], gemini-4-hydrogen -> [4, 0]
      const verMatch = lower.match(/^gemini-(\d+)(?:\.(\d+))?/);
      const major = verMatch ? Number.parseInt(verMatch[1], 10) : 1;
      const minor = verMatch?.[2] ? Number.parseInt(verMatch[2], 10) : 0;

      // Prefer free-tier-friendly Flash / general text models over heavy Pro/Ultra or preview/exp
      const isFlash = lower.includes('flash') && !lower.includes('lite');
      const isFlashLite = lower.includes('flash-lite');
      const isPro = /\bpro\b/i.test(lower);
      const isPreviewOrExp = /preview|exp|-00\d$|latest/i.test(lower);

      const tierScore = isFlash ? 40 : isFlashLite ? 25 : !isPro ? 30 : 10;
      const stabilityBonus = isPreviewOrExp ? -8 : 12;
      const score = major * 1000 + minor * 100 + tierScore + stabilityBonus;

      return {
        id,
        displayName: m.displayName?.trim() || id,
        score,
      };
    })
    .sort((a, b) => b.score - a.score);

  const deduped: DiscoveredGeminiModel[] = [];
  const seen = new Set<string>();
  for (const item of scored) {
    if (!seen.has(item.id)) {
      seen.add(item.id);
      deduped.push({ id: item.id, displayName: item.displayName });
    }
  }
  return deduped;
}

/**
 * Fetches and caches (24h) the live list of available generateContent Gemini models
 * for this user's API key.
 */
export async function discoverAvailableGeminiModels(
  apiKey: string,
  forceRefresh = false,
): Promise<DiscoveredGeminiModel[]> {
  const trimmedKey = apiKey.trim();
  if (!trimmedKey) return [];

  if (!forceRefresh && typeof localStorage !== 'undefined') {
    try {
      const raw = localStorage.getItem(MODEL_CACHE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as {
          savedAt: number;
          models: DiscoveredGeminiModel[];
        };
        if (
          Date.now() - parsed.savedAt < MODEL_CACHE_TTL_MS &&
          Array.isArray(parsed.models) &&
          parsed.models.length > 0
        ) {
          return parsed.models;
        }
      }
    } catch {
      // ignore storage errors
    }
  }

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(trimmedKey)}`,
    );
    if (!res.ok) return [];
    const data = (await res.json()) as {
      models?: Array<{
        name?: string;
        displayName?: string;
        supportedGenerationMethods?: string[];
      }>;
    };
    const ranked = rankGeminiModels(data.models ?? []);
    if (ranked.length > 0 && typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(
          MODEL_CACHE_KEY,
          JSON.stringify({ savedAt: Date.now(), models: ranked }),
        );
      } catch {
        // ignore storage quota
      }
    }
    return ranked;
  } catch {
    return [];
  }
}

/**
 * Calls Google's official Free-Tier Gemini API directly from the device using the
 * user's own optional API key (aistudio.google.com/apikey).
 * Automatically discovers the newest available free model from Google's live
 * catalog and falls back seamlessly if a model hits quota/deprecation.
 */
export async function runInAppGeminiRequest(params: {
  apiKey: string;
  prompt: string;
  expectPlanJson: boolean;
  preferredModel?: string;
}): Promise<InAppGeminiResult> {
  const trimmedKey = params.apiKey.trim();
  if (!trimmedKey) {
    throw new Error('Enter your free Gemini API key first (from aistudio.google.com/apikey).');
  }

  const discovered = await discoverAvailableGeminiModels(trimmedKey, false);
  const candidateIds: string[] = [];
  if (params.preferredModel && params.preferredModel !== 'auto') {
    candidateIds.push(params.preferredModel);
  }
  for (const m of discovered) {
    if (!candidateIds.includes(m.id)) candidateIds.push(m.id);
  }
  for (const fb of FALLBACK_MODELS) {
    if (!candidateIds.includes(fb)) candidateIds.push(fb);
  }

  let lastError = 'Gemini API request failed.';

  for (const model of candidateIds.slice(0, 6)) {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(trimmedKey)}`;
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: params.prompt }] }],
        generationConfig: {
          temperature: 0.4,
        },
      }),
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      lastError = `Gemini API (${model}) returned ${res.status}: ${errBody.slice(0, 220)}`;
      if (res.status === 404 || res.status === 429 || res.status === 400) {
        continue; // fallback to next available model
      }
      throw new Error(lastError);
    }

    const data = (await res.json()) as {
      candidates?: Array<{
        content?: { parts?: Array<{ text?: string }> };
      }>;
    };

    const rawText =
      data.candidates?.[0]?.content?.parts
        ?.map((p) => p.text ?? '')
        .join('\n')
        .trim() ?? '';

    if (!rawText) {
      throw new Error('Gemini returned an empty response. Please try again.');
    }

    const readableText = extractReadableGeminiSummary(rawText);
    let parsedPlan: ProgramConfig | null = null;
    let planParseError: string | null = null;

    if (params.expectPlanJson) {
      try {
        parsedPlan = parseCoachJsonInput(rawText);
      } catch (err) {
        planParseError =
          err instanceof Error
            ? err.message
            : 'Could not extract a valid program_config.json from Gemini response.';
      }
    }

    return {
      rawText,
      readableText,
      modelUsed: model,
      parsedPlan,
      planParseError,
    };
  }

  throw new Error(lastError);
}
