import { readFileSync } from "node:fs";

const mermaidRenderer = readFileSync("components/MermaidRenderer.tsx", "utf8");
if (!mermaidRenderer.includes('svg.setAttribute("preserveAspectRatio", "xMinYMin meet")')) {
  throw new Error('MermaidRenderer must left-align the SVG with preserveAspectRatio "xMinYMin meet"');
}

const globals = readFileSync("app/globals.css", "utf8");
for (const expected of ["width: 100%;", "height: auto;", "max-width: 100%;"]){
  if (!globals.includes(expected)) {
    throw new Error(`globals.css must include ${expected} for Mermaid SVG fitting`);
  }
}

if (globals.includes("max-width: none;")) {
  throw new Error("globals.css must not keep Mermaid SVG at intrinsic width");
}

console.log("mermaid fit width contract passed");
