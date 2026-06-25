import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { runTeaser, inputFromUrl } from "@/lib/hivemind";
import { normalizeDomain } from "@/lib/domain";
import { teaserGate, cacheTeaser } from "@/lib/autopsy-cache";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function clientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "0.0.0.0";
}

export async function POST(req: Request) {
  let body: { url?: string; xHandle?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const domain = body.url ? normalizeDomain(body.url) : null;
  if (!domain) return NextResponse.json({ error: "invalid_url" }, { status: 400 });

  const ipHash = createHash("sha256").update(`${clientIp(req)}:gtm-autopsy`).digest("hex");

  // Single round-trip: rate-check + cache lookup.
  const gate = await teaserGate(domain, ipHash);
  if (!gate.allowed) return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  if (gate.teaser) return NextResponse.json({ teaser: gate.teaser, cached: true });

  const input = inputFromUrl(body.url!, body.xHandle);
  if (!input) return NextResponse.json({ error: "invalid_url" }, { status: 400 });

  const teaser = await runTeaser(input);
  await cacheTeaser(domain, teaser);
  return NextResponse.json({ teaser, cached: false });
}
