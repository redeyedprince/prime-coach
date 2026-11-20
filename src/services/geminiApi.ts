import { parseCoachJsonInput } from '../engine/coachPrompt';
import type { ProgramConfig } from '../types/schemas';

export interface InAppGeminiResult {
  rawText: string;
  readableText: string;
  modelUsed: string;
  parsedPlan: ProgramConfig | null;
  planParseError: string | null;
}

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

const GEMINI_MODELS = ['gemini-2.5-flash', 'gemini-2.0-flash'];

/**
 * Calls Google's official Free-Tier Gemini API directly from the device using the
 * user's own optional API key (aistudio.google.com/apikey).
 * Automatically captures & validates any returned ProgramConfig JSON (whether
 * raw JSON or embedded inside markdown plaintext).
 */
export async function runInAppGeminiRequest(params: {
  apiKey: string;
  prompt: string;
  expectPlanJson: boolean;
}): Promise<InAppGeminiResult> {
  const trimmedKey = params.apiKey.trim();
  if (!trimmedKey) {
    throw new Error('Enter your free Gemini API key first (from aistudio.google.com/apikey).');
  }

  let lastError = 'Gemini API request failed.';

  for (const model of GEMINI_MODELS) {
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
      if (res.status === 404 || res.status === 429) {
        continue; // fallback to next free-tier Gemini Flash model
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
