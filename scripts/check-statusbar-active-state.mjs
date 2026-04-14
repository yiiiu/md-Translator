import { readFileSync } from "node:fs";

const statusBar = readFileSync("components/StatusBar.tsx", "utf8");
if (!statusBar.includes("const activeStatusLabel =")) {
  throw new Error("StatusBar must derive an active status label");
}
if (!statusBar.includes("translating > 0")) {
  throw new Error("StatusBar active label must react to translating paragraphs");
}
if (!statusBar.includes("text.translating")) {
  throw new Error("StatusBar must render translating status text while work is in progress");
}

const uiText = readFileSync("lib/ui-text.ts", "utf8");
if (!uiText.includes('translating: "Translating"')) {
  throw new Error("English status bar copy must include Translating");
}
if (!uiText.includes('translating: "\\u7ffb\\u8bd1\\u4e2d"')) {
  throw new Error("Chinese status bar copy must include 翻译中");
}

console.log("status bar active state contract passed");
