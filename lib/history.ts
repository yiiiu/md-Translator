export interface HistoryTaskRecord {
  id: string;
  status: string;
  engine: string;
  target_lang: string;
  completed_ids: string;
  failed_ids: string;
  created_at: string;
}

export type HistoryDisplayStatus = "completed" | "in-progress" | "issues";
export type HistoryStatusFilter = "all" | HistoryDisplayStatus;

export interface HistoryTaskItem extends HistoryTaskRecord {
  completedCount: number;
  failedCount: number;
  displayStatus: HistoryDisplayStatus;
}

export function normalizeStatusFilter(value: string | undefined): HistoryStatusFilter {
  if (value && ["all", "completed", "in-progress", "issues"].includes(value)) {
    return value as HistoryStatusFilter;
  }

  return "all";
}

export function normalizeQuery(value: string | undefined) {
  return typeof value === "string" ? value.trim() : "";
}

export function parseCompletedIds(value: string) {
  try {
    const parsed = JSON.parse(value) as string[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function parseFailedIds(value: string) {
  try {
    const parsed = JSON.parse(value) as Record<string, string>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function deriveDisplayStatus(task: HistoryTaskRecord): HistoryDisplayStatus {
  const failedCount = Object.keys(parseFailedIds(task.failed_ids)).length;

  if (failedCount > 0) {
    return "issues";
  }

  if (task.status === "completed") {
    return "completed";
  }

  return "in-progress";
}

export function buildHistoryItems(tasks: HistoryTaskRecord[]): HistoryTaskItem[] {
  return tasks.map((task) => ({
    ...task,
    completedCount: parseCompletedIds(task.completed_ids).length,
    failedCount: Object.keys(parseFailedIds(task.failed_ids)).length,
    displayStatus: deriveDisplayStatus(task),
  }));
}

export function filterHistoryItems(
  items: HistoryTaskItem[],
  statusFilter: HistoryStatusFilter
) {
  return items.filter(
    (item) => statusFilter === "all" || item.displayStatus === statusFilter
  );
}

export function summarizeHistory(tasks: HistoryTaskRecord[]) {
  const items = buildHistoryItems(tasks);
  const totalTasks = items.length;
  const completedTasks = items.filter(
    (item) => item.displayStatus === "completed"
  ).length;
  const issueTasks = items.filter((item) => item.displayStatus === "issues").length;
  const successRate =
    totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return {
    totalTasks,
    completedTasks,
    issueTasks,
    successRate,
  };
}

export function formatHistoryDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function buildHistoryFilterHref(status: HistoryStatusFilter, q: string) {
  const search = new URLSearchParams();
  if (status !== "all") {
    search.set("status", status);
  }
  if (q) {
    search.set("q", q);
  }

  const query = search.toString();
  return `/history${query ? `?${query}` : ""}`;
}
