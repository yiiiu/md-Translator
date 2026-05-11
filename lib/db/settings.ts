import {
  DEFAULT_APP_SETTINGS,
  normalizeAppSettings,
  normalizeThemeMode,
  type AppSettings,
} from "../app-settings";
import { getDb } from "./connection";

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