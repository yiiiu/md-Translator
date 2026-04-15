import { existsSync, readFileSync } from "node:fs";

const inputAreaPath = "components/InputArea.tsx";
if (!existsSync(inputAreaPath)) {
  throw new Error("InputArea must exist");
}

const inputArea = readFileSync(inputAreaPath, "utf8");
for (const expected of [
  'window.addEventListener("drop", handleDrop)',
  "setDraggingMarkdown(false);",
  "importMarkdown(markdown);",
  "mapMarkdownToParagraphs",
  "await readMarkdownFile(file)",
]) {
  if (!inputArea.includes(expected)) {
    throw new Error(`InputArea must include ${expected}`);
  }
}

const splitViewPath = "components/SplitView.tsx";
if (!existsSync(splitViewPath)) {
  throw new Error("SplitView must exist");
}

const splitView = readFileSync(splitViewPath, "utf8");
for (const expected of [
  "const syncMarkdown = useCallback(",
  "await readMarkdownFile(file)",
  "onDrop={handleDrop}",
  "mapMarkdownToParagraphs",
]) {
  if (!splitView.includes(expected)) {
    throw new Error(`SplitView must include ${expected}`);
  }
}

if (!splitView.includes("setRawInput(markdown);") && !splitView.includes("syncMarkdown(markdown);")) {
  throw new Error("SplitView drop flow must hydrate the input with dropped markdown");
}

const homeWorkspacePath = "components/HomeWorkspace.tsx";
const homeWorkspace = readFileSync(homeWorkspacePath, "utf8");
if (!homeWorkspace.includes("<InputArea />")) {
  throw new Error("HomeWorkspace must mount InputArea for global markdown drop handling");
}

console.log("markdown drop import contract passed");
