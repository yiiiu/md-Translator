import { NextRequest, NextResponse } from "next/server";
import { upsertEngineConfig } from "@/lib/db";

const ENGINE_DEFAULT_NAMES: Record<string, string> = {
  openai: "OpenAI",
  "custom-openai": "Custom OpenAI-Compatible",
};

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  if (!ENGINE_DEFAULT_NAMES[id]) {
    return NextResponse.json({ error: "Unsupported engine" }, { status: 400 });
  }

  if (!body.api_key) {
    return NextResponse.json({ error: "api_key is required" }, { status: 400 });
  }

  if (id === "custom-openai" && !body.base_url) {
    return NextResponse.json({ error: "base_url is required" }, { status: 400 });
  }

  upsertEngineConfig({
    id,
    name: body.name?.trim() || ENGINE_DEFAULT_NAMES[id],
    api_key: body.api_key,
    model: body.model || "",
    base_url: body.base_url || "",
    extra: "{}",
  });

  return NextResponse.json({ ok: true });
}
