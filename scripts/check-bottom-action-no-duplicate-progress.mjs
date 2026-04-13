import { readFileSync } from "node:fs";

const inputArea = readFileSync("components/InputArea.tsx", "utf8");

if (inputArea.includes("{paragraphs.length} buffers")) {
  throw new Error("InputArea must not render a duplicate buffers progress label");
}
if (inputArea.includes('style={{ width: paragraphs.length > 0 ? "36%" : "0%" }}')) {
  throw new Error("InputArea must not render a duplicate bottom progress bar");
}
if (!inputArea.includes("Drop .md anywhere / Ctrl+V paste")) {
  throw new Error("InputArea must keep the compact import hint");
}
if (!inputArea.includes("Active")) {
  throw new Error("InputArea must keep the compact active status");
}

console.log("bottom action duplicate progress contract passed");

