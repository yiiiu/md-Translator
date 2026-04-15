import { readFileSync } from "node:fs";

const mermaidRenderer = readFileSync("components/MermaidRenderer.tsx", "utf8");
for (const expected of [
  "function mountPanAndZoom(",
  'block.classList.add("is-interactive")',
  'svg.setAttribute(\n      "viewBox",',
  'block.addEventListener("pointerdown"',
  'block.addEventListener("wheel"',
  "const initialViewBox =",
  "viewBox.width / rect.width",
  "nextWidth = initialViewBox.width / nextScale",
]) {
  if (!mermaidRenderer.includes(expected)) {
    throw new Error(`MermaidRenderer must include ${expected}`);
  }
}

const globals = readFileSync("app/globals.css", "utf8");
for (const expected of [
  ".markdown-rendered .mermaid-block.is-interactive",
  ".markdown-rendered .mermaid-block svg",
  "cursor: grab;",
]) {
  if (!globals.includes(expected)) {
    throw new Error(`globals.css must include ${expected}`);
  }
}

if (globals.includes("--mermaid-scale") || globals.includes("scale(var(--mermaid-scale))")) {
  throw new Error("globals.css must not use CSS transform scaling for Mermaid pan/zoom");
}

console.log("mermaid pan zoom contract passed");
