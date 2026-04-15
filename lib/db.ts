import fs from "fs";
import Database from "better-sqlite3";
import path from "path";
import {
  DEFAULT_APP_SETTINGS,
  normalizeAppSettings,
  normalizeThemeMode,
  type AppSettings,
} from "./app-settings";
import { decrypt, encrypt } from "./crypto";
import type {
  GlossaryImportError,
  ParsedGlossaryImportRow,
} from "./glossary-import";

const DB_PATH = path.join(process.cwd(), "data", "md-translator.db");

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (_db) {
    ensureAppSettingsColumns(_db);
    return _db;
  }

  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  _db = new Database(DB_PATH);
  _db.pragma("journal_mode = WAL");
  _db.pragma("foreign_keys = ON");

  createTables(_db);
  ensureAppSettingsColumns(_db);
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

    CREATE TABLE IF NOT EXISTS task_paragraphs (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id       TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      paragraph_id  TEXT NOT NULL,
      type          TEXT NOT NULL DEFAULT 'paragraph',
      original      TEXT NOT NULL DEFAULT '',
      translated    TEXT NOT NULL DEFAULT '',
      sort_order    INTEGER NOT NULL DEFAULT 0,
      created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(task_id, paragraph_id)
    );

    CREATE INDEX IF NOT EXISTS idx_task_paragraphs_task_id
      ON task_paragraphs(task_id, sort_order);

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

    CREATE TABLE IF NOT EXISTS app_settings (
      id                          INTEGER PRIMARY KEY CHECK (id = 1),
      ui_language                 TEXT NOT NULL DEFAULT 'en',
      theme_mode                  TEXT NOT NULL DEFAULT 'system',
      default_engine              TEXT NOT NULL DEFAULT 'openai',
      default_target_lang         TEXT NOT NULL DEFAULT 'zh-CN',
      auto_translate_enabled      INTEGER NOT NULL DEFAULT 1,
      auto_translate_debounce_ms  INTEGER NOT NULL DEFAULT 1500,
      created_at                  DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at                  DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  db.prepare(
    `INSERT INTO app_settings (
      id,
      ui_language,
      theme_mode,
      default_engine,
      default_target_lang,
      auto_translate_enabled,
      auto_translate_debounce_ms
    )
    VALUES (1, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO NOTHING`
  ).run(
    DEFAULT_APP_SETTINGS.ui_language,
    DEFAULT_APP_SETTINGS.theme_mode,
    DEFAULT_APP_SETTINGS.default_engine,
    DEFAULT_APP_SETTINGS.default_target_lang,
    DEFAULT_APP_SETTINGS.auto_translate_enabled ? 1 : 0,
    DEFAULT_APP_SETTINGS.auto_translate_debounce_ms
  );
}

