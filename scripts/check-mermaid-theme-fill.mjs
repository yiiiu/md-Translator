import { readFileSync } from "node:fs";

const mermaidRenderer = readFileSync("components/MermaidRenderer.tsx", "utf8");
for (const expected of [
  "function getMermaidThemeConfig(",
  'primaryColor: "#2A2B2C"',
  'primaryBorderColor: "#48A0C7"',
  'lineColor: "#D6D8DD"',
  "themeVariables: isDark",
]) {
  if (!mermaidRenderer.includes(expected)) {
    throw new Error(`MermaidRenderer must include ${expected}`);
  }
}

console.log("mermaid theme fill contract passed");
