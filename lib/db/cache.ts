import { getDb } from "./connection";

export interface CacheEntry {
  id: number;
  content_hash: string;
  engine: string;
  target_lang: string;
  original: string;
  translated: string;
}

export function getCachedTranslation(
  contentHash: string,
  engine: string,
  targetLang: string
): string | undefined {
  const row = getDb()
    .prepare("SELECT translated FROM translation_cache WHERE content_hash = ? AND engine = ? AND target_lang = ?")
    .get(contentHash, engine, targetLang) as { translated: string } | undefined;
  return row?.translated;
}

export function setCachedTranslation(
  contentHash: string,
  engine: string,
  targetLang: string,
  original: string,
  translated: string
): void {
  getDb().prepare(`
    INSERT OR REPLACE INTO translation_cache (content_hash, engine, target_lang, original, translated)
    VALUES (?, ?, ?, ?, ?)
  `).run(contentHash, engine, targetLang, original, translated);
}

export function getCacheStats(): { count: number; sizeBytes: number } {
  const row = getDb()
    .prepare(
      `SELECT COUNT(*) as count,
              SUM(LENGTH(original) + LENGTH(translated)) as sizeBytes
       FROM translation_cache`
    )
    .get() as { count: number; sizeBytes: number | null };

  return {
    count: row.count ?? 0,
    sizeBytes: row.sizeBytes ?? 0,
  };
}

export function clearCache(): void {
  getDb().prepare("DELETE FROM translation_cache").run();
}