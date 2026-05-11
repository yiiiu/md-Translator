import type Database from "better-sqlite3";
import { DEFAULT_APP_SETTINGS } from "../app-settings";

export function createTables(db: Database.Database) {
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