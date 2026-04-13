import { OpenAIEngine } from "@/lib/engines/openai";
import { NextRequest, NextResponse } from "next/server";

function isSupportedEngine(id: string) {
  return id === "openai" || id === "custom-openai" || id.startsWith("custom-openai-");
}

function normalizeString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!isSupportedEngine(id)) {
    return NextResponse.json({ ok: false, error: "Unsupported engine" });
  }

  const body = await request.json();
  const apiKey = normalizeString(body.api_key);
  const baseUrl = normalizeString(body.base_url);

  if (!apiKey || !baseUrl) {
    return NextResponse.json({ ok: false, error: "api_key and base_url are required" });
  }

  try {
    const models = await OpenAIEngine.fetchModels(apiKey, baseUrl);
    return NextResponse.json({ ok: true, models });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : "Request failed",
    });
  }
}
