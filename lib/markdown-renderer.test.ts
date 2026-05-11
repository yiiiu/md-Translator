import test from "node:test";
import assert from "node:assert/strict";

import { renderMarkdown } from "./markdown-renderer.ts";

test("renderMarkdown highlights CRLF fenced code with trailing spaces on the closing fence", async () => {
  const html = await renderMarkdown("```ts\r\nconst value = 1;\r\n```   \r\n");

  assert.match(html, /shiki/);
  assert.match(html, /const/);
  assert.doesNotMatch(html, /<code>```ts/);
});

test("renderMarkdown handles tilde mermaid fences with extended info strings", async () => {
  const html = await renderMarkdown([
    "~~~Mermaid title=Flow",
    "graph TD",
    "  A --> B",
    "~~~",
  ].join("\n"));

  assert.match(html, /class="mermaid-block"/);
  assert.match(html, /data-mermaid=/);
  assert.match(html, /graph TD/);
});

test("renderMarkdown keeps raw HTML escaped", async () => {
  const html = await renderMarkdown("<script>alert(1)</script>");

  assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.doesNotMatch(html, /<script>/);
});

test("renderMarkdown renders KaTeX math without escaping generated markup", async () => {
  const html = await renderMarkdown("Euler: $e^{i\\pi}+1=0$");

  assert.match(html, /katex/);
  assert.doesNotMatch(html, /&lt;span class=&quot;katex/);
});