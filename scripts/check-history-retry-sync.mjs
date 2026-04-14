import { existsSync, readFileSync } from "node:fs";

const translatePath = "lib/translate.ts";
if (!existsSync(translatePath)) {
  throw new Error("lib/translate.ts must exist");
}

const translate = readFileSync(translatePath, "utf8");
for (const expected of [
  "task_id?: string;",
  "yield { task_id: taskId };",
]) {
  if (!translate.includes(expected)) {
    throw new Error(`translate stream must include ${expected}`);
  }
}

const storePath = "stores/translation.ts";
const store = readFileSync(storePath, "utf8");
if (!store.includes("taskId: null,")) {
  throw new Error("translation store must reset taskId when beginning a new run");
}

const apiPath = "services/api.ts";
const api = readFileSync(apiPath, "utf8");
for (const expected of [
  "if (event.task_id) {",
  "store.setTaskId(event.task_id);",
  "task_id: store.taskId,",
]) {
  if (!api.includes(expected)) {
    throw new Error(`services/api.ts must include ${expected}`);
  }
}

const paragraphRoutePath = "app/api/paragraph/route.ts";
const paragraphRoute = readFileSync(paragraphRoutePath, "utf8");
for (const expected of [
  "task_id?: unknown;",
  "const taskId =",
  "syncTaskParagraphResult",
]) {
  if (!paragraphRoute.includes(expected)) {
    throw new Error(`paragraph retry route must include ${expected}`);
  }
}

const dbPath = "lib/db.ts";
const db = readFileSync(dbPath, "utf8");
for (const expected of [
  "export function syncTaskParagraphResult(",
  "createTaskParagraph({",
  "updateTaskProgress(input.taskId, \"completed\",",
]) {
  if (!db.includes(expected)) {
    throw new Error(`lib/db.ts must include ${expected}`);
  }
}

console.log("history retry sync contract passed");
