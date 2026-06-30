import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { normalizeDomain } from "@/lib/domain";
import { hasHivemindCredentials } from "@/lib/hivemind";
import { buildMockStreamEvents } from "@/lib/mock-stream";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

const BASE_URL =
  process.env.HIVEMIND_API_BASE_URL?.replace(/\/$/, "") ||
  "https://hivemind.myosin.xyz";
const MOCK_MODE = process.env.NODE_ENV !== "production";

const SSE_HEADERS = {
  "Content-Type": "text/event-stream; charset=utf-8",
  "Cache-Control": "no-cache, no-transform",
  Connection: "keep-alive",
};

function clientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "0.0.0.0";
}

// Streaming sibling of /api/teardown/teaser. Pipes the hive-mind SSE stream
// straight through (we hold the API key); degrades to a replayed mock stream in
// local dev so the two-stage UX works offline.
export async function POST(req: Request) {
  let body: { url?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const domain = body.url ? normalizeDomain(body.url) : null;
  if (!domain)
    return NextResponse.json({ error: "invalid_url" }, { status: 400 });

  if (!hasHivemindCredentials()) {
    if (MOCK_MODE) return mockStreamResponse(body.url!);
    return NextResponse.json({ error: "service_unconfigured" }, { status: 503 });
  }

  const ipHash = createHash("sha256")
    .update(`${clientIp(req)}:gtm-autopsy`)
    .digest("hex");

  let upstream: Response;
  try {
    upstream = await fetch(`${BASE_URL}/api/v1/teardown/teaser/stream`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": process.env.HIVEMIND_API_KEY!,
      },
      body: JSON.stringify({ url: body.url, ip_hash: ipHash }),
      cache: "no-store",
    });
  } catch (e) {
    return NextResponse.json(
      { error: "scan_failed", detail: String(e).slice(0, 160) },
      { status: 502 },
    );
  }

  if (upstream.status === 429)
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  if (!upstream.ok || !upstream.body) {
    const data = await upstream.json().catch(() => ({}));
    return NextResponse.json(
      { error: data.error ?? "scan_failed" },
      { status: upstream.status || 502 },
    );
  }

  return new Response(upstream.body, { headers: SSE_HEADERS });
}

function mockStreamResponse(url: string): Response {
  const events = buildMockStreamEvents(url);
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      // scan first; a short pause; then teaser — mirroring real timing.
      controller.enqueue(
        encoder.encode(
          `event: ${events[0].event}\ndata: ${events[0].data}\n\n`,
        ),
      );
      await new Promise((r) => setTimeout(r, 1200));
      controller.enqueue(
        encoder.encode(
          `event: ${events[1].event}\ndata: ${events[1].data}\n\n`,
        ),
      );
      controller.close();
    },
  });
  return new Response(stream, { headers: SSE_HEADERS });
}
