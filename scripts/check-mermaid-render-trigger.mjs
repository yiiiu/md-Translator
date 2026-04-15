import { readFileSync } from "node:fs";

const mermaidRenderer = readFileSync("components/MermaidRenderer.tsx", "utf8");
for (const expected of [
  "contentKey: string",
  "}, [containerRef, contentKey, themeMode]);",
]) {
  if (!mermaidRenderer.includes(expected)) {
    throw new Error(`MermaidRenderer must include ${expected}`);
  }
}

const paragraphBlock = readFileSync("components/ParagraphBlock.tsx", "utf8");
if (!paragraphBlock.includes("useMermaidRenderer(articleRef, renderedContent, resolvedTheme);")) {
  throw new Error(
    "ParagraphBlock must re-trigger Mermaid rendering when renderedContent changes"
  );
}

console.log("mermaid render trigger contract passed");
