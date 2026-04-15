import test from "node:test";
import assert from "node:assert/strict";

import {
  GlossaryImportFormatError,
  parseGlossaryImportCsv,
} from "./glossary-import.ts";

test("parseGlossaryImportCsv handles BOM, quoted values, escaped quotes, and defaults", () => {
  const csv = [
    "\uFEFFsource_term,target_term,source_lang,target_lang,note,enabled",
    '"hello, world","你好 ""世界""",,,"keeps, commas",',
    "bye,再见,ja,en,,false",
  ].join("\r\n");

  const result = parseGlossaryImportCsv(csv);

  assert.equal(result.skipped, 0);
  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.rows, [
    {
      rowNumber: 2,
      source_term: "hello, world",
      target_term: '你好 "世界"',
      source_lang: "en",
      target_lang: "zh-CN",
      note: "keeps, commas",
      enabled: true,
    },
    {
      rowNumber: 3,
      source_term: "bye",
      target_term: "再见",
      source_lang: "ja",
      target_lang: "en",
      note: "",
      enabled: false,
    },
  ]);
});

test("parseGlossaryImportCsv rejects files missing required headers", () => {
  assert.throws(
    () => parseGlossaryImportCsv("target_term,source_lang\nfoo,en"),
    (error: unknown) =>
      error instanceof GlossaryImportFormatError &&
      error.message.includes("source_term"),
  );
});

test("parseGlossaryImportCsv reports row validation errors and skips blank lines", () => {
  const csv = [
    "source_term,target_term,source_lang,target_lang,note,enabled",
    "",
    "alpha,阿尔法,,,,",
    ",missing source,en,zh-CN,,true",
    "bad enabled,坏值,en,zh-CN,,maybe",
  ].join("\n");

  const result = parseGlossaryImportCsv(csv);

  assert.equal(result.skipped, 1);
  assert.deepEqual(result.rows, [
    {
      rowNumber: 3,
      source_term: "alpha",
      target_term: "阿尔法",
      source_lang: "en",
      target_lang: "zh-CN",
      note: "",
      enabled: true,
    },
  ]);
  assert.deepEqual(result.errors, [
    {
      rowNumber: 4,
      stage: "validation",
      message: "source_term is required",
    },
    {
      rowNumber: 5,
      stage: "validation",
      message: "enabled must be a boolean value",
    },
  ]);
});
