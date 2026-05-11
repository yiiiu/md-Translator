import type {
  GlossaryImportError,
  ParsedGlossaryImportRow,
} from "../glossary-import";
import { getDb } from "./connection";

export interface GlossaryTerm {
  id: number;
  source_term: string;
  target_term: string;
  source_lang: string;
  target_lang: string;
  note: string;
  enabled: number;
  created_at: string;
  updated_at: string;
}

export interface GlossaryTermInput {
  source_term: string;
  target_term: string;
  source_lang: string;
  target_lang: string;
  note?: string;
  enabled?: boolean;
}

export interface GlossaryListFilters {
  q?: string;
  enabled?: string;
  source_lang?: string;
  target_lang?: string;
}

export interface BulkCreateGlossaryTermsResult {
  inserted: number;
  errors: GlossaryImportError[];
}

function normalizeGlossaryTerm(row: GlossaryTerm): GlossaryTerm {
  return {
    ...row,
    enabled: row.enabled ? 1 : 0,
  };
}

export function listGlossaryTerms(filters?: GlossaryListFilters): GlossaryTerm[] {
  const where: string[] = [];
  const values: Array<string | number> = [];

  const q = filters?.q?.trim();
  if (q) {
    where.push("(source_term LIKE ? OR target_term LIKE ? OR note LIKE ?)");
    const like = `%${q}%`;
    values.push(like, like, like);
  }

  if (filters?.enabled === "true" || filters?.enabled === "false") {
    where.push("enabled = ?");
    values.push(filters.enabled === "true" ? 1 : 0);
  }

  const sourceLang = filters?.source_lang?.trim();
  if (sourceLang) {
    where.push("source_lang = ?");
    values.push(sourceLang);
  }

  const targetLang = filters?.target_lang?.trim();
  if (targetLang) {
    where.push("target_lang = ?");
    values.push(targetLang);
  }

  const whereClause = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";
  const rows = getDb()
    .prepare(
      `SELECT id, source_term, target_term, source_lang, target_lang, note, enabled, created_at, updated_at
       FROM glossary_terms
       ${whereClause}
       ORDER BY enabled DESC, datetime(updated_at) DESC, id DESC`
    )
    .all(...values) as GlossaryTerm[];

  return rows.map(normalizeGlossaryTerm);
}

export function listGlossaryLanguages(): {
  source_languages: string[];
  target_languages: string[];
} {
  const sourceRows = getDb()
    .prepare(
      `SELECT DISTINCT source_lang
       FROM glossary_terms
       WHERE source_lang <> ''
       ORDER BY source_lang ASC`
    )
    .all() as Array<{ source_lang: string }>;

  const targetRows = getDb()
    .prepare(
      `SELECT DISTINCT target_lang
       FROM glossary_terms
       WHERE target_lang <> ''
       ORDER BY target_lang ASC`
    )
    .all() as Array<{ target_lang: string }>;

  return {
    source_languages: sourceRows.map((row) => row.source_lang),
    target_languages: targetRows.map((row) => row.target_lang),
  };
}

export function getGlossaryTerm(id: number): GlossaryTerm | undefined {
  const row = getDb()
    .prepare(
      `SELECT id, source_term, target_term, source_lang, target_lang, note, enabled, created_at, updated_at
       FROM glossary_terms
       WHERE id = ?`
    )
    .get(id) as GlossaryTerm | undefined;

  return row ? normalizeGlossaryTerm(row) : undefined;
}

export function createGlossaryTerm(input: GlossaryTermInput): GlossaryTerm {
  const result = getDb()
    .prepare(
      `INSERT INTO glossary_terms (source_term, target_term, source_lang, target_lang, note, enabled)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(
      input.source_term.trim(),
      input.target_term.trim(),
      input.source_lang.trim(),
      input.target_lang.trim(),
      input.note?.trim() || "",
      input.enabled === false ? 0 : 1
    );

  return getGlossaryTerm(Number(result.lastInsertRowid))!;
}

export function bulkCreateGlossaryTerms(
  rows: ParsedGlossaryImportRow[]
): BulkCreateGlossaryTermsResult {
  if (rows.length === 0) {
    return { inserted: 0, errors: [] };
  }

  const insertStatement = getDb().prepare(
    `INSERT INTO glossary_terms (source_term, target_term, source_lang, target_lang, note, enabled)
     VALUES (?, ?, ?, ?, ?, ?)`
  );

  const result: BulkCreateGlossaryTermsResult = {
    inserted: 0,
    errors: [],
  };

  const transaction = getDb().transaction((items: ParsedGlossaryImportRow[]) => {
    for (const row of items) {
      try {
        insertStatement.run(
          row.source_term,
          row.target_term,
          row.source_lang,
          row.target_lang,
          row.note,
          row.enabled ? 1 : 0
        );
        result.inserted += 1;
      } catch (error) {
        result.errors.push({
          rowNumber: row.rowNumber,
          stage: "db",
          message: error instanceof Error ? error.message : "Database insert failed",
        });
      }
    }
  });

  transaction(rows);

  return result;
}

export function updateGlossaryTerm(
  id: number,
  input: Partial<GlossaryTermInput>
): GlossaryTerm | undefined {
  const existing = getGlossaryTerm(id);
  if (!existing) {
    return undefined;
  }

  getDb()
    .prepare(
      `UPDATE glossary_terms
       SET source_term = ?,
           target_term = ?,
           source_lang = ?,
           target_lang = ?,
           note = ?,
           enabled = ?,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`
    )
    .run(
      typeof input.source_term === "string" ? input.source_term.trim() : existing.source_term,
      typeof input.target_term === "string" ? input.target_term.trim() : existing.target_term,
      typeof input.source_lang === "string" ? input.source_lang.trim() : existing.source_lang,
      typeof input.target_lang === "string" ? input.target_lang.trim() : existing.target_lang,
      typeof input.note === "string" ? input.note.trim() : existing.note,
      typeof input.enabled === "boolean" ? (input.enabled ? 1 : 0) : existing.enabled,
      id
    );

  return getGlossaryTerm(id);
}

export function deleteGlossaryTerm(id: number): void {
  getDb().prepare("DELETE FROM glossary_terms WHERE id = ?").run(id);
}