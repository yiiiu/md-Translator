import { NextResponse } from "next/server";
import { getAllEngineConfigs } from "@/lib/db";

const SUPPORTED_ENGINES = [
  { id: "openai", name: "OpenAI", logo_url: "" },
  { id: "custom-openai", name: "Custom OpenAI-Compatible", logo_url: "" },
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

export async function GET() {
  const configs = getAllEngineConfigs();
  const configMap = new Map(configs.map((config) => [config.id, config]));

  const engines = SUPPORTED_ENGINES.map((engine) => {
    const configured = configMap.get(engine.id);
    const apiKey = typeof configured?.api_key === "string" ? configured.api_key.trim() : "";
    const baseUrl = typeof configured?.base_url === "string" ? configured.base_url.trim() : "";
    const extra = readExtra(configured?.extra);
    const logoUrl =
      typeof extra.logo_url === "string" ? extra.logo_url.trim() : engine.logo_url;

    return {
      id: engine.id,
      name: configured?.name || engine.name,
      logo_url: logoUrl,
      configured: Boolean(apiKey && (baseUrl || engine.id === "openai")),
    };
  });

  return NextResponse.json({ engines });
}
