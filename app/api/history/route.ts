import { NextRequest, NextResponse } from "next/server";
import { deleteTask, deleteTasks, getTask, listTasks } from "@/lib/db";
import {
  buildHistoryItems,
  filterHistoryItems,
  normalizeQuery,
  normalizeStatusFilter,
} from "@/lib/history";

type DeleteHistoryBody = {
  taskId?: unknown;
  taskIds?: unknown;
  scope?: unknown;
  q?: unknown;
  status?: unknown;
};

export async function DELETE(request: NextRequest) {
  const taskId = request.nextUrl.searchParams.get("taskId");
  if (taskId) {
    if (!getTask(taskId)) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    deleteTask(taskId);
    const deletedIds = [taskId];
    return NextResponse.json({ ok: true, deletedIds, deletedCount: 1, taskIds: deletedIds });
  }

  const body = await readDeleteHistoryBody(request);

  if (typeof body.taskId === "string" && body.taskId) {
    if (!getTask(body.taskId)) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    deleteTask(body.taskId);
    const deletedIds = [body.taskId];
    return NextResponse.json({ ok: true, deletedIds, deletedCount: 1, taskIds: deletedIds });
  }

  if (Array.isArray(body.taskIds)) {
    const deletedIds = Array.from(
      new Set(
        body.taskIds.filter(
          (value): value is string => typeof value === "string" && value.length > 0
        )
      )
    );

    if (deletedIds.length === 0) {
      return NextResponse.json(
        { error: "taskIds must contain at least one id" },
        { status: 400 }
      );
    }

    deleteTasks(deletedIds);
    return NextResponse.json({
      ok: true,
      deletedIds,
      deletedCount: deletedIds.length,
      taskIds: deletedIds,
    });
  }

  if (body.scope === "filtered") {
    const q = normalizeQuery(typeof body.q === "string" ? body.q : undefined);
    const status = normalizeStatusFilter(
      typeof body.status === "string" ? body.status : undefined
    );
    const deletedIds = filterHistoryItems(buildHistoryItems(listTasks({ q })), status).map(
      (item) => item.id
    );

    deleteTasks(deletedIds);
    return NextResponse.json({
      ok: true,
      deletedIds,
      deletedCount: deletedIds.length,
      taskIds: deletedIds,
    });
  }

  return NextResponse.json(
    { error: "taskId, taskIds, or scope=filtered is required" },
    { status: 400 }
  );
}

async function readDeleteHistoryBody(request: NextRequest): Promise<DeleteHistoryBody> {
  try {
    const payload = await request.json();
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      return {};
    }

    return payload as DeleteHistoryBody;
  } catch {
    return {};
  }
}
