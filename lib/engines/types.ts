export interface TranslateParagraph {
  id: string;
  type: string;
  content: string;
  index: number;
}

export interface TranslationResult {
  paragraphId: string;
  translated: string;
}

export interface TranslationEngine {
  /** Translate a batch of paragraphs (grouped for context). Returns translated text per group. */
  translateBatch(
    paragraphs: TranslateParagraph[],
    targetLang: string,
    signal?: AbortSignal
  ): Promise<TranslationResult[]>;
}
