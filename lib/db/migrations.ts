import type Database from "better-sqlite3";

const APP_SETTINGS_COLUMNS = [
  {
    name: "theme_mode",
    definition: "theme_mode TEXT NOT NULL DEFAULT 'system'",
  },
  {
    name: "default_engine",
    definition: "default_engine TEXT NOT NULL DEFAULT 'openai'",
  },
  {
    name: "default_target_lang",
    definition: "default_target_lang TEXT NOT NULL DEFAULT 'zh-CN'",
  },
  {
    name: "auto_translate_enabled",
    definition: "auto_translate_enabled INTEGER NOT NULL DEFAULT 1",
  },
  {
    name: "auto_translate_debounce_ms",
    definition: "auto_translate_debounce_ms INTEGER NOT NULL DEFAULT 1500",
  },
];

export function ensureAppSettingsColumns(db: Database.Database) {
  const columns = db
    .prepare("PRAGMA table_info(app_settings)")
    .all() as Array<{ name: string }>;
  const columnNames = new Set(columns.map((column) => column.name));

  for (const column of APP_SETTINGS_COLUMNS) {
    if (!columnNames.has(column.name)) {
      db.exec(`ALTER TABLE app_settings ADD COLUMN ${column.definition}`);
    }
  }
}