import { readFileSync } from "node:fs";

const mermaidRenderer = readFileSync("components/MermaidRenderer.tsx", "utf8");
for (const expected of [
  "function trimSvgToContentBounds(",
  "contentGroup.getBBox()",
  'trimSvgToContentBounds(svg);',
  'svg.setAttribute(\n      "viewBox",',
]) {
  if (!mermaidRenderer.includes(expected)) {
    throw new Error(`MermaidRenderer must include ${expected}`);
  }
}

console.log("mermaid trim viewbox contract passed");
