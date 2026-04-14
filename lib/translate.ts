import { v4 as uuidv4 } from "uuid";
import { TranslateParagraph, TranslationResult } from "./engines/types";
import { OpenAIEngine } from "./engines/openai";
import { getCached, setCache } from "./cache";
import { createTask, createTaskParagraph, updateTaskProgress } from "./db";

export interface TranslateRequest {
  engine: string;
  target_lang: string;
  mode: "full" | "lazy";
  paragraphs: TranslateParagraph[];
}

export interface SSEEvent {
  task_id?: string;
  paragraph_id?: string;
  status?: "translating" | "done" | "error";
  translated?: string;
  error?: string;
  type?: "complete";
}

const GROUP_SIZE = 4;
const TIMEOUT_MS = 30000;

type ParagraphOutcome = {
  paragraphId: string;
  status: "done" | "error";
  translated?: string;
  error?: string;
};

function groupParagraphs(paragraphs: TranslateParagraph[]): TranslateParagraph[][] {
  const groups: TranslateParagraph[][] = [];
  for (let i = 0; i < paragraphs.length; i += GROUP_SIZE) {
    groups.push(paragraphs.slice(i, i + GROUP_SIZE));
  }
  return groups;
}

export async function* translateStream(
  request: TranslateRequest,
  signal?: AbortSignal
): AsyncGenerator<SSEEvent> {
  const { engine: engineId, target_lang, paragraphs } = request;

  const taskId = uuidv4();
  createTask(taskId, engineId, target_lang);
  yield { task_id: taskId };

  const translatable = paragraphs.filter(
    (p) => p.type !== "code" && p.type !== "mermaid"
  );
  const nonTranslatableIds = new Set(
    paragraphs.filter((p) => p.type === "code" || p.type === "mermaid").map((p) => p.id)
  );

  // Emit non-translatable paragraphs as done immediately (keep original)
  for (const id of nonTranslatableIds) {
    const p = paragraphs.find((pp) => pp.id === id)!;
    createTaskParagraph({
      task_id: taskId,
      paragraph_id: p.id,
      type: p.type,
      original: p.content,
      translated: p.content,
      sort_order: p.index,
    });
    yield { paragraph_id: id, status: "done", translated: p.content };
  }

  const groups = groupParagraphs(translatable);
  const completedIds: string[] = [...nonTranslatableIds];
  const failedIds: Record<string, string> = {};
  const translationPromises: Array<Promise<ParagraphOutcome[]>> = [];

  for (const group of groups) {
    // Check cache for each paragraph in group
    const toTranslate: TranslateParagraph[] = [];
    for (const p of group) {
      const cached = getCached(p.content, engineId, target_lang);
      if (cached) {
        createTaskParagraph({
          task_id: taskId,
          paragraph_id: p.id,
          type: p.type,
          original: p.content,
          translated: cached,
          sort_order: p.index,
        });
        yield { paragraph_id: p.id, status: "done", translated: cached };
        completedIds.push(p.id);
      } else {
        yield { paragraph_id: p.id, status: "translating" };
        toTranslate.push(p);
      }
    }

    if (toTranslate.length === 0) continue;
    translationPromises.push(
      translateGroupWithRetry(toTranslate, engineId, target_lang, signal)
    );
  }

  updateTaskProgress(taskId, "processing", completedIds, failedIds);

  const groupedOutcomes = await Promise.all(translationPromises);
  const outcomesById = new Map(
    groupedOutcomes.flat().map((outcome) => [outcome.paragraphId, outcome])
  );
  const orderedParagraphIds = paragraphs.map((paragraph) => paragraph.id);

  for (const id of orderedParagraphIds) {
    const outcome = outcomesById.get(id);
    if (!outcome) continue;

    if (outcome.status === "done") {
      const original = paragraphs.find(
        (paragraph) => paragraph.id === outcome.paragraphId
      );
      createTaskParagraph({
        task_id: taskId,
        paragraph_id: outcome.paragraphId,
        type: original?.type ?? "paragraph",
        original: original?.content ?? "",
        translated: outcome.translated ?? "",
        sort_order: original?.index ?? 0,
      });
      yield {
        paragraph_id: outcome.paragraphId,
        status: "done",
        translated: outcome.translated,
      };
      completedIds.push(outcome.paragraphId);
    } else {
      yield {
        paragraph_id: outcome.paragraphId,
        status: "error",
        error: outcome.error,
      };
      if (outcome.error) {
        failedIds[outcome.paragraphId] = outcome.error;
      }
    }

    updateTaskProgress(taskId, "processing", completedIds, failedIds);
  }

  updateTaskProgress(taskId, "completed", completedIds, failedIds);
  yield { type: "complete" };
}

async function translateGroupWithRetry(
  paragraphs: TranslateParagraph[],
  engineId: string,
  targetLang: string,
  signal?: AbortSignal
): Promise<ParagraphOutcome[]> {
  try {
    return await translateGroup(paragraphs, engineId, targetLang, true, signal);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Unknown error";

    if (errorMsg !== "RATE_LIMITED") {
      return paragraphs.map((paragraph) => ({
        paragraphId: paragraph.id,
        status: "error",
        error: errorMsg,
      }));
    }

    await new Promise((resolve) => setTimeout(resolve, 2000));

    try {
      return await translateGroup(paragraphs, engineId, targetLang, false, signal);
    } catch (retryErr: unknown) {
      const retryErrorMsg =
        retryErr instanceof Error ? retryErr.message : "Unknown error";
      return paragraphs.map((paragraph) => ({
        paragraphId: paragraph.id,
        status: "error",
        error: retryErrorMsg,
      }));
    }
  }
}

async function translateGroup(
  paragraphs: TranslateParagraph[],
  engineId: string,
  targetLang: string,
  withTimeout: boolean,
  signal?: AbortSignal
): Promise<ParagraphOutcome[]> {
  const eng = createEngine(engineId);
  const controller = withTimeout ? new AbortController() : undefined;
  const timeout = controller
    ? setTimeout(() => controller.abort(), TIMEOUT_MS)
    : undefined;
  const handleAbort =
    controller && signal
      ? () => {
          if (!controller.signal.aborted) {
            controller.abort();
          }
        }
      : undefined;

  if (handleAbort) {
    signal?.addEventListener("abort", handleAbort, { once: true });
  }

  let results: TranslationResult[];
  try {
    results = await eng.translateBatch(paragraphs, targetLang, controller?.signal);
  } finally {
    if (timeout) clearTimeout(timeout);
    if (handleAbort) {
      signal?.removeEventListener("abort", handleAbort);
    }
  }

  const resultsById = new Map(results.map((result) => [result.paragraphId, result]));

  return paragraphs.map((paragraph) => {
    const result = resultsById.get(paragraph.id);
    if (!result) {
      return {
        paragraphId: paragraph.id,
        status: "error",
        error: "Missing translation result",
      };
    }

    setCache(paragraph.content, engineId, targetLang, result.translated);
    return {
      paragraphId: paragraph.id,
      status: "done",
      translated: result.translated,
    };
  });
}

export function createEngine(engineId: string) {
  if (
    engineId === "openai" ||
    engineId === "custom-openai" ||
    engineId.startsWith("custom-openai-")
  ) {
    return new OpenAIEngine(engineId);
  }

  throw new Error(`Unknown engine: ${engineId}`);
}
