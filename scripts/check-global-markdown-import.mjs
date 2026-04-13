import { readFileSync } from "node:fs";

const inputArea = readFileSync("components/InputArea.tsx", "utf8");

if (!inputArea.includes('window.addEventListener("paste"')) {
  throw new Error("InputArea must listen for global paste events");
}
if (!inputArea.includes('window.addEventListener("drop"')) {
  throw new Error("InputArea must listen for global drop events");
}
if (!inputArea.includes('window.addEventListener("dragover"')) {
  throw new Error("InputArea must prevent browser file-open during global dragover");
}
if (!inputArea.includes("isEditableTarget")) {
  throw new Error("Global paste must avoid hijacking normal form fields");
}
if (!inputArea.includes("readMarkdownFile")) {
  throw new Error("Drag/drop must use the shared file reader path");
}
if (!inputArea.includes("Drop .md anywhere")) {
  throw new Error("InputArea must show a compact drop/paste hint");
}
if (!inputArea.includes("setRawInput")) {
  throw new Error("Global imports must dispatch into rawInput");
}

const toolbar = readFileSync("components/Toolbar.tsx", "utf8");
if (!toolbar.includes('aria-label="Upload .md"') || !toolbar.includes("UploadIcon")) {
  throw new Error("Upload button must remain available in Toolbar");
}

console.log("global markdown import contract passed");
