import { NextRequest, NextResponse } from "next/server";
import { upsertEngineConfig } from "@/lib/db";

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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  if (!ENGINE_DEFAULT_NAMES[id]) {
    return NextResponse.json({ error: "Unsupported engine" }, { status: 400 });
  }

  const apiKey = normalizeString(body.api_key);
  const baseUrl = normalizeString(body.base_url);
  const name = normalizeString(body.name);

  if (!apiKey) {
    return NextResponse.json({ error: "api_key is required" }, { status: 400 });
  }

  if (id === "custom-openai" && !baseUrl) {
    return NextResponse.json({ error: "base_url is required" }, { status: 400 });
  }

  upsertEngineConfig({
    id,
    name: name || ENGINE_DEFAULT_NAMES[id],
    api_key: apiKey,
    model: typeof body.model === "string" ? body.model : "",
    base_url: baseUrl,
    extra: "{}",
  });

  return NextResponse.json({ ok: true });
}
