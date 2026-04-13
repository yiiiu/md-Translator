import { readFileSync } from "node:fs";

const paragraphBlock = readFileSync("components/ParagraphBlock.tsx", "utf8");

if (paragraphBlock.includes('done: "Ready"') || paragraphBlock.includes("READY")) {
  throw new Error("ParagraphBlock must not render a per-paragraph done/Ready badge");
}

for (const expected of ['translating: "Sync"', 'error: "Error"', 'edited: "Edit"']) {
  if (!paragraphBlock.includes(expected)) {
    throw new Error(`ParagraphBlock must keep ${expected} status label`);
  }
}

console.log("paragraph status no ready contract passed");
