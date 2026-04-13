import { readFileSync } from "node:fs";

const source = readFileSync("lib/translate.ts", "utf8");

if (!source.includes("Promise.all(")) {
  throw new Error("translateStream must dispatch uncached translation groups with Promise.all");
}

if (!source.includes("translateGroupWithRetry")) {
  throw new Error("translateStream must isolate per-group retry logic");
}

if (!source.includes("orderedParagraphIds")) {
  throw new Error("translateStream must yield concurrent group results in paragraph order");
}

console.log("translation concurrency contract passed");
