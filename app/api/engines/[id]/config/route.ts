import { NextRequest, NextResponse } from "next/server";
import { getEngineConfig, upsertEngineConfig } from "@/lib/db";

const ENGINE_DEFAULT_NAMES: Record<string, string> = {
  openai: "OpenAI",
  "custom-openai": "Custom OpenAI-Compatible",
};

function normalizeString(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function readExtra(extra: string | undefined) {
  if (!extra) return {};

  try {
    const parsed = JSON.parse(extra) as Record<string, unknown>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function isSupportedEngine(id: string) {
  return id === "openai" || id === "custom-openai" || id.startsWith("custom-openai-");
}

function defaultNameFor(id: string) {
  return ENGINE_DEFAULT_NAMES[id] || "Custom Provider";
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!isSupportedEngine(id)) {
    return NextResponse.json({ error: "Unsupported engine" }, { status: 400 });
  }

  const config = getEngineConfig(id);
  const apiKey = normalizeString(config?.api_key);
  const baseUrl = normalizeString(config?.base_url);

  return NextResponse.json({
    id,
    name: config?.name || defaultNameFor(id),
    configured: Boolean(apiKey && (baseUrl || id === "openai")),
    api_key_configured: Boolean(apiKey),
    api_key: apiKey,
    model: config?.model || "",
    base_url: baseUrl,
    builtin: id === "openai",
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  if (!isSupportedEngine(id)) {
    return NextResponse.json({ error: "Unsupported engine" }, { status: 400 });
  }

  const existing = getEngineConfig(id);
  const apiKey = normalizeString(body.api_key) || existing?.api_key || "";
  const baseUrl =
    typeof body.base_url === "string"
      ? normalizeString(body.base_url)
      : existing?.base_url || "";
  const name = normalizeString(body.name) || existing?.name || defaultNameFor(id);
  const model = typeof body.model === "string" ? body.model.trim() : existing?.model || "";
  const existingExtra = readExtra(existing?.extra);

  if (!apiKey) {
    return NextResponse.json({ error: "api_key is required" }, { status: 400 });
  }

  if (id !== "openai" && !baseUrl) {
    return NextResponse.json({ error: "base_url is required" }, { status: 400 });
  }

  upsertEngineConfig({
    id,
    name,
    api_key: apiKey,
    model,
    base_url: baseUrl,
    extra: JSON.stringify(
      Object.fromEntries(
        Object.entries(existingExtra).filter(([key]) => key !== "logo_url")
      )
    ),
  });

  return NextResponse.json({ ok: true });
}
