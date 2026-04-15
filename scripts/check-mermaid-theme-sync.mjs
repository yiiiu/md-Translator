import { readFileSync } from "node:fs";

const mermaidRenderer = readFileSync("components/MermaidRenderer.tsx", "utf8");
for (const expected of [
  "themeMode: \"light\" | \"dark\"",
  'theme: themeMode === "dark" ? "dark" : "default"',
  "}, [containerRef, contentKey, themeMode]);",
]) {
  if (!mermaidRenderer.includes(expected)) {
    throw new Error(`MermaidRenderer must include ${expected}`);
  }
}

const paragraphBlock = readFileSync("components/ParagraphBlock.tsx", "utf8");
if (!paragraphBlock.includes("useMermaidRenderer(articleRef, renderedContent, resolvedTheme);")) {
  throw new Error(
    "ParagraphBlock must pass the resolved theme into MermaidRenderer"
  );
}

const previewPane = readFileSync("components/PreviewPane.tsx", "utf8");
if (!previewPane.includes("useMermaidRenderer(articleRef, renderedContent, resolvedTheme);")) {
  throw new Error(
    "CombinedMarkdownPreview must pass the resolved theme into MermaidRenderer"
  );
}

console.log("mermaid theme sync contract passed");
