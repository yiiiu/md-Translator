import { NextResponse } from "next/server";
import { getAllEngineConfigs } from "@/lib/db";

const SUPPORTED_ENGINES = [
  { id: "openai", name: "OpenAI" },
];

export async function GET() {
  const configs = getAllEngineConfigs();
  const configuredIds = new Set(configs.map((c) => c.id));

  const engines = SUPPORTED_ENGINES.map((e) => ({
    ...e,
    configured: configuredIds.has(e.id),
  }));

  return NextResponse.json({ engines });
}
