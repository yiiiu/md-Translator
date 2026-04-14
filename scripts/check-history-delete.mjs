import { existsSync, readFileSync } from "node:fs";

const historyWorkspacePath = "components/HistoryWorkspace.tsx";
if (!existsSync(historyWorkspacePath)) {
  throw new Error("HistoryWorkspace must exist for history page interactions");
}

const historyWorkspace = readFileSync(historyWorkspacePath, "utf8");
for (const expected of [
  '"use client"',
  "ConfirmDialog",
  "deleteHistoryTasks",
  "const initialSelectedIds =",
  "selectedIds",
  "scope: \"selected\"",
  "scope: \"single\"",
]) {
  if (!historyWorkspace.includes(expected)) {
    throw new Error(`HistoryWorkspace must include ${expected}`);
  }
}
if (!historyWorkspace.includes('statusFilter === "all"')) {
  throw new Error("HistoryWorkspace must only auto-select visible tasks for grouped status filters");
}
if (
  !historyWorkspace.includes(
    "filterHistoryItems(buildHistoryItems(initialTasks), statusFilter)"
  )
) {
  throw new Error(
    "HistoryWorkspace must derive grouped auto-selection from the visible filtered tasks"
  );
}
if (historyWorkspace.includes("deleteFiltered")) {
  throw new Error("HistoryWorkspace must no longer render delete-filtered UI");
}

const historyApiPath = "app/api/history/route.ts";
if (!existsSync(historyApiPath)) {
  throw new Error("History delete API route must exist");
}

const historyApi = readFileSync(historyApiPath, "utf8");
for (const expected of [
  "export async function DELETE",
  "deleteTask",
  "deleteTasks",
  'scope === "filtered"',
  'taskIds: deletedIds',
]) {
  if (!historyApi.includes(expected)) {
    throw new Error(`History delete API must include ${expected}`);
  }
}

const db = readFileSync("lib/db.ts", "utf8");
for (const expected of ["deleteTask(taskId: string)", "deleteTasks(taskIds: string[])"]) {
  if (!db.includes(expected)) {
    throw new Error(`lib/db.ts must include ${expected}`);
  }
}

const historyPage = readFileSync("app/history/page.tsx", "utf8");
for (const expected of ["HistoryWorkspace", "initialTasks", "statusFilter", "q={q}"]) {
  if (!historyPage.includes(expected)) {
    throw new Error(`History page must include ${expected}`);
  }
}

const api = readFileSync("services/api.ts", "utf8");
if (!api.includes("deleteHistoryTasks")) {
  throw new Error("services/api.ts must export deleteHistoryTasks");
}

const uiText = readFileSync("lib/ui-text.ts", "utf8");
for (const expected of [
  "deleteSelected",
  "deleteTask",
  "deleteSelectedConfirm",
]) {
  if (!uiText.includes(expected)) {
    throw new Error(`history ui text must include ${expected}`);
  }
}

console.log("history delete contract passed");
