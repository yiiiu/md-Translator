import { NextRequest, NextResponse } from "next/server";
import { deleteEngineConfig, getEngineConfig } from "@/lib/db";

function isCustomProviderId(id: string) {
  return id === "custom-openai" || id.startsWith("custom-openai-");
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!isCustomProviderId(id)) {
    return NextResponse.json({ ok: false, error: "Only custom providers can be deleted" });
  }

  if (!getEngineConfig(id)) {
    return NextResponse.json({ ok: false, error: "Provider not found" }, { status: 404 });
  }

  deleteEngineConfig(id);
  return NextResponse.json({ ok: true });
}
