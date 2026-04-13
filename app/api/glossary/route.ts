import { NextRequest, NextResponse } from "next/server";
import {
  createGlossaryTerm,
  listGlossaryLanguages,
  listGlossaryTerms,
} from "@/lib/db";

function normalizeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const terms = listGlossaryTerms({
    q: searchParams.get("q") || "",
    enabled: searchParams.get("enabled") || "",
    source_lang: searchParams.get("source_lang") || "",
    target_lang: searchParams.get("target_lang") || "",
  });
  const languages = listGlossaryLanguages();

  return NextResponse.json({
    terms,
    source_languages: languages.source_languages,
    target_languages: languages.target_languages,
  });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const sourceTerm = normalizeString(body.source_term);
  const targetTerm = normalizeString(body.target_term);
  const sourceLang = normalizeString(body.source_lang);
  const targetLang = normalizeString(body.target_lang);
  const note = normalizeString(body.note);

  if (!sourceTerm || !targetTerm) {
    return NextResponse.json(
      { error: "source_term and target_term are required" },
      { status: 400 }
    );
  }

  if (!sourceLang || !targetLang) {
    return NextResponse.json(
      { error: "source_lang and target_lang are required" },
      { status: 400 }
    );
  }

  const term = createGlossaryTerm({
    source_term: sourceTerm,
    target_term: targetTerm,
    source_lang: sourceLang,
    target_lang: targetLang,
    note,
    enabled: body.enabled !== false,
  });

  return NextResponse.json({ ok: true, term });
}
