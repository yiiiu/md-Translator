import { v4 as uuidv4 } from "uuid";
import { TranslateParagraph, TranslationResult } from "./engines/types";
import { OpenAIEngine } from "./engines/openai";
import { getCached, setCache } from "./cache";
import { createTask, updateTaskProgress } from "./db";

export interface TranslateRequest {
  engine: string;
  target_lang: string;
  mode: "full" | "lazy";
  paragraphs: TranslateParagraph[];
}

export interface SSEEvent {
  paragraph_id?: string;
  status?: "translating" | "done" | "error";
  translated?: string;
  error?: string;
  type?: "complete";
}

const GROUP_SIZE = 4;
const TIMEOUT_MS = 30000;

function groupParagraphs(paragraphs: TranslateParagraph[]): TranslateParagraph[][] {
  const groups: TranslateParagraph[][] = [];
  for (let i = 0; i < paragraphs.length; i += GROUP_SIZE) {
    groups.push(paragraphs.slice(i, i + GROUP_SIZE));
  }
  return groups;
}

export async function* translateStream(
  request: TranslateRequest
): AsyncGenerator<SSEEvent> {
  const { engine: engineId, target_lang, paragraphs } = request;

  const taskId = uuidv4();
  createTask(taskId, engineId, target_lang);

  const translatable = paragraphs.filter(
    (p) => p.type !== "code" && p.type !== "mermaid"
  );
  const nonTranslatableIds = new Set(
    paragraphs.filter((p) => p.type === "code" || p.type === "mermaid").map((p) => p.id)
  );

  // Emit non-translatable paragraphs as done immediately (keep original)
  for (const id of nonTranslatableIds) {
    const p = paragraphs.find((pp) => pp.id === id)!;
    yield { paragraph_id: id, status: "done", translated: p.content };
  }

  const groups = groupParagraphs(translatable);
  const completedIds: string[] = [...nonTranslatableIds];
  const failedIds: Record<string, string> = {};

  for (const group of groups) {
    // Check cache for each paragraph in group
    const toTranslate: TranslateParagraph[] = [];
    for (const p of group) {
      const cached = getCached(p.content, engineId, target_lang);
      if (cached) {
        yield { paragraph_id: p.id, status: "done", translated: cached };
        completedIds.push(p.id);
      } else {
        yield { paragraph_id: p.id, status: "translating" };
        toTranslate.push(p);
      }
    }

    if (toTranslate.length === 0) continue;

    // Translate uncached paragraphs
    try {
      const eng = createEngine(engineId);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

      let results: TranslationResult[];
      try {
        results = await eng.translateBatch(toTranslate, target_lang, controller.signal);
      } finally {
        clearTimeout(timeout);
      }

      for (const r of results) {
        const orig = toTranslate.find((p) => p.id === r.paragraphId);
        if (orig) {
          setCache(orig.content, engineId, target_lang, r.translated);
        }
        yield { paragraph_id: r.paragraphId, status: "done", translated: r.translated };
        completedIds.push(r.paragraphId);
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Unknown error";

      if (errorMsg === "RATE_LIMITED") {
        // Simple retry once after 2s
        await new Promise((r) => setTimeout(r, 2000));
        try {
          const eng = createEngine(engineId);
          const results = await eng.translateBatch(toTranslate, target_lang);
          for (const r of results) {
            const orig = toTranslate.find((p) => p.id === r.paragraphId);
            if (orig) setCache(orig.content, engineId, target_lang, r.translated);
            yield { paragraph_id: r.paragraphId, status: "done", translated: r.translated };
            completedIds.push(r.paragraphId);
          }
        } catch (retryErr: unknown) {
          for (const p of toTranslate) {
            if (!completedIds.includes(p.id)) {
              const retryErrorMsg = retryErr instanceof Error ? retryErr.message : "Unknown error";
              yield { paragraph_id: p.id, status: "error", error: retryErrorMsg };
              failedIds[p.id] = retryErrorMsg;
            }
          }
        }
      } else {
        for (const p of toTranslate) {
          if (!completedIds.includes(p.id)) {
            yield { paragraph_id: p.id, status: "error", error: errorMsg };
            failedIds[p.id] = errorMsg;
          }
        }
      }
    }

    updateTaskProgress(taskId, "processing", completedIds, failedIds);
  }

  updateTaskProgress(taskId, "completed", completedIds, failedIds);
  yield { type: "complete" };
}

function createEngine(engineId: string) {
  switch (engineId) {
    case "openai":
    case "custom-openai":
      return new OpenAIEngine(engineId);
    default:
      throw new Error(`Unknown engine: ${engineId}`);
  }
}
