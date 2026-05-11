import test from "node:test";
import assert from "node:assert/strict";

import { mapMarkdownToParagraphs, normalizeMarkdownImport } from "./markdown-import.ts";

test("mapMarkdownToParagraphs returns normalized paragraph payloads", () => {
  const paragraphs = mapMarkdownToParagraphs("\uFEFF# Title\r\n\r\nBody");

  assert.deepEqual(paragraphs, [
    {
      id: "p-0",
      type: "heading",
      original: "# Title",
      translated: "",
      status: "idle",
    },
    {
      id: "p-1",
      type: "paragraph",
      original: "Body",
      translated: "",
      status: "idle",
    },
  ]);
});

test("normalizeMarkdownImport wraps Mermaid files after normalizing input", () => {
  assert.equal(
    normalizeMarkdownImport("\uFEFFgraph TD\r\n  A --> B\r\n", "flow.mmd"),
    "```mermaid\ngraph TD\n  A --> B\n```",
  );
});