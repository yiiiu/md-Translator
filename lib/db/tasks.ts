import { getDb } from "./connection";

export interface Task {
  id: string;
  status: string;
  engine: string;
  target_lang: string;
  completed_ids: string;
  failed_ids: string;
  created_at?: string;
}

export interface TaskParagraph {
  id: number;
  task_id: string;
  paragraph_id: string;
  type: string;
  original: string;
  translated: string;
  sort_order: number;
  created_at?: string;
}

export function createTask(id: string, engine: string, targetLang: string): void {
  getDb().prepare("INSERT INTO tasks (id, engine, target_lang) VALUES (?, ?, ?)").run(id, engine, targetLang);
}

export function createTaskParagraph(input: {
  task_id: string;
  paragraph_id: string;
  type: string;
  original: string;
  translated: string;
  sort_order: number;
}): void {
  getDb()
    .prepare(
      `INSERT OR REPLACE INTO task_paragraphs
       (task_id, paragraph_id, type, original, translated, sort_order)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(
      input.task_id,
      input.paragraph_id,
      input.type,
      input.original,
      input.translated,
      input.sort_order
    );
}

export function getTask(id: string): Task | undefined {
  return getDb().prepare("SELECT * FROM tasks WHERE id = ?").get(id) as Task | undefined;
}

export function deleteTask(taskId: string): void {
  getDb().prepare("DELETE FROM tasks WHERE id = ?").run(taskId);
}

export function deleteTasks(taskIds: string[]): void {
  if (taskIds.length === 0) {
    return;
  }

  const runDelete = getDb().prepare("DELETE FROM tasks WHERE id = ?");
  const transaction = getDb().transaction((ids: string[]) => {
    for (const taskId of ids) {
      runDelete.run(taskId);
    }
  });

  transaction(taskIds);
}

export function listTaskParagraphs(taskId: string): TaskParagraph[] {
  return getDb()
    .prepare(
      `SELECT id, task_id, paragraph_id, type, original, translated, sort_order, created_at
       FROM task_paragraphs
       WHERE task_id = ?
       ORDER BY sort_order ASC`
    )
    .all(taskId) as TaskParagraph[];
}

export interface TaskWithParagraphs extends Task {
  paragraphs: TaskParagraph[];
}

export function getTaskWithParagraphs(
  taskId: string
): TaskWithParagraphs | undefined {
  const task = getTask(taskId);
  if (!task) {
    return undefined;
  }

  return {
    ...task,
    paragraphs: listTaskParagraphs(taskId),
  };
}

export function updateTaskProgress(
  id: string,
  status: string,
  completedIds: string[],
  failedIds: Record<string, string>
): void {
  getDb()
    .prepare("UPDATE tasks SET status = ?, completed_ids = ?, failed_ids = ? WHERE id = ?")
    .run(status, JSON.stringify(completedIds), JSON.stringify(failedIds), id);
}

function parseTaskCompletedIds(value: string): string[] {
  try {
    const parsed = JSON.parse(value) as string[];
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function parseTaskFailedIds(value: string): Record<string, string> {
  try {
    const parsed = JSON.parse(value) as Record<string, string>;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }

    return Object.fromEntries(
      Object.entries(parsed).filter(
        (entry): entry is [string, string] =>
          typeof entry[0] === "string" && typeof entry[1] === "string"
      )
    );
  } catch {
    return {};
  }
}

export function syncTaskParagraphResult(input: {
  taskId: string;
  paragraphId: string;
  type: string;
  original: string;
  sortOrder?: number;
  translated?: string;
  error?: string;
}): void {
  const task = getTask(input.taskId);
  if (!task) {
    return;
  }

  const completedIds = new Set(parseTaskCompletedIds(task.completed_ids));
  const failedIds = parseTaskFailedIds(task.failed_ids);

  if (typeof input.translated === "string") {
    const existing = getDb()
      .prepare(
        `SELECT sort_order
         FROM task_paragraphs
         WHERE task_id = ? AND paragraph_id = ?`
      )
      .get(input.taskId, input.paragraphId) as { sort_order?: number } | undefined;

    createTaskParagraph({
      task_id: input.taskId,
      paragraph_id: input.paragraphId,
      type: input.type,
      original: input.original,
      translated: input.translated,
      sort_order: existing?.sort_order ?? input.sortOrder ?? completedIds.size,
    });
    completedIds.add(input.paragraphId);
    delete failedIds[input.paragraphId];
  } else if (typeof input.error === "string" && input.error.length > 0) {
    completedIds.delete(input.paragraphId);
    failedIds[input.paragraphId] = input.error;
  }

  updateTaskProgress(input.taskId, "completed", [...completedIds], failedIds);
}

export interface TaskListItem {
  id: string;
  status: string;
  engine: string;
  target_lang: string;
  completed_ids: string;
  failed_ids: string;
  created_at: string;
}

export function listTasks(filters?: {
  q?: string;
  status?: string;
}): TaskListItem[] {
  const where: string[] = [];
  const values: Array<string> = [];

  const q = filters?.q?.trim();
  if (q) {
    where.push("(id LIKE ? OR engine LIKE ? OR target_lang LIKE ?)");
    const like = `%${q}%`;
    values.push(like, like, like);
  }

  if (filters?.status === "pending" || filters?.status === "processing" || filters?.status === "completed") {
    where.push("status = ?");
    values.push(filters.status);
  }

  const whereClause = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";
  return getDb()
    .prepare(
      `SELECT id, status, engine, target_lang, completed_ids, failed_ids, created_at
       FROM tasks
       ${whereClause}
       ORDER BY datetime(created_at) DESC`
    )
    .all(...values) as TaskListItem[];
}