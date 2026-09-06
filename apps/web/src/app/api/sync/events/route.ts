/**
 * Hint-only realtime endpoint for sync.
 * GET opens an SSE stream; the server writes one version-number event per
 * committed mutation batch for the session user. The client answers each
 * event with its normal watermark pull — this stream never carries row data.
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { subscribeHint, hintVersion } from "@/server/sync-hints";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HEARTBEAT_MS = 25_000;

function encode(version: number): Uint8Array {
  return new TextEncoder().encode(`data: {"v":${version}}\n\n`);
}

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  let heartbeat: ReturnType<typeof setInterval> | null = null;
  let unsubscribe: (() => void) | null = null;
  const cleanup = () => {
    if (heartbeat) clearInterval(heartbeat);
    heartbeat = null;
    unsubscribe?.();
    unsubscribe = null;
  };

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(encode(hintVersion(userId)));
      heartbeat = setInterval(() => {
        controller.enqueue(new TextEncoder().encode(": ping\n\n"));
      }, HEARTBEAT_MS);
      unsubscribe = subscribeHint(userId, (version) => {
        try {
          controller.enqueue(encode(version));
        } catch {
          cleanup();
        }
      });
      request.signal.addEventListener("abort", cleanup, { once: true });
    },
    cancel() {
      cleanup();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
