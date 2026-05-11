import { v4 as uuidv4 } from "uuid";
import { RateLimitError, TranslateParagraph, TranslationResult } from "./engines/types";
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
  type?: "complete" | "error";
}

const GROUP_SIZE = 4;
const MAX_CONCURRENT_GROUPS = 2;
const TIMEOUT_MS = 30000;
const RETRY_BASE_DELAY_MS = 1000;
const RETRY_MAX_DELAY_MS = 10000;
const MAX_RETRY_ATTEMPTS = 2;

type ParagraphOutcome = {
  paragraphId: string;
  status: "done" | "error";
  translated?: string;
  error?: string;
};

type GroupOutcome = {
  group: TranslateParagraph[];
  outcomes: ParagraphOutcome[];
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
    yield { task_id: taskId, paragraph_id: id, status: "done", translated: p.content };
  }

  const groups = groupParagraphs(translatable);
  const completedIds: string[] = [...nonTranslatableIds];
  const failedIds: Record<string, string> = {};
  const pendingGroups: TranslateParagraph[][] = [];

  for (const group of groups) {
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
        yield { task_id: taskId, paragraph_id: p.id, status: "done", translated: cached };
        completedIds.push(p.id);
      } else {
        yield { task_id: taskId, paragraph_id: p.id, status: "translating" };
        toTranslate.push(p);
      }
    }

    if (toTranslate.length > 0) {
      pendingGroups.push(toTranslate);
    }
  }

  updateTaskProgress(taskId, "processing", completedIds, failedIds);

  for await (const groupOutcome of translateGroupsWithConcurrency(
    pendingGroups,
    engineId,
    target_lang,
    signal
  )) {
    if (signal?.aborted) {
      updateTaskProgress(taskId, "processing", completedIds, failedIds);
      return;
    }

    for (const outcome of groupOutcome.outcomes) {
      const original = groupOutcome.group.find(
        (paragraph) => paragraph.id === outcome.paragraphId
      );

      if (outcome.status === "done") {
        createTaskParagraph({
          task_id: taskId,
          paragraph_id: outcome.paragraphId,
          type: original?.type ?? "paragraph",
          original: original?.content ?? "",
          translated: outcome.translated ?? "",
          sort_order: original?.index ?? 0,
        });
        yield {
          task_id: taskId,
          paragraph_id: outcome.paragraphId,
          status: "done",
          translated: outcome.translated,
        };
        completedIds.push(outcome.paragraphId);
      } else {
        yield {
          task_id: taskId,
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
  }

  if (signal?.aborted) {
    updateTaskProgress(taskId, "processing", completedIds, failedIds);
    return;
  }

  updateTaskProgress(taskId, "completed", completedIds, failedIds);
  yield { type: "complete" };
}

async function* translateGroupsWithConcurrency(
  groups: TranslateParagraph[][],
  engineId: string,
  targetLang: string,
  signal?: AbortSignal
): AsyncGenerator<GroupOutcome> {
  const queue = [...groups];
  const inFlight = new Set<Promise<GroupOutcome>>();

  const startNext = () => {
    const group = queue.shift();
    if (!group) return;

    const promise = translateGroupWithRetry(group, engineId, targetLang, signal)
      .then((outcomes) => ({ group, outcomes }))
      .catch((error: unknown) => ({
        group,
        outcomes: group.map((paragraph) => ({
          paragraphId: paragraph.id,
          status: "error" as const,
          error: error instanceof Error ? error.message : "Unknown error",
        })),
      }))
      .finally(() => {
        inFlight.delete(promise);
      });
    inFlight.add(promise);
  };

  while (inFlight.size < MAX_CONCURRENT_GROUPS && queue.length > 0) {
    startNext();
  }

  while (inFlight.size > 0) {
    const result = await Promise.race(inFlight);
    yield result;

    if (signal?.aborted) {
      return;
    }

    while (inFlight.size < MAX_CONCURRENT_GROUPS && queue.length > 0) {
      startNext();
    }
  }
}

async function translateGroupWithRetry(
  paragraphs: TranslateParagraph[],
  engineId: string,
  targetLang: string,
  signal?: AbortSignal
): Promise<ParagraphOutcome[]> {
  for (let attempt = 0; attempt <= MAX_RETRY_ATTEMPTS; attempt++) {
    try {
      return await translateGroup(paragraphs, engineId, targetLang, signal);
    } catch (err: unknown) {
      if (isAbortError(err) || signal?.aborted) {
        throw err;
      }

      if (!(err instanceof RateLimitError) || attempt === MAX_RETRY_ATTEMPTS) {
        const errorMsg = err instanceof Error ? err.message : "Unknown error";
        return paragraphs.map((paragraph) => ({
          paragraphId: paragraph.id,
          status: "error",
          error: errorMsg,
        }));
      }

      await waitForRetryDelay(getRetryDelayMs(attempt, err.retryAfterMs), signal);
    }
  }

  return paragraphs.map((paragraph) => ({
    paragraphId: paragraph.id,
    status: "error",
    error: "Unknown error",
  }));
}

function getRetryDelayMs(attempt: number, retryAfterMs?: number) {
  if (typeof retryAfterMs === "number" && Number.isFinite(retryAfterMs)) {
    return Math.min(retryAfterMs, RETRY_MAX_DELAY_MS);
  }

  const exponential = RETRY_BASE_DELAY_MS * 2 ** attempt;
  const jitter = Math.floor(Math.random() * RETRY_BASE_DELAY_MS);
  return Math.min(exponential + jitter, RETRY_MAX_DELAY_MS);
}

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError";
}

async function waitForRetryDelay(ms: number, signal?: AbortSignal) {
  if (signal?.aborted) {
    throw new Error("Translation aborted");
  }

  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      signal?.removeEventListener("abort", handleAbort);
      resolve();
    }, ms);

    const handleAbort = () => {
      clearTimeout(timeout);
      reject(new Error("Translation aborted"));
    };

    signal?.addEventListener("abort", handleAbort, { once: true });
  });
}

async function translateGroup(
  paragraphs: TranslateParagraph[],
  engineId: string,
  targetLang: string,
  signal?: AbortSignal
): Promise<ParagraphOutcome[]> {
  const eng = createEngine(engineId);
  const timeoutController = new AbortController();
  const timeout = setTimeout(() => timeoutController.abort(), TIMEOUT_MS);
  const combinedSignal = mergeAbortSignals(signal, timeoutController.signal);

  let results: TranslationResult[];
  try {
    results = await eng.translateBatch(paragraphs, targetLang, combinedSignal);
  } finally {
    clearTimeout(timeout);
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

function mergeAbortSignals(...signals: Array<AbortSignal | undefined>) {
  const activeSignals = signals.filter((item): item is AbortSignal => Boolean(item));
  if (activeSignals.length === 0) {
    return undefined;
  }

  if (activeSignals.some((item) => item.aborted)) {
    return AbortSignal.abort();
  }

  const controller = new AbortController();
  const handleAbort = () => controller.abort();

  for (const signal of activeSignals) {
    signal.addEventListener("abort", handleAbort, { once: true });
  }

  return controller.signal;
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
