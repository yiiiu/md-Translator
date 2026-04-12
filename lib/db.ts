import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const DB_PATH = path.join(process.cwd(), "data", "md-translator.db");

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (_db) return _db;

  const fs = require("fs");
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  _db = new Database(DB_PATH);
  _db.pragma("journal_mode = WAL");
  _db.pragma("foreign_keys = ON");

  createTables(_db);
  return _db;
}

function createTables(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS engine_configs (
      id          TEXT PRIMARY KEY,
      name        TEXT NOT NULL,
      api_key     TEXT NOT NULL DEFAULT '',
      model       TEXT NOT NULL DEFAULT '',
      base_url    TEXT NOT NULL DEFAULT '',
      extra       TEXT NOT NULL DEFAULT '{}',
      created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS translation_cache (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      content_hash    TEXT NOT NULL,
      engine          TEXT NOT NULL,
      target_lang     TEXT NOT NULL,
      original        TEXT NOT NULL,
      translated      TEXT NOT NULL,
      created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(content_hash, engine, target_lang)
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id              TEXT PRIMARY KEY,
      status          TEXT DEFAULT 'pending',
      engine          TEXT NOT NULL,
      target_lang     TEXT NOT NULL,
      completed_ids   TEXT DEFAULT '[]',
      failed_ids      TEXT DEFAULT '{}',
      created_at      DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

// --- engine_configs ---

export interface EngineConfig {
  id: string;
  name: string;
  api_key: string;
  model: string;
  base_url: string;
  extra: string;
}

export function getEngineConfig(id: string): EngineConfig | undefined {
  return getDb().prepare("SELECT * FROM engine_configs WHERE id = ?").get(id) as EngineConfig | undefined;
}

export function getAllEngineConfigs(): EngineConfig[] {
  return getDb().prepare("SELECT * FROM engine_configs").all() as EngineConfig[];
}

export function upsertEngineConfig(cfg: Omit<EngineConfig, "created_at" | "updated_at">): void {
  getDb().prepare(`
    INSERT INTO engine_configs (id, name, api_key, model, base_url, extra)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      api_key = excluded.api_key,
      model = excluded.model,
      base_url = excluded.base_url,
      extra = excluded.extra,
      updated_at = CURRENT_TIMESTAMP
  `).run(cfg.id, cfg.name, cfg.api_key, cfg.model, cfg.base_url, cfg.extra);
}

// --- translation_cache ---

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

// --- tasks ---

export interface Task {
  id: string;
  status: string;
  engine: string;
  target_lang: string;
  completed_ids: string;
  failed_ids: string;
}

export function createTask(id: string, engine: string, targetLang: string): void {
  getDb().prepare("INSERT INTO tasks (id, engine, target_lang) VALUES (?, ?, ?)").run(id, engine, targetLang);
}

export function getTask(id: string): Task | undefined {
  return getDb().prepare("SELECT * FROM tasks WHERE id = ?").get(id) as Task | undefined;
}

export function updateTaskProgress(
  id: string,
  status: string,
  completedIds: string[],
  failedIds: Record<string, string>
): void {
  getDb()
    .prepare("UPDATE tasks SET status = ?, completed_ids = ?, failed_ids = ? WHERE id = ?")
    .run(status, JSON.stringify(completedIds), JSON.stringify(failedIds), id);
}
