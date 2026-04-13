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
  return Boolean(ENGINE_DEFAULT_NAMES[id]);
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
  const extra = readExtra(config?.extra);
  const logoUrl = typeof extra.logo_url === "string" ? normalizeString(extra.logo_url) : "";

  return NextResponse.json({
    id,
    name: config?.name || ENGINE_DEFAULT_NAMES[id],
    configured: Boolean(apiKey && (baseUrl || id === "openai")),
    api_key_configured: Boolean(apiKey),
    model: config?.model || "",
    base_url: baseUrl,
    logo_url: logoUrl,
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
  const name = normalizeString(body.name) || existing?.name || ENGINE_DEFAULT_NAMES[id];
  const model = typeof body.model === "string" ? body.model.trim() : existing?.model || "";
  const existingExtra = readExtra(existing?.extra);
  const logoUrl =
    typeof body.logo_url === "string"
      ? normalizeString(body.logo_url)
      : typeof existingExtra.logo_url === "string"
        ? normalizeString(existingExtra.logo_url)
        : "";

  if (!apiKey) {
    return NextResponse.json({ error: "api_key is required" }, { status: 400 });
  }

  if (id === "custom-openai" && !baseUrl) {
    return NextResponse.json({ error: "base_url is required" }, { status: 400 });
  }

  upsertEngineConfig({
    id,
    name,
    api_key: apiKey,
    model,
    base_url: baseUrl,
    extra: JSON.stringify({
      ...existingExtra,
      logo_url: logoUrl,
    }),
  });

  return NextResponse.json({ ok: true });
}