function ensureAppSettingsColumns(db: Database.Database) {
  const columns = db
    .prepare("PRAGMA table_info(app_settings)")
    .all() as Array<{ name: string }>;

  if (!columns.some((column) => column.name === "theme_mode")) {
    db.exec(
      "ALTER TABLE app_settings ADD COLUMN theme_mode TEXT NOT NULL DEFAULT 'system'"
    );
  }

  if (!columns.some((column) => column.name === "default_engine")) {
    db.exec(
      "ALTER TABLE app_settings ADD COLUMN default_engine TEXT NOT NULL DEFAULT 'openai'"
    );
  }
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

function decryptConfig(config: EngineConfig): EngineConfig {
  return {
    ...config,
    api_key: decrypt(config.api_key),
  };
}

export function getEngineConfig(id: string): EngineConfig | undefined {
  const row = getDb()
    .prepare("SELECT * FROM engine_configs WHERE id = ?")
    .get(id) as EngineConfig | undefined;
  return row ? decryptConfig(row) : undefined;
}

export function getAllEngineConfigs(): EngineConfig[] {
  const rows = getDb().prepare("SELECT * FROM engine_configs").all() as EngineConfig[];
  return rows.map(decryptConfig);
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
  `).run(
    cfg.id,
    cfg.name,
    encrypt(cfg.api_key),
    cfg.model,
    cfg.base_url,
    cfg.extra
  );
}

export function deleteEngineConfig(id: string): void {
  getDb().prepare("DELETE FROM engine_configs WHERE id = ?").run(id);

  if (getAppSettings().default_engine === id) {
    getDb()
      .prepare(
        `UPDATE app_settings
         SET default_engine = 'openai',
             updated_at = CURRENT_TIMESTAMP
         WHERE id = 1`
      )
      .run();
  }
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

export interface TaskParagraph {
  id: number;
  task_id: string;
  paragraph_id: string;
  type: string;
  original: string;
  translated: string;
  sort_order: number;
  created_at?: string;
}

export function createTask(id: string, engine: string, targetLang: string): void {
  getDb().prepare("INSERT INTO tasks (id, engine, target_lang) VALUES (?, ?, ?)").run(id, engine, targetLang);
}

export function createTaskParagraph(input: {
  task_id: string;
  paragraph_id: string;
  type: string;
  original: string;
  translated: string;
  sort_order: number;
}): void {
  getDb()
    .prepare(
      `INSERT OR REPLACE INTO task_paragraphs
       (task_id, paragraph_id, type, original, translated, sort_order)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(
      input.task_id,
      input.paragraph_id,
      input.type,
      input.original,
      input.translated,
      input.sort_order
    );
}

export function getTask(id: string): Task | undefined {
  return getDb().prepare("SELECT * FROM tasks WHERE id = ?").get(id) as Task | undefined;
}

export function deleteTask(taskId: string): void {
  getDb().prepare("DELETE FROM tasks WHERE id = ?").run(taskId);
}

export function deleteTasks(taskIds: string[]): void {
  if (taskIds.length === 0) {
    return;
  }

  const runDelete = getDb().prepare("DELETE FROM tasks WHERE id = ?");
  const transaction = getDb().transaction((ids: string[]) => {
    for (const taskId of ids) {
      runDelete.run(taskId);
    }
  });

  transaction(taskIds);
}

export function listTaskParagraphs(taskId: string): TaskParagraph[] {
  return getDb()
    .prepare(
      `SELECT id, task_id, paragraph_id, type, original, translated, sort_order, created_at
       FROM task_paragraphs
       WHERE task_id = ?
       ORDER BY sort_order ASC`
    )
    .all(taskId) as TaskParagraph[];
}

export interface TaskWithParagraphs extends Task {
  paragraphs: TaskParagraph[];
}

export function getTaskWithParagraphs(
  taskId: string
): TaskWithParagraphs | undefined {
  const task = getTask(taskId);
  if (!task) {
    return undefined;
  }

  return {
    ...task,
    paragraphs: listTaskParagraphs(taskId),
  };
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

function parseTaskCompletedIds(value: string): string[] {
  try {
    const parsed = JSON.parse(value) as string[];
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function parseTaskFailedIds(value: string): Record<string, string> {
  try {
    const parsed = JSON.parse(value) as Record<string, string>;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }

    return Object.fromEntries(
      Object.entries(parsed).filter(
        (entry): entry is [string, string] =>
          typeof entry[0] === "string" && typeof entry[1] === "string"
      )
    );
  } catch {
    return {};
  }
}

export function syncTaskParagraphResult(input: {
  taskId: string;
  paragraphId: string;
  type: string;
  original: string;
  sortOrder?: number;
  translated?: string;
  error?: string;
}): void {
  const task = getTask(input.taskId);
  if (!task) {
    return;
  }

  const completedIds = new Set(parseTaskCompletedIds(task.completed_ids));
  const failedIds = parseTaskFailedIds(task.failed_ids);

  if (typeof input.translated === "string") {
    const existing = getDb()
      .prepare(
        `SELECT sort_order
         FROM task_paragraphs
         WHERE task_id = ? AND paragraph_id = ?`
      )
      .get(input.taskId, input.paragraphId) as { sort_order?: number } | undefined;

    createTaskParagraph({
      task_id: input.taskId,
      paragraph_id: input.paragraphId,
      type: input.type,
      original: input.original,
      translated: input.translated,
      sort_order: existing?.sort_order ?? input.sortOrder ?? completedIds.size,
    });
    completedIds.add(input.paragraphId);
    delete failedIds[input.paragraphId];
  } else if (typeof input.error === "string" && input.error.length > 0) {
    completedIds.delete(input.paragraphId);
    failedIds[input.paragraphId] = input.error;
  }

  updateTaskProgress(input.taskId, "completed", [...completedIds], failedIds);
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

export interface BulkCreateGlossaryTermsResult {
  inserted: number;
  errors: GlossaryImportError[];
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

export function bulkCreateGlossaryTerms(
  rows: ParsedGlossaryImportRow[]
): BulkCreateGlossaryTermsResult {
  if (rows.length === 0) {
    return { inserted: 0, errors: [] };
  }

  const insertStatement = getDb().prepare(
    `INSERT INTO glossary_terms (source_term, target_term, source_lang, target_lang, note, enabled)
     VALUES (?, ?, ?, ?, ?, ?)`
  );

  const result: BulkCreateGlossaryTermsResult = {
    inserted: 0,
    errors: [],
  };

  const transaction = getDb().transaction((items: ParsedGlossaryImportRow[]) => {
    for (const row of items) {
      try {
        insertStatement.run(
          row.source_term,
          row.target_term,
          row.source_lang,
          row.target_lang,
          row.note,
          row.enabled ? 1 : 0
        );
        result.inserted += 1;
      } catch (error) {
        result.errors.push({
          rowNumber: row.rowNumber,
          stage: "db",
          message: error instanceof Error ? error.message : "Database insert failed",
        });
      }
    }
  });

  transaction(rows);

  return result;
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

// --- app_settings ---

interface AppSettingsRow {
  ui_language: string;
  theme_mode: string;
  default_engine: string;
  default_target_lang: string;
  auto_translate_enabled: number;
  auto_translate_debounce_ms: number;
}

function normalizeAppSettingsRow(row: AppSettingsRow | undefined): AppSettings {
  return normalizeAppSettings(
    row
      ? {
          ui_language: row.ui_language === "zh-CN" ? "zh-CN" : "en",
          theme_mode: normalizeThemeMode(row.theme_mode),
          default_engine: row.default_engine,
          default_target_lang: row.default_target_lang,
          auto_translate_enabled: Boolean(row.auto_translate_enabled),
          auto_translate_debounce_ms: row.auto_translate_debounce_ms,
        }
      : DEFAULT_APP_SETTINGS
  );
}

export function getAppSettings(): AppSettings {
  const row = getDb()
    .prepare(
      `SELECT ui_language, theme_mode, default_engine, default_target_lang, auto_translate_enabled, auto_translate_debounce_ms
       FROM app_settings
       WHERE id = 1`
    )
    .get() as AppSettingsRow | undefined;

  return normalizeAppSettingsRow(row);
}

export function upsertAppSettings(input: Partial<AppSettings>): AppSettings {
  const current = getAppSettings();
  const nextSettings = normalizeAppSettings({
    ...current,
    ...input,
  });

  getDb()
    .prepare(
      `INSERT INTO app_settings (
        id,
        ui_language,
        theme_mode,
        default_engine,
        default_target_lang,
        auto_translate_enabled,
        auto_translate_debounce_ms
      )
      VALUES (1, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        ui_language = excluded.ui_language,
        theme_mode = excluded.theme_mode,
        default_engine = excluded.default_engine,
        default_target_lang = excluded.default_target_lang,
        auto_translate_enabled = excluded.auto_translate_enabled,
        auto_translate_debounce_ms = excluded.auto_translate_debounce_ms,
        updated_at = CURRENT_TIMESTAMP`
    )
    .run(
      nextSettings.ui_language,
      nextSettings.theme_mode,
      nextSettings.default_engine,
      nextSettings.default_target_lang,
      nextSettings.auto_translate_enabled ? 1 : 0,
      nextSettings.auto_translate_debounce_ms
    );

  return nextSettings;
}
