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

interface EngineConfigRequest {
  api_key: string;
  model?: string;
  base_url?: string;
}

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

export async function fetchEngines(): Promise<EngineListResponse> {
  const response = await fetch("/api/engines");
  return (await response.json()) as EngineListResponse;
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
