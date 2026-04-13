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
  throw new Error("Drag/drop and upload must share the same file reader path");
}
if (!inputArea.includes("Drop .md anywhere")) {
  throw new Error("InputArea must show a compact drop/paste hint");
}
if (!inputArea.includes("Upload")) {
  throw new Error("Upload button must remain available");
}

console.log("global markdown import contract passed");

