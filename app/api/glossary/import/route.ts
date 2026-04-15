import { NextRequest, NextResponse } from "next/server";
import { bulkCreateGlossaryTerms } from "@/lib/db";
import {
  GlossaryImportFormatError,
  parseGlossaryImportCsv,
} from "@/lib/glossary-import";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const csv = typeof body?.csv === "string" ? body.csv : "";

  if (!csv.trim()) {
    return NextResponse.json(
      {
        error: "csv is required",
        inserted: 0,
        skipped: 0,
        errors: [
          {
            rowNumber: 1,
            stage: "parse",
            message: "csv is required",
          },
        ],
      },
      { status: 400 }
    );
  }

  try {
    const parsed = parseGlossaryImportCsv(csv);
    const dbResult = bulkCreateGlossaryTerms(parsed.rows);

    return NextResponse.json({
      ok: true,
      inserted: dbResult.inserted,
      skipped: parsed.skipped,
      errors: [...parsed.errors, ...dbResult.errors],
    });
  } catch (error) {
    if (error instanceof GlossaryImportFormatError) {
      return NextResponse.json(
        {
          error: error.message,
          inserted: 0,
          skipped: 0,
          errors: [
            {
              rowNumber: error.rowNumber ?? 1,
              stage: "parse",
              message: error.message,
            },
          ],
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to import glossary CSV",
        inserted: 0,
        skipped: 0,
        errors: [],
      },
      { status: 500 }
    );
  }
}
