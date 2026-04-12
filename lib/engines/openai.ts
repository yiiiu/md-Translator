import { getEngineConfig } from "../db";
import { TranslateParagraph, TranslationEngine, TranslationResult } from "./types";

const DEFAULT_BASE_URL = "https://api.openai.com/v1";
const DEFAULT_MODEL = "gpt-4o";

interface OpenAICompatibleModel {
  id: string;
  owned_by?: string;
}

interface ChatCompletionResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
}

export class OpenAIEngine implements TranslationEngine {
  private apiKey: string;
  private model: string;
  private baseUrl: string;

  constructor(engineId = "openai") {
    const config = getEngineConfig(engineId);
    if (!config?.api_key) {
      throw new Error(`${engineId} engine not configured. Please set API key first.`);
    }

    this.apiKey = config.api_key;
    this.model = config.model || DEFAULT_MODEL;
    this.baseUrl = config.base_url || DEFAULT_BASE_URL;
  }

  static async fetchModels(apiKey: string, baseUrl: string): Promise<OpenAICompatibleModel[]> {
    const response = await fetch(`${normalizeBaseUrl(baseUrl)}/models`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    if (!response.ok) {
      throw new Error(await readStableError(response));
    }

    const data = (await response.json()) as { data?: OpenAICompatibleModel[] };
    return Array.isArray(data.data) ? data.data : [];
  }

  static async testModel(apiKey: string, baseUrl: string, model: string): Promise<void> {
    const response = await fetch(`${normalizeBaseUrl(baseUrl)}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: "reply with ok" }],
        max_tokens: 5,
        temperature: 0,
      }),
    });

    if (!response.ok) {
      throw new Error(await readStableError(response));
    }
  }

  async translateBatch(
    paragraphs: TranslateParagraph[],
    targetLang: string,
    signal?: AbortSignal
  ): Promise<TranslationResult[]> {
    const langName = this.getLanguageName(targetLang);
    const combinedText = paragraphs.map((p) => `[${p.id}]: ${p.content}`).join("\n\n");

    const systemPrompt = `You are a professional technical document translator. Translate the following Markdown text to ${langName}. Preserve all Markdown formatting exactly (headings, code blocks, tables, lists, inline code, links, images). Do NOT translate code inside code blocks. Return translations in the same [paragraph-id]: translated text format, one paragraph per line, with the exact same paragraph IDs.`;

    const response = await fetch(`${normalizeBaseUrl(this.baseUrl)}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: combinedText },
        ],
        temperature: 0.3,
      }),
      signal,
    });

    if (response.status === 429) {
      throw new Error("RATE_LIMITED");
    }

    if (!response.ok) {
      throw new Error(await readStableError(response));
    }

    const data = (await response.json()) as ChatCompletionResponse;
    const content = data.choices?.[0]?.message?.content ?? "";

    return this.parseResponse(content, paragraphs);
  }

  private parseResponse(
    content: string,
    originalParagraphs: TranslateParagraph[]
  ): TranslationResult[] {
    const results: TranslationResult[] = [];
    const lines = content.split("\n");
    let currentId = "";
    let currentText: string[] = [];

    for (const line of lines) {
      const match = line.match(/^\[([^\]]+)\]:\s*(.*)/);
      if (match) {
        if (currentId) {
          results.push({ paragraphId: currentId, translated: currentText.join("\n").trim() });
        }
        currentId = match[1];
        currentText = [match[2]];
      } else {
        currentText.push(line);
      }
    }

    if (currentId) {
      results.push({ paragraphId: currentId, translated: currentText.join("\n").trim() });
    }

    if (results.length === 0 && originalParagraphs.length > 0) {
      return originalParagraphs
        .map((paragraph) => ({
          paragraphId: paragraph.id,
          translated: content,
        }))
        .slice(0, 1);
    }

    return results;
  }

  private getLanguageName(code: string): string {
    const names: Record<string, string> = {
      "zh-CN": "Simplified Chinese",
      "zh-TW": "Traditional Chinese",
      ja: "Japanese",
      ko: "Korean",
      fr: "French",
      de: "German",
      es: "Spanish",
    };
    return names[code] || code;
  }
}

function normalizeBaseUrl(baseUrl: string): string {
  return (baseUrl || DEFAULT_BASE_URL).replace(/\/+$/, "");
}

async function readStableError(response: Response): Promise<string> {
  const rawText = await response.text();
  const text = rawText.trim();

  if (response.status === 401) {
    return "Authentication failed";
  }

  if (response.status === 403) {
    return "Access denied";
  }

  if (response.status === 404) {
    return "Endpoint not found";
  }

  if (response.status === 429) {
    return "Rate limit exceeded";
  }

  if (response.status >= 500) {
    return "Upstream service unavailable";
  }

  if (text) {
    return `Request failed with status ${response.status}: ${truncateError(text)}`;
  }

  return `Request failed with status ${response.status}`;
}

function truncateError(text: string): string {
  const normalized = text.replace(/\s+/g, " ").trim();
  return normalized.length > 200 ? `${normalized.slice(0, 197)}...` : normalized;
}
