import fs from "fs";
import Database from "better-sqlite3";
import path from "path";

const DB_PATH = path.join(process.cwd(), "data", "md-translator.db");

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (_db) return _db;

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

    CREATE TABLE IF NOT EXISTS glossary_terms (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      source_term     TEXT NOT NULL,
      target_term     TEXT NOT NULL,
      source_lang     TEXT NOT NULL DEFAULT '',
      target_lang     TEXT NOT NULL DEFAULT '',
      note            TEXT NOT NULL DEFAULT '',
      enabled         INTEGER NOT NULL DEFAULT 1,
      created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP
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

export function deleteEngineConfig(id: string): void {
  getDb().prepare("DELETE FROM engine_configs WHERE id = ?").run(id);
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
  created_at?: string;
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

export interface TaskListItem {
  id: string;
  status: string;
  engine: string;
  target_lang: string;
  completed_ids: string;
  failed_ids: string;
  created_at: string;
}

export function listTasks(filters?: {
  q?: string;
  status?: string;
}): TaskListItem[] {
  const where: string[] = [];
  const values: Array<string> = [];

  const q = filters?.q?.trim();
  if (q) {
    where.push("(id LIKE ? OR engine LIKE ? OR target_lang LIKE ?)");
    const like = `%${q}%`;
    values.push(like, like, like);
  }

  if (filters?.status === "pending" || filters?.status === "processing" || filters?.status === "completed") {
    where.push("status = ?");
    values.push(filters.status);
  }

  const whereClause = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";
  return getDb()
    .prepare(
      `SELECT id, status, engine, target_lang, completed_ids, failed_ids, created_at
       FROM tasks
       ${whereClause}
       ORDER BY datetime(created_at) DESC`
    )
    .all(...values) as TaskListItem[];
}

export interface GlossaryTerm {
  id: number;
  source_term: string;
  target_term: string;
  source_lang: string;
  target_lang: string;
  note: string;
  enabled: number;
  created_at: string;
  updated_at: string;
}

export interface GlossaryTermInput {
  source_term: string;
  target_term: string;
  source_lang: string;
  target_lang: string;
  note?: string;
  enabled?: boolean;
}

export interface GlossaryListFilters {
  q?: string;
  enabled?: string;
  source_lang?: string;
  target_lang?: string;
}

function normalizeGlossaryTerm(row: GlossaryTerm): GlossaryTerm {
  return {
    ...row,
    enabled: row.enabled ? 1 : 0,
  };
}

export function listGlossaryTerms(filters?: GlossaryListFilters): GlossaryTerm[] {
  const where: string[] = [];
  const values: Array<string | number> = [];

  const q = filters?.q?.trim();
  if (q) {
    where.push("(source_term LIKE ? OR target_term LIKE ? OR note LIKE ?)");
    const like = `%${q}%`;
    values.push(like, like, like);
  }

  if (filters?.enabled === "true" || filters?.enabled === "false") {
    where.push("enabled = ?");
    values.push(filters.enabled === "true" ? 1 : 0);
  }

  const sourceLang = filters?.source_lang?.trim();
  if (sourceLang) {
    where.push("source_lang = ?");
    values.push(sourceLang);
  }

  const targetLang = filters?.target_lang?.trim();
  if (targetLang) {
    where.push("target_lang = ?");
    values.push(targetLang);
  }

  const whereClause = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";
  const rows = getDb()
    .prepare(
      `SELECT id, source_term, target_term, source_lang, target_lang, note, enabled, created_at, updated_at
       FROM glossary_terms
       ${whereClause}
       ORDER BY enabled DESC, datetime(updated_at) DESC, id DESC`
    )
    .all(...values) as GlossaryTerm[];

  return rows.map(normalizeGlossaryTerm);
}

export function listGlossaryLanguages(): {
  source_languages: string[];
  target_languages: string[];
} {
  const sourceRows = getDb()
    .prepare(
      `SELECT DISTINCT source_lang
       FROM glossary_terms
       WHERE source_lang <> ''
       ORDER BY source_lang ASC`
    )
    .all() as Array<{ source_lang: string }>;

  const targetRows = getDb()
    .prepare(
      `SELECT DISTINCT target_lang
       FROM glossary_terms
       WHERE target_lang <> ''
       ORDER BY target_lang ASC`
    )
    .all() as Array<{ target_lang: string }>;

  return {
    source_languages: sourceRows.map((row) => row.source_lang),
    target_languages: targetRows.map((row) => row.target_lang),
  };
}

export function getGlossaryTerm(id: number): GlossaryTerm | undefined {
  const row = getDb()
    .prepare(
      `SELECT id, source_term, target_term, source_lang, target_lang, note, enabled, created_at, updated_at
       FROM glossary_terms
       WHERE id = ?`
    )
    .get(id) as GlossaryTerm | undefined;

  return row ? normalizeGlossaryTerm(row) : undefined;
}

export function createGlossaryTerm(input: GlossaryTermInput): GlossaryTerm {
  const result = getDb()
    .prepare(
      `INSERT INTO glossary_terms (source_term, target_term, source_lang, target_lang, note, enabled)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(
      input.source_term.trim(),
      input.target_term.trim(),
      input.source_lang.trim(),
      input.target_lang.trim(),
      input.note?.trim() || "",
      input.enabled === false ? 0 : 1
    );

  return getGlossaryTerm(Number(result.lastInsertRowid))!;
}

export function updateGlossaryTerm(
  id: number,
  input: Partial<GlossaryTermInput>
): GlossaryTerm | undefined {
  const existing = getGlossaryTerm(id);
  if (!existing) {
    return undefined;
  }

  getDb()
    .prepare(
      `UPDATE glossary_terms
       SET source_term = ?,
           target_term = ?,
           source_lang = ?,
           target_lang = ?,
           note = ?,
           enabled = ?,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`
    )
    .run(
      typeof input.source_term === "string" ? input.source_term.trim() : existing.source_term,
      typeof input.target_term === "string" ? input.target_term.trim() : existing.target_term,
      typeof input.source_lang === "string" ? input.source_lang.trim() : existing.source_lang,
      typeof input.target_lang === "string" ? input.target_lang.trim() : existing.target_lang,
      typeof input.note === "string" ? input.note.trim() : existing.note,
      typeof input.enabled === "boolean" ? (input.enabled ? 1 : 0) : existing.enabled,
      id
    );

  return getGlossaryTerm(id);
}

export function deleteGlossaryTerm(id: number): void {
  getDb().prepare("DELETE FROM glossary_terms WHERE id = ?").run(id);
}
