import { OpenAIEngine } from "@/lib/engines/openai";
import { NextRequest, NextResponse } from "next/server";

const SUPPORTED_ENGINES = new Set(["openai", "custom-openai"]);

function normalizeString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!SUPPORTED_ENGINES.has(id)) {
    return NextResponse.json({ ok: false, error: "Unsupported engine" });
  }

  const body = await request.json();
  const apiKey = normalizeString(body.api_key);
  const baseUrl = normalizeString(body.base_url);
  const model = normalizeString(body.model);

  if (!apiKey || !baseUrl || !model) {
    return NextResponse.json({ ok: false, error: "api_key, base_url, and model are required" });
  }

  try {
    await OpenAIEngine.testModel(apiKey, baseUrl, model);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : "Request failed",
    });
  }
}
