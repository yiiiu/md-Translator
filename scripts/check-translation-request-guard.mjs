import { readFileSync } from "node:fs";

const store = readFileSync("stores/translation.ts", "utf8");
for (const expected of [
  "activeRequestId: string | null",
  "beginTranslationRun:",
  "finishTranslationRun:",
  "activeRequestId: null",
]) {
  if (!store.includes(expected)) {
    throw new Error(`translation store must include ${expected}`);
  }
}

const api = readFileSync("services/api.ts", "utf8");
for (const expected of [
  "const requestId = crypto.randomUUID()",
  "store.beginTranslationRun(requestId, controller)",
  "useTranslationStore.getState().activeRequestId === requestId",
  "store.finishTranslationRun(requestId)",
]) {
  if (!api.includes(expected)) {
    throw new Error(`startTranslation must guard stale stream updates with ${expected}`);
  }
}

const splitView = readFileSync("components/SplitView.tsx", "utf8");
if (!splitView.includes("if (current.abortController) return;")) {
  throw new Error("auto translate must not start a new request while another request is active");
}
if (
  !splitView.includes(
    'if (current.paragraphs.some((paragraph) => paragraph.status !== "idle")) return;'
  )
) {
  throw new Error(
    "auto translate must not replay a stale scheduled request after paragraph statuses have advanced"
  );
}

console.log("translation request guard contract passed");
