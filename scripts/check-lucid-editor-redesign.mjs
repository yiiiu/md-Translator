import { readFileSync } from "node:fs";

const layout = readFileSync("app/layout.tsx", "utf8");
if (!layout.includes("Manrope") || !layout.includes("Inter")) {
  throw new Error("Root layout must use the Stitch Manrope/Inter font pairing");
}

const toolbar = readFileSync("components/Toolbar.tsx", "utf8");
if (!toolbar.includes("Lucid Editor")) {
  throw new Error("Toolbar must adopt the Lucid Editor top navigation");
}
if (!toolbar.includes("from-[#003ec7]") || !toolbar.includes("to-[#0052ff]")) {
  throw new Error("Translate CTA must use the Stitch primary gradient");
}

const previewPane = readFileSync("components/PreviewPane.tsx", "utf8");
if (!previewPane.includes("line-number-gutter")) {
  throw new Error("Preview panes must include the Stitch line-number gutter");
}
if (!previewPane.includes("surface-pane")) {
  throw new Error("Preview panes must use the raised surface-pane treatment");
}

const inputArea = readFileSync("components/InputArea.tsx", "utf8");
if (!inputArea.includes("bottom-action-shell")) {
  throw new Error("InputArea must become the bottom action shell");
}
if (inputArea.includes("Parse")) {
  throw new Error("Bottom action shell must not include the old Parse action");
}
if (!inputArea.includes("Upload") || !inputArea.includes("Clear")) {
  throw new Error("Bottom action shell must preserve Upload and Clear actions");
}

const statusBar = readFileSync("components/StatusBar.tsx", "utf8");
if (!statusBar.includes("Translation Logs")) {
  throw new Error("StatusBar must match the Stitch translation logs surface");
}
if (!statusBar.includes("重试失败段落")) {
  throw new Error("StatusBar must preserve retry failed paragraphs action");
}

const globals = readFileSync("app/globals.css", "utf8");
if (!globals.includes("--surface-container-low")) {
  throw new Error("Global CSS must expose Lucid Editor surface tokens");
}

console.log("lucid editor redesign contract passed");
