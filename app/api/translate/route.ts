import { NextRequest, NextResponse } from "next/server";
import { translateStream, type TranslateRequest } from "@/lib/translate";

const supportedTypes = new Set([
  "heading",
  "paragraph",
  "code",
  "table",
  "list",
  "blockquote",
  "mermaid",
]);

type TranslateRequestBody = {
  engine?: unknown;
  target_lang?: unknown;
  mode?: unknown;
  paragraphs?: unknown;
};

export async function POST(request: NextRequest) {
  let body: TranslateRequestBody;

  try {
    const payload = await request.json();
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    body = payload as TranslateRequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const validationError = getValidationError(body);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const translateRequest = body as TranslateRequest;

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const event of translateStream(translateRequest, request.signal)) {
          if (request.signal.aborted) {
            break;
          }
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
        }
        controller.close();
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Unknown error";
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: "error", error: message })}\n\n`)
        );
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

function getValidationError(body: TranslateRequestBody): string | null {
  if (typeof body.engine !== "string" || body.engine.length === 0) {
    return "engine is required";
  }

  if (typeof body.target_lang !== "string" || body.target_lang.length === 0) {
    return "target_lang is required";
  }

  if (body.mode !== "full" && body.mode !== "lazy") {
    return "mode is invalid";
  }

  if (!Array.isArray(body.paragraphs) || body.paragraphs.length === 0) {
    return "paragraphs is required and must be non-empty";
  }

  for (const [index, paragraph] of body.paragraphs.entries()) {
    if (!paragraph || typeof paragraph !== "object" || Array.isArray(paragraph)) {
      return `paragraphs[${index}] is invalid`;
    }

    const item = paragraph as Record<string, unknown>;
    if (typeof item.id !== "string" || item.id.length === 0) {
      return `paragraphs[${index}].id is required`;
    }
    if (typeof item.content !== "string") {
      return `paragraphs[${index}].content is required`;
    }
    if (typeof item.type !== "string" || !supportedTypes.has(item.type)) {
      return `paragraphs[${index}].type is invalid`;
    }
    if (typeof item.index !== "number" || !Number.isInteger(item.index)) {
      return `paragraphs[${index}].index is required`;
    }
  }

  return null;
}
