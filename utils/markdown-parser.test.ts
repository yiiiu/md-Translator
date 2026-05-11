import test from "node:test";
import assert from "node:assert/strict";

import { parseMarkdown } from "./markdown-parser.ts";

test("parseMarkdown normalizes BOM and CRLF before classifying blocks", () => {
  const paragraphs = parseMarkdown("\uFEFF# Title\r\n\r\nParagraph line\r\n");

  assert.deepEqual(
    paragraphs.map(({ type, content }) => ({ type, content })),
    [
      { type: "heading", content: "# Title" },
      { type: "paragraph", content: "Paragraph line" },
    ],
  );
});

test("parseMarkdown treats hashtag text as a paragraph, not a heading", () => {
  const paragraphs = parseMarkdown("#hashtag is not an ATX heading");

  assert.equal(paragraphs.length, 1);
  assert.equal(paragraphs[0].type, "paragraph");
  assert.equal(paragraphs[0].content, "#hashtag is not an ATX heading");
});

test("parseMarkdown supports tilde fences and mermaid info strings", () => {
  const paragraphs = parseMarkdown([
    "~~~Mermaid title=Flow",
    "graph TD",
    "  A --> B",
    "~~~",
  ].join("\n"));

  assert.equal(paragraphs.length, 1);
  assert.equal(paragraphs[0].type, "mermaid");
  assert.equal(
    paragraphs[0].content,
    ["~~~Mermaid title=Flow", "graph TD", "  A --> B", "~~~"].join("\n"),
  );
});

test("parseMarkdown keeps wrapped and nested list lines in the same list item", () => {
  const paragraphs = parseMarkdown([
    "- first item",
    "  wrapped continuation",
    "  - nested item",
    "- second item",
  ].join("\n"));

  assert.deepEqual(
    paragraphs.map(({ type, content }) => ({ type, content })),
    [
      {
        type: "list",
        content: ["- first item", "  wrapped continuation", "  - nested item"].join("\n"),
      },
      { type: "list", content: "- second item" },
    ],
  );
});

test("parseMarkdown recognizes pipe tables without a leading pipe", () => {
  const paragraphs = parseMarkdown([
    "Name | Value",
    "--- | ---",
    "Alpha | 1",
  ].join("\n"));

  assert.equal(paragraphs.length, 1);
  assert.equal(paragraphs[0].type, "table");
  assert.equal(paragraphs[0].content, ["Name | Value", "--- | ---", "Alpha | 1"].join("\n"));
});

test("parseMarkdown allows indented blockquotes and lazy continuation", () => {
  const paragraphs = parseMarkdown([
    "  > quoted line",
    "continued quote",
    "",
    "outside",
  ].join("\n"));

  assert.deepEqual(
    paragraphs.map(({ type, content }) => ({ type, content })),
    [
      { type: "blockquote", content: ["  > quoted line", "continued quote"].join("\n") },
      { type: "paragraph", content: "outside" },
    ],
  );
});