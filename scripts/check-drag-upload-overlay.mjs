import { readFileSync } from "node:fs";

const inputArea = readFileSync("components/InputArea.tsx", "utf8");

if (!inputArea.includes("dragDepthRef")) {
  throw new Error("InputArea must track nested dragenter/dragleave events");
}
if (!inputArea.includes("setDraggingMarkdown")) {
  throw new Error("InputArea must expose drag state for the upload overlay");
}
if (!inputArea.includes('window.addEventListener("dragenter"')) {
  throw new Error("InputArea must listen for global dragenter events");
}
if (!inputArea.includes('window.addEventListener("dragleave"')) {
  throw new Error("InputArea must listen for global dragleave events");
}
if (!inputArea.includes("Drop Markdown to import")) {
  throw new Error("InputArea must render an upload overlay message");
}
if (!inputArea.includes("pointer-events-none fixed inset-0")) {
  throw new Error("Upload overlay must cover the viewport without intercepting drop");
}

console.log("drag upload overlay contract passed");

