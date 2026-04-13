import { readFileSync } from "node:fs";

const api = readFileSync("services/api.ts", "utf8");
if (!api.includes("retryFailedParagraphs")) {
  throw new Error("services/api.ts must export retryFailedParagraphs");
}
if (!api.includes("RETRY_FAILED_CONCURRENCY")) {
  throw new Error("retryFailedParagraphs must use a bounded concurrency limit");
}
if (!api.includes('paragraph.status === "error"')) {
  throw new Error("retryFailedParagraphs must only retry failed paragraphs");
}

const statusBar = readFileSync("components/StatusBar.tsx", "utf8");
if (!statusBar.includes("retryFailedParagraphs")) {
  throw new Error("StatusBar must call retryFailedParagraphs");
}
if (!statusBar.includes("重试失败段落")) {
  throw new Error("StatusBar must render a retry failed paragraphs button");
}
if (!statusBar.includes("retryingFailures")) {
  throw new Error("StatusBar must disable the retry button while retrying");
}

console.log("retry failed paragraphs contract passed");

