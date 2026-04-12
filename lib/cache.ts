import { createHash } from "crypto";
import { getCachedTranslation, setCachedTranslation } from "./db";

export function computeContentHash(content: string): string {
  return createHash("sha256").update(content).digest("hex").slice(0, 16);
}

export function getCached(
  original: string,
  engine: string,
  targetLang: string
): string | undefined {
  const hash = computeContentHash(original);
  return getCachedTranslation(hash, engine, targetLang);
}

export function setCache(
  original: string,
  engine: string,
  targetLang: string,
  translated: string
): void {
  const hash = computeContentHash(original);
  setCachedTranslation(hash, engine, targetLang, original, translated);
}
