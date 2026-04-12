import { TranslationEngine, TranslateParagraph, TranslationResult } from "./types";
import { getEngineConfig } from "../db";

export class OpenAIEngine implements TranslationEngine {
  private apiKey: string;
  private model: string;
  private baseUrl: string;

  constructor() {
    const config = getEngineConfig("openai");
    if (!config) {
      throw new Error("OpenAI engine not configured. Please set API key first.");
    }
    this.apiKey = config.api_key;
    this.model = config.model || "gpt-4o";
    this.baseUrl = config.base_url || "https://api.openai.com/v1";
  }

  async translateBatch(
    paragraphs: TranslateParagraph[],
    targetLang: string,
    signal?: AbortSignal
  ): Promise<TranslationResult[]> {
    const langName = this.getLanguageName(targetLang);

    const combinedText = paragraphs
      .map((p) => `[${p.id}]: ${p.content}`)
      .join("\n\n");

    const systemPrompt = `You are a professional technical document translator. Translate the following Markdown text to ${langName}. Preserve all Markdown formatting exactly (headings, code blocks, tables, lists, inline code, links, images). Do NOT translate code inside code blocks. Return translations in the same [paragraph-id]: translated text format, one paragraph per line, with the exact same paragraph IDs.`;

    const userPrompt = combinedText;

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.3,
      }),
      signal,
    });

    if (response.status === 429) {
      throw new Error("RATE_LIMITED");
    }

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`OpenAI API error: ${response.status} - ${errText}`);
    }

    const data = await response.json();
    const content: string = data.choices?.[0]?.message?.content ?? "";

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

    // Fallback: if parsing failed, map by position
    if (results.length === 0 && originalParagraphs.length > 0) {
      return originalParagraphs.map((p, i) => ({
        paragraphId: p.id,
        translated: content,
      })).slice(0, 1);
    }

    return results;
  }

  private getLanguageName(code: string): string {
    const names: Record<string, string> = {
      "zh-CN": "Simplified Chinese",
      "zh-TW": "Traditional Chinese",
      "ja": "Japanese",
      "ko": "Korean",
      "fr": "French",
      "de": "German",
      "es": "Spanish",
    };
    return names[code] || code;
  }
}
