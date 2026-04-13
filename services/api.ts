import { useTranslationStore, type Paragraph } from "@/stores/translation";

interface TranslateRequest {
  engine: string;
  target_lang: string;
  mode: "full" | "lazy";
  paragraphs: Array<{
    id: string;
    type: Paragraph["type"];
    content: string;
    index: number;
  }>;
}

interface TranslateEvent {
  paragraph_id?: string;
  status?: "translating" | "done" | "error";
  translated?: string;
  error?: string;
  type?: "complete" | "error";
}

interface ParagraphRetryResponse {
  paragraph_id?: string;
  translated?: string;
  error?: string;
}

interface ApiErrorResponse {
  error?: string;
}

export interface EngineListResponse {
  engines?: Array<{
    id: string;
    name: string;
    configured: boolean;
  }>;
}

export interface EngineModelsResponse {
  ok: boolean;
  models?: Array<{ id: string; owned_by?: string }>;
  error?: string;
}

export interface EngineTestResponse {
  ok: boolean;
  error?: string;
}

export interface EngineConfigResponse {
  id: string;
  name: string;
  configured: boolean;
  api_key_configured: boolean;
  model: string;
  base_url: string;
  error?: string;
}

interface EngineConfigRequest {
  api_key?: string;
  model?: string;
  base_url?: string;
  name?: string;
}

const RETRY_FAILED_CONCURRENCY = 4;

export async function startTranslation(
  paragraphs: Paragraph[],
  engine: string,
  targetLang: string,
  mode: "full" | "lazy"
): Promise<void> {
  const store = useTranslationStore.getState();
  store.setConnectionLost(false);

  const body: TranslateRequest = {
    engine,
    target_lang: targetLang,
    mode,
    paragraphs: paragraphs.map((paragraph, index) => ({
      id: paragraph.id,
      type: paragraph.type,
      content: paragraph.original,
      index,
    })),
  };

  const response = await fetch("/api/translate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = (await response.json()) as ApiErrorResponse;
    throw new Error(error.error || `Translation failed: ${response.status}`);
  }

  if (!response.body) {
    throw new Error("No response body");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;

        const payload = line.slice(6).trim();
        if (!payload) continue;

        try {
          const event = JSON.parse(payload) as TranslateEvent;

          if (event.type === "complete") {
            return;
          }

          if (event.type === "error") {
            throw new Error(event.error || "Translation stream failed");
          }

          if (!event.paragraph_id) {
            continue;
          }

          store.updateParagraph(event.paragraph_id, {
            status:
              event.status === "done"
                ? "done"
                : event.status === "error"
                  ? "error"
                  : "translating",
            translated: event.translated ?? "",
            errorMessage: event.error,
          });
        } catch (error) {
          if (error instanceof Error) {
            throw error;
          }
        }
      }
    }
  } catch (error: unknown) {
    if (!(error instanceof DOMException && error.name === "AbortError")) {
      store.setConnectionLost(true);
    }
    throw error;
  }
}

export async function retryParagraph(
  paragraph: Paragraph,
  engine: string,
  targetLang: string
): Promise<void> {
  const store = useTranslationStore.getState();

  store.updateParagraph(paragraph.id, {
    status: "translating",
    errorMessage: undefined,
  });

  try {
    const response = await fetch("/api/paragraph", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        engine,
        target_lang: targetLang,
        paragraph_id: paragraph.id,
        content: paragraph.original,
        type: paragraph.type,
      }),
    });

    const result = (await response.json()) as ParagraphRetryResponse;

    if (!response.ok || typeof result.translated !== "string") {
      throw new Error(result.error || `Paragraph retry failed: ${response.status}`);
    }

    store.updateParagraph(paragraph.id, {
      status: "done",
      translated: result.translated,
      errorMessage: undefined,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    store.updateParagraph(paragraph.id, {
      status: "error",
      errorMessage: message,
    });
    throw error;
  }
}

export async function retryFailedParagraphs(
  paragraphs: Paragraph[],
  engine: string,
  targetLang: string
): Promise<void> {
  const failedParagraphs = paragraphs.filter(
    (paragraph) => paragraph.status === "error"
  );
  if (failedParagraphs.length === 0) return;

  let cursor = 0;
  const workerCount = Math.min(RETRY_FAILED_CONCURRENCY, failedParagraphs.length);

  async function retryNext(): Promise<void> {
    while (cursor < failedParagraphs.length) {
      const paragraph = failedParagraphs[cursor];
      cursor += 1;

      try {
        await retryParagraph(paragraph, engine, targetLang);
      } catch {
        // retryParagraph already writes the per-paragraph error state.
      }
    }
  }

  await Promise.all(
    Array.from({ length: workerCount }, () => retryNext())
  );
}

export async function fetchEngines(): Promise<EngineListResponse> {
  const response = await fetch("/api/engines");
  return (await response.json()) as EngineListResponse;
}

export async function fetchEngineConfig(id: string): Promise<EngineConfigResponse> {
  const response = await fetch(`/api/engines/${id}/config`);
  return (await response.json()) as EngineConfigResponse;
}

export async function configureEngine(
  id: string,
  config: EngineConfigRequest
): Promise<{ ok?: boolean; error?: string }> {
  const response = await fetch(`/api/engines/${id}/config`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(config),
  });

  return (await response.json()) as { ok?: boolean; error?: string };
}

export async function fetchEngineModels(
  id: string,
  config: { api_key: string; base_url: string }
): Promise<EngineModelsResponse> {
  const response = await fetch(`/api/engines/${id}/models`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(config),
  });

  return (await response.json()) as EngineModelsResponse;
}

export async function testEngineModel(
  id: string,
  config: { api_key: string; base_url: string; model: string }
): Promise<EngineTestResponse> {
  const response = await fetch(`/api/engines/${id}/test`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(config),
  });

  return (await response.json()) as EngineTestResponse;
}
