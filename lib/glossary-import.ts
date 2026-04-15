export const DEFAULT_GLOSSARY_SOURCE_LANG = "en";
export const DEFAULT_GLOSSARY_TARGET_LANG = "zh-CN";

type GlossaryImportStage = "parse" | "validation" | "db";

export interface ParsedGlossaryImportRow {
  rowNumber: number;
  source_term: string;
  target_term: string;
  source_lang: string;
  target_lang: string;
  note: string;
  enabled: boolean;
}

export interface GlossaryImportError {
  rowNumber: number;
  stage: GlossaryImportStage;
  message: string;
}

export interface GlossaryImportParseResult {
  rows: ParsedGlossaryImportRow[];
  skipped: number;
  errors: GlossaryImportError[];
}

export class GlossaryImportFormatError extends Error {
  readonly stage = "parse";
  readonly rowNumber?: number;

  constructor(message: string, rowNumber?: number) {
    super(message);
    this.name = "GlossaryImportFormatError";
    this.rowNumber = rowNumber;
  }
}

function normalizeHeaderName(value: string) {
  return value.trim().toLowerCase();
}

function parseEnabledValue(value: string) {
  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    return { ok: true as const, value: true };
  }

  if (
    normalized === "true" ||
    normalized === "1" ||
    normalized === "yes" ||
    normalized === "y"
  ) {
    return { ok: true as const, value: true };
  }

  if (
    normalized === "false" ||
    normalized === "0" ||
    normalized === "no" ||
    normalized === "n"
  ) {
    return { ok: true as const, value: false };
  }

  return { ok: false as const, value: true };
}

function parseCsvRows(csv: string) {
  const input = csv.replace(/^\uFEFF/, "");
  if (!input.trim()) {
    throw new GlossaryImportFormatError("CSV content is empty", 1);
  }

  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = "";
  let inQuotes = false;

  const pushField = () => {
    currentRow.push(currentField);
    currentField = "";
  };

  const pushRow = () => {
    pushField();
    rows.push(currentRow);
    currentRow = [];
  };

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];

    if (inQuotes) {
      if (char === '"') {
        if (input[index + 1] === '"') {
          currentField += '"';
          index += 1;
        } else {
          inQuotes = false;
        }
      } else {
        currentField += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      continue;
    }

    if (char === ",") {
      pushField();
      continue;
    }

    if (char === "\n") {
      pushRow();
      continue;
    }

    if (char === "\r") {
      pushRow();
      if (input[index + 1] === "\n") {
        index += 1;
      }
      continue;
    }

    currentField += char;
  }

  if (inQuotes) {
    throw new GlossaryImportFormatError(
      "CSV contains an unclosed quoted field",
      rows.length + 1
    );
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    pushRow();
  }

  return rows;
}

export function parseGlossaryImportCsv(csv: string): GlossaryImportParseResult {
  const rows = parseCsvRows(csv);
  const [headerRow, ...dataRows] = rows;

  if (!headerRow || headerRow.length === 0) {
    throw new GlossaryImportFormatError("CSV header row is required", 1);
  }

  const headerMap = new Map<string, number>();
  headerRow.forEach((header, index) => {
    const normalized = normalizeHeaderName(header);
    if (normalized) {
      headerMap.set(normalized, index);
    }
  });

  if (!headerMap.has("source_term") || !headerMap.has("target_term")) {
    throw new GlossaryImportFormatError(
      "CSV header must include source_term and target_term columns",
      1
    );
  }

  const validRows: ParsedGlossaryImportRow[] = [];
  const errors: GlossaryImportError[] = [];
  let skipped = 0;

  for (let index = 0; index < dataRows.length; index += 1) {
    const row = dataRows[index];
    const rowNumber = index + 2;
    const isBlankRow = row.every((value) => value.trim() === "");

    if (isBlankRow) {
      skipped += 1;
      continue;
    }

    const getValue = (column: string) => {
      const position = headerMap.get(column);
      if (position === undefined) {
        return "";
      }

      return (row[position] ?? "").trim();
    };

    const sourceTerm = getValue("source_term");
    const targetTerm = getValue("target_term");
    const sourceLang = getValue("source_lang") || DEFAULT_GLOSSARY_SOURCE_LANG;
    const targetLang = getValue("target_lang") || DEFAULT_GLOSSARY_TARGET_LANG;
    const note = getValue("note");
    const enabledValue = parseEnabledValue(getValue("enabled"));

    if (!sourceTerm) {
      errors.push({
        rowNumber,
        stage: "validation",
        message: "source_term is required",
      });
      continue;
    }

    if (!targetTerm) {
      errors.push({
        rowNumber,
        stage: "validation",
        message: "target_term is required",
      });
      continue;
    }

    if (!enabledValue.ok) {
      errors.push({
        rowNumber,
        stage: "validation",
        message: "enabled must be a boolean value",
      });
      continue;
    }

    validRows.push({
      rowNumber,
      source_term: sourceTerm,
      target_term: targetTerm,
      source_lang: sourceLang,
      target_lang: targetLang,
      note,
      enabled: enabledValue.value,
    });
  }

  return {
    rows: validRows,
    skipped,
    errors,
  };
}
