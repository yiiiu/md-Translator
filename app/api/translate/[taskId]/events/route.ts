import { NextRequest, NextResponse } from "next/server";
import { getTask } from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const { taskId } = await params;
  const task = getTask(taskId);

  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  // Return current task state for reconnection
  return NextResponse.json({
    task_id: task.id,
    status: task.status,
    completed_ids: JSON.parse(task.completed_ids),
    failed_ids: JSON.parse(task.failed_ids),
  });
}
