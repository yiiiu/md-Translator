import { NextResponse } from "next/server";
import { getAllEngineConfigs } from "@/lib/db";

const SUPPORTED_ENGINES = [
  { id: "openai", name: "OpenAI" },
  { id: "custom-openai", name: "Custom OpenAI-Compatible" },
];

export async function GET() {
  const configs = getAllEngineConfigs();
  const configMap = new Map(configs.map((config) => [config.id, config]));

  const engines = SUPPORTED_ENGINES.map((engine) => {
    const configured = configMap.get(engine.id);
    const apiKey = typeof configured?.api_key === "string" ? configured.api_key.trim() : "";
    const baseUrl = typeof configured?.base_url === "string" ? configured.base_url.trim() : "";

    return {
      id: engine.id,
      name: configured?.name || engine.name,
      configured: Boolean(apiKey && (baseUrl || engine.id === "openai")),
    };
  });

  return NextResponse.json({ engines });
}
