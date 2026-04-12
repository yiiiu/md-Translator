import { NextRequest, NextResponse } from "next/server";
import { translateStream } from "@/lib/translate";

export async function POST(request: NextRequest) {
  const body = await request.json();

  if (!body.paragraphs || !Array.isArray(body.paragraphs) || body.paragraphs.length === 0) {
    return NextResponse.json({ error: "paragraphs is required and must be non-empty" }, { status: 400 });
  }

  if (!body.engine) {
    return NextResponse.json({ error: "engine is required" }, { status: 400 });
  }

  // Start translation and return SSE stream directly
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const event of translateStream(body)) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
        }
        controller.close();
      } catch (err: any) {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: "error", error: err.message })}\n\n`)
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
