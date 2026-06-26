import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { normalizeDomain } from "@/lib/domain";
import { hasHivemindCredentials } from "@/lib/hivemind";
import { mockTeaserV2 } from "@/lib/mock-v2";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const BASE_URL =
  process.env.HIVEMIND_API_BASE_URL?.replace(/\/$/, "") || "https://hivemind.myosin.xyz";

function clientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "0.0.0.0";
}

// Thin proxy → hive-mind v2 grounded teaser. The hive-mind endpoint scrapes the
// site, runs the GTM Architect diagnosis, and handles its own domain cache +
// per-IP rate limit. With no HIVEMIND_API_KEY we degrade to a deterministic mock
// so `npm run dev` works offline. Returns { teaser } where teaser includes the
// `scan` the lead call needs (so we never re-scrape).
export async function POST(req: Request) {
  let body: { url?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const domain = body.url ? normalizeDomain(body.url) : null;
  if (!domain) return NextResponse.json({ error: "invalid_url" }, { status: 400 });

  if (!hasHivemindCredentials()) {
    return NextResponse.json({ teaser: mockTeaserV2(body.url!), cached: false });
  }

  const ipHash = createHash("sha256").update(`${clientIp(req)}:gtm-autopsy`).digest("hex");

  try {
    const res = await fetch(`${BASE_URL}/api/v1/teardown/teaser`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": process.env.HIVEMIND_API_KEY!,
      },
      body: JSON.stringify({ url: body.url, ip_hash: ipHash }),
      cache: "no-store",
    });
    const data = await res.json().catch(() => ({}));
    if (res.status === 429) return NextResponse.json({ error: "rate_limited" }, { status: 429 });
    if (!res.ok || !data.teaser) {
      return NextResponse.json(
        { error: data.error ?? "scan_failed" },
        { status: res.status === 502 ? 502 : res.status || 502 },
      );
    }
    return NextResponse.json({ teaser: data.teaser, cached: Boolean(data.cached) });
  } catch (e) {
    return NextResponse.json(
      { error: "scan_failed", detail: String(e).slice(0, 160) },
      { status: 502 },
    );
  }
}
