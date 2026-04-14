import { existsSync, readFileSync } from "node:fs";

function expectIncludes(path, expectedList) {
  const content = readFileSync(path, "utf8");
  for (const expected of expectedList) {
    if (!content.includes(expected)) {
      throw new Error(`${path} must include ${expected}`);
    }
  }
}

for (const path of [
  "app/api/history/[taskId]/route.ts",
  "app/history/[taskId]/page.tsx",
  "components/HistoryDetail.tsx",
  "components/ResizableSplitPane.tsx",
  "components/CacheManager.tsx",
  "app/api/cache/route.ts",
  "lib/crypto.ts",
  "components/MermaidRenderer.tsx",
]) {
  if (!existsSync(path)) {
    throw new Error(`Missing V2 file: ${path}`);
  }
}

expectIncludes("lib/db.ts", [
  "CREATE TABLE IF NOT EXISTS task_paragraphs",
  "idx_task_paragraphs_task_id",
  "createTaskParagraph",
  "listTaskParagraphs",
  "getTaskWithParagraphs",
  "getCacheStats",
  "clearCache",
  "encrypt(",
  "decrypt(",
]);

expectIncludes("lib/translate.ts", [
  "createTaskParagraph",
  "signal?: AbortSignal",
  "createTaskParagraph({",
]);

expectIncludes("app/api/translate/route.ts", [
  "request.signal",
  "translateStream(body, request.signal)",
]);

expectIncludes("stores/translation.ts", [
  "abortController",
  "setAbortController",
  "cancelTranslation",
  'mode: "full" | "lazy"',
  "setMode",
]);

expectIncludes("components/Toolbar.tsx", [
  "cancelTranslation",
  "abortController",
  "fetchEngineConfig",
  "notConfigured",
  "toolbarText.cancel",
]);

expectIncludes("components/SplitView.tsx", [
  "IntersectionObserver",
  'mode !== "lazy"',
  "ResizableSplitPane",
]);

expectIncludes("components/ParagraphBlock.tsx", [
  "paragraphText.retranslate",
  "canRetranslate",
]);

expectIncludes("lib/markdown-renderer.ts", [
  "mermaid-block",
  "katex",
  "renderKatex",
]);

expectIncludes("lib/ui-text.ts", [
  "cancel:",
  "notConfigured:",
  "lazyMode:",
  "fullMode:",
  "retranslate:",
  "cacheTitle:",
  "cacheDescription:",
  "cacheClear:",
]);

expectIncludes("services/api.ts", [
  "fetchHistoryDetail",
  "fetchCacheStats",
  "clearCache",
]);

console.log("v2 plan contract passed");
