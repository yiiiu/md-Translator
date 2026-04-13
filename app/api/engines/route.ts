import { NextResponse } from "next/server";
import { getAllEngineConfigs, upsertEngineConfig } from "@/lib/db";

const SUPPORTED_ENGINES = [
  { id: "openai", name: "OpenAI", logo_url: "", builtin: true },
];

function readExtra(extra: string | undefined) {
  if (!extra) return {};

  try {
    const parsed = JSON.parse(extra) as Record<string, unknown>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function normalizeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function isCustomProviderId(id: string) {
  return id === "custom-openai" || id.startsWith("custom-openai-");
}

export async function GET() {
  const configs = getAllEngineConfigs();
  const configMap = new Map(configs.map((config) => [config.id, config]));

  const builtinEngines = SUPPORTED_ENGINES.map((engine) => {
    const configured = configMap.get(engine.id);
    const apiKey = normalizeString(configured?.api_key);
    const baseUrl = normalizeString(configured?.base_url);
    const extra = readExtra(configured?.extra);
    const logoUrl =
      typeof extra.logo_url === "string" ? extra.logo_url.trim() : engine.logo_url;

    return {
      id: engine.id,
      name: configured?.name || engine.name,
      base_url: baseUrl,
      logo_url: logoUrl,
      configured: Boolean(apiKey && (baseUrl || engine.id === "openai")),
      builtin: engine.builtin,
    };
  });

  const customEngines = configs
    .filter((config) => isCustomProviderId(config.id))
    .map((config) => {
      const apiKey = normalizeString(config.api_key);
      const baseUrl = normalizeString(config.base_url);
      const extra = readExtra(config.extra);
      const logoUrl = typeof extra.logo_url === "string" ? extra.logo_url.trim() : "";

      return {
        id: config.id,
        name: config.name || "Custom Provider",
        base_url: baseUrl,
        logo_url: logoUrl,
        configured: Boolean(apiKey && baseUrl),
        builtin: false,
      };
    })
    .filter((engine) => !SUPPORTED_ENGINES.some((item) => item.id === engine.id));

  const engines = [...builtinEngines, ...customEngines];

  return NextResponse.json({ engines });
}

export async function POST() {
  const id = `custom-openai-${crypto.randomUUID()}`;

  upsertEngineConfig({
    id,
    name: "Custom Provider",
    api_key: "",
    model: "",
    base_url: "",
    extra: "{}",
  });

  return NextResponse.json({ ok: true, id });
}
