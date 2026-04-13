import { NextRequest, NextResponse } from "next/server";
import {
  deleteGlossaryTerm,
  getGlossaryTerm,
  updateGlossaryTerm,
} from "@/lib/db";

function parseGlossaryId(value: string) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const glossaryId = parseGlossaryId(id);
  if (!glossaryId) {
    return NextResponse.json({ error: "Invalid glossary id" }, { status: 400 });
  }

  const body = await request.json();
  const nextTerm = updateGlossaryTerm(glossaryId, {
    source_term:
      typeof body.source_term === "string" ? body.source_term.trim() : undefined,
    target_term:
      typeof body.target_term === "string" ? body.target_term.trim() : undefined,
    source_lang:
      typeof body.source_lang === "string" ? body.source_lang.trim() : undefined,
    target_lang:
      typeof body.target_lang === "string" ? body.target_lang.trim() : undefined,
    note: typeof body.note === "string" ? body.note.trim() : undefined,
    enabled: typeof body.enabled === "boolean" ? body.enabled : undefined,
  });

  if (!nextTerm) {
    return NextResponse.json({ error: "Glossary term not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, term: nextTerm });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const glossaryId = parseGlossaryId(id);
  if (!glossaryId) {
    return NextResponse.json({ error: "Invalid glossary id" }, { status: 400 });
  }

  if (!getGlossaryTerm(glossaryId)) {
    return NextResponse.json({ error: "Glossary term not found" }, { status: 404 });
  }

  deleteGlossaryTerm(glossaryId);
  return NextResponse.json({ ok: true });
}
