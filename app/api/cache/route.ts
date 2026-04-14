import { NextResponse } from "next/server";
import { clearCache, getCacheStats } from "@/lib/db";

export async function GET() {
  return NextResponse.json(getCacheStats());
}

export async function DELETE() {
  clearCache();
  return NextResponse.json({ ok: true });
}
