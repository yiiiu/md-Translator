import { readFileSync } from "node:fs";

const markdownImport = readFileSync("utils/markdown-import.ts", "utf8");
for (const expected of [
  'name.endsWith(".mmd")',
  'name.endsWith(".mermaid")',
  "return `\\`\\`\\`mermaid\\n${raw.trim()}\\n\\`\\`\\``;",
]) {
  if (!markdownImport.includes(expected)) {
    throw new Error(`utils/markdown-import.ts must include ${expected}`);
  }
}

const toolbar = readFileSync("components/Toolbar.tsx", "utf8");
for (const expected of [
  'name.endsWith(".mmd")',
  'name.endsWith(".mermaid")',
  'accept=".md,.markdown,.txt,.mmd,.mermaid"',
]) {
  if (!toolbar.includes(expected)) {
    throw new Error(`components/Toolbar.tsx must include ${expected}`);
  }
}

const history = readFileSync("lib/history.ts", "utf8");
for (const expected of [
  'value.replace(" ", "T") + "Z"',
  "const normalized =",
]) {
  if (!history.includes(expected)) {
    throw new Error(`lib/history.ts must include ${expected}`);
  }
}

const historyPage = readFileSync("app/history/page.tsx", "utf8");
for (const expected of [
  "getAllEngineConfigs",
  "engineNameMap",
  'openai: "OpenAI"',
]) {
  if (!historyPage.includes(expected)) {
    throw new Error(`app/history/page.tsx must include ${expected}`);
  }
}

const historyWorkspace = readFileSync("components/HistoryWorkspace.tsx", "utf8");
for (const expected of [
  "engineNameMap = {}",
  "{engineNameMap[task.engine] ?? task.engine}",
]) {
  if (!historyWorkspace.includes(expected)) {
    throw new Error(`components/HistoryWorkspace.tsx must include ${expected}`);
  }
}

const historyDetail = readFileSync("components/HistoryDetail.tsx", "utf8");
for (const expected of [
  'paragraph.type === "mermaid"',
  'paragraph.original.replace(/^```mermaid\\b/, "```plaintext")',
]) {
  if (!historyDetail.includes(expected)) {
    throw new Error(`components/HistoryDetail.tsx must include ${expected}`);
  }
}

console.log("markdown/history fixes contract passed");
