import { decrypt, encrypt } from "../crypto";
import { getDb } from "./connection";
import { getAppSettings } from "./settings";

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