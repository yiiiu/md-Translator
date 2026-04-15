import { readFileSync } from "node:fs";

const mermaidUtils = readFileSync("utils/mermaid.ts", "utf8");
for (const expected of [
  "export function looksLikeRawMermaid(",
  '"flowchart"',
  '"sequenceDiagram"',
]) {
  if (!mermaidUtils.includes(expected)) {
    throw new Error(`utils/mermaid.ts must include ${expected}`);
  }
}

const previewPane = readFileSync("components/PreviewPane.tsx", "utf8");
for (const expected of [
  "looksLikeRawMermaid(outputMarkdown)",
  "CombinedMarkdownPreview",
  'content={`\\`\\`\\`mermaid',
]) {
  if (!previewPane.includes(expected)) {
    throw new Error(`PreviewPane must include ${expected}`);
  }
}

console.log("raw mermaid preview contract passed");
