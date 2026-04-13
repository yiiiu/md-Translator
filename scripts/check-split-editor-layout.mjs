import { readFileSync } from "node:fs";

const store = readFileSync("stores/translation.ts", "utf8");
if (!store.includes("rawInput: string")) {
  throw new Error("translation store must expose rawInput");
}
if (!store.includes("setRawInput")) {
  throw new Error("translation store must expose setRawInput");
}

const splitView = readFileSync("components/SplitView.tsx", "utf8");
if (!splitView.includes("<textarea")) {
  throw new Error("SplitView must render the left raw markdown textarea");
}
if (!splitView.includes('placeholder="Paste Markdown here, or drag & drop a .md file..."')) {
  throw new Error("SplitView textarea must use the requested placeholder");
}
if (!splitView.includes("syncMarkdown")) {
  throw new Error("SplitView must parse raw input through syncMarkdown");
}
if (!splitView.includes("ref={leftRef}") || !splitView.includes("onScroll={handleLeftScroll}")) {
  throw new Error("SplitView left pane must keep the scroll-sync ref and onScroll");
}
if (!splitView.includes('viewMode="preview"')) {
  throw new Error("SplitView must pass preview mode to the translation pane");
}

const previewPane = readFileSync("components/PreviewPane.tsx", "utf8");
if (!previewPane.includes("viewMode")) {
  throw new Error("PreviewPane must accept a viewMode prop");
}
if (!previewPane.includes("Preview") || !previewPane.includes("Code")) {
  throw new Error("PreviewPane must render the Preview/Code toggle");
}
if (!previewPane.includes("mode === \"code\"")) {
  throw new Error("PreviewPane must render raw code mode");
}
if (!previewPane.includes("<pre")) {
  throw new Error("PreviewPane code mode must render a pre");
}

const inputArea = readFileSync("components/InputArea.tsx", "utf8");
if (inputArea.includes("<textarea")) {
  throw new Error("InputArea must no longer render a textarea");
}
if (inputArea.includes("Parse")) {
  throw new Error("InputArea must no longer render a Parse button");
}
if (!inputArea.includes("Upload") || !inputArea.includes("Clear")) {
  throw new Error("InputArea must preserve Upload and Clear");
}

console.log("split editor layout contract passed");

