import { NextRequest, NextResponse } from "next/server";
import { createEngine } from "@/lib/translate";
import { type TranslateParagraph } from "@/lib/engines/types";
import { syncTaskParagraphResult } from "@/lib/db";

type ParagraphRetryBody = {
  engine?: unknown;
  target_lang?: unknown;
  task_id?: unknown;
  paragraph_id?: unknown;
  content?: unknown;
  type?: unknown;
  sort_order?: unknown;
};

const supportedTypes = new Set([
  "heading",
  "paragraph",
  "code",
  "table",
  "list",
  "blockquote",
  "mermaid",
]);

export async function POST(request: NextRequest) {
  let body: ParagraphRetryBody;

  try {
    const payload = await request.json();
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    body = payload as ParagraphRetryBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const validationError = getValidationError(body);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const engineId = body.engine as string;
  const targetLang = body.target_lang as string;
  const taskId = typeof body.task_id === "string" && body.task_id ? body.task_id : null;
  const paragraphId = body.paragraph_id as string;
  const content = body.content as string;
  const type = body.type as string;
  const sortOrder =
    typeof body.sort_order === "number" && Number.isInteger(body.sort_order)
      ? body.sort_order
      : undefined;

  if (type === "code" || type === "mermaid") {
    if (taskId) {
      syncTaskParagraphResult({
        taskId,
        paragraphId,
        type,
        original: content,
        translated: content,
        sortOrder,
      });
    }

    return NextResponse.json({ paragraph_id: paragraphId, translated: content });
  }

  const paragraph: TranslateParagraph = {
    id: paragraphId,
    content,
    type,
    index: 0,
  };

  try {
    const engine = createEngine(engineId);
    const results = await engine.translateBatch([paragraph], targetLang);
    const result = results.find((item) => item.paragraphId === paragraphId);

    if (!result) {
      return NextResponse.json(
        { error: "Missing translation result" },
        { status: 500 }
      );
    }

    if (taskId) {
      syncTaskParagraphResult({
        taskId,
        paragraphId,
        type,
        original: content,
        translated: result.translated,
        sortOrder,
      });
    }

    return NextResponse.json({
      paragraph_id: paragraphId,
      translated: result.translated,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (taskId) {
      syncTaskParagraphResult({
        taskId,
        paragraphId,
        type,
        original: content,
        sortOrder,
        error: message,
      });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function getValidationError(body: ParagraphRetryBody): string | null {
  if (typeof body.engine !== "string" || body.engine.length === 0) {
    return "engine is required";
  }

  if (typeof body.target_lang !== "string" || body.target_lang.length === 0) {
    return "target_lang is required";
  }

  if (typeof body.paragraph_id !== "string" || body.paragraph_id.length === 0) {
    return "paragraph_id is required";
  }

  if (typeof body.content !== "string") {
    return "content is required";
  }

  if (typeof body.type !== "string" || !supportedTypes.has(body.type)) {
    return "type is invalid";
  }

  return null;
}
