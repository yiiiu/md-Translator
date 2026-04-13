import { existsSync, readFileSync } from "node:fs";

if (!existsSync("app/api/paragraph/route.ts")) {
  throw new Error("Expected POST /api/paragraph route handler");
}

const route = readFileSync("app/api/paragraph/route.ts", "utf8");
if (!route.includes("export async function POST")) {
  throw new Error("Paragraph route must export POST");
}
if (!route.includes("translateBatch")) {
  throw new Error("Paragraph route must translate a single paragraph through the engine adapter");
}

const api = readFileSync("services/api.ts", "utf8");
if (!api.includes("retryParagraph")) {
  throw new Error("services/api.ts must export retryParagraph");
}
if (!api.includes("/api/paragraph")) {
  throw new Error("retryParagraph must call /api/paragraph");
}

const paragraphBlock = readFileSync("components/ParagraphBlock.tsx", "utf8");
if (!paragraphBlock.includes("retryParagraph")) {
  throw new Error("ParagraphBlock must call retryParagraph");
}
if (!paragraphBlock.includes("Retry")) {
  throw new Error("ParagraphBlock must render a retry button in the error state");
}

console.log("paragraph retry contract passed");
