import MarkdownIt from "markdown-it";
import katex from "katex";
import { codeToHtml } from "shiki/bundle/web";
import type { BundledLanguage } from "shiki";

const markdown = new MarkdownIt({
  html: false,
  linkify: true,
  typographer: true,
});

const fencePattern = /(^|\n)```([^\n`]*)\n([\s\S]*?)\n```(?=\n|$)/g;

export async function renderMarkdown(
  source: string,
  themeMode: "light" | "dark" = "light"
): Promise<string> {
  const highlightedBlocks: string[] = [];
  const markdownWithoutFences = await replaceFencedCode(source, highlightedBlocks, themeMode);
  const katexProcessed = renderKatex(markdownWithoutFences);
  let rendered = markdown.render(katexProcessed);

  highlightedBlocks.forEach((block, index) => {
    const marker = `@@SHIKI_BLOCK_${index}@@`;
    rendered = rendered
      .replace(`<p>${marker}</p>`, block)
      .replace(marker, block);
  });

  return rendered;
}

async function replaceFencedCode(
  source: string,
  highlightedBlocks: string[],
  themeMode: "light" | "dark"
) {
  let cursor = 0;
  let output = "";

  for (const match of source.matchAll(fencePattern)) {
    const [fullMatch, prefix, rawInfo, code] = match;
    const start = match.index ?? 0;

    output += source.slice(cursor, start);
    output += prefix;

    if (parseLanguage(rawInfo) === "mermaid") {
      const marker = `@@SHIKI_BLOCK_${highlightedBlocks.length}@@`;
      highlightedBlocks.push(
        `<div class="mermaid-block" data-mermaid="${encodeURIComponent(code)}">${escapeHtml(
          code
        )}</div>`
      );
      output += marker;
      cursor = start + fullMatch.length;
      continue;
    }

    const marker = `@@SHIKI_BLOCK_${highlightedBlocks.length}@@`;
    highlightedBlocks.push(
      await highlightCode(code, parseLanguage(rawInfo), themeMode)
    );
    output += marker;

    cursor = start + fullMatch.length;
  }

  output += source.slice(cursor);
  return output;
}

function parseLanguage(info: string) {
  return info.trim().split(/\s+/)[0] || "text";
}

async function highlightCode(
  code: string,
  language: string,
  themeMode: "light" | "dark"
) {
  try {
    return await codeToHtml(code, {
      lang: language as BundledLanguage,
      theme: themeMode === "dark" ? "github-dark" : "github-light",
    });
  } catch {
    return `<pre class="shiki fallback"><code>${escapeHtml(code)}</code></pre>`;
  }
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderKatex(source: string): string {
  let nextSource = source.replace(/\$\$([\s\S]+?)\$\$/g, (_, math: string) => {
    try {
      return katex.renderToString(math.trim(), {
        displayMode: true,
        throwOnError: false,
      });
    } catch {
      return `<span class="katex-error">${escapeHtml(math)}</span>`;
    }
  });

  nextSource = nextSource.replace(/\$([^\n$]+?)\$/g, (_, math: string) => {
    try {
      return katex.renderToString(math.trim(), {
        displayMode: false,
        throwOnError: false,
      });
    } catch {
      return `<span class="katex-error">${escapeHtml(math)}</span>`;
    }
  });

  return nextSource;
}
