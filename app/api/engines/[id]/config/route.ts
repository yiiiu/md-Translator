import { NextRequest, NextResponse } from "next/server";
import { upsertEngineConfig } from "@/lib/db";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  if (!body.api_key) {
    return NextResponse.json({ error: "api_key is required" }, { status: 400 });
  }

  const engineName: Record<string, string> = {
    openai: "OpenAI",
  };

  upsertEngineConfig({
    id,
    name: engineName[id] || id,
    api_key: body.api_key,
    model: body.model || "",
    base_url: body.base_url || "",
    extra: "{}",
  });

  return NextResponse.json({ ok: true });
}
