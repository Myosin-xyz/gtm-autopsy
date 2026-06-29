import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { verifyTurnstile } from "@/lib/turnstile";
import { isDisposableEmail } from "@/lib/disposable-email";
import { hasHivemindCredentials } from "@/lib/hivemind";
import type { AutopsyScanV2, TeaserV2 } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const BASE_URL =
  process.env.HIVEMIND_API_BASE_URL?.replace(/\/$/, "") || "https://hivemind.myosin.xyz";

function clientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "0.0.0.0";
}
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Mock only in local dev. In production a missing key is a config error, not a
// reason to fake a successful enqueue and silently drop the lead.
const MOCK_MODE = process.env.NODE_ENV !== "production";

// Email gate → hive-mind v2 lead endpoint. Forwards the `email`, `scan`, and
// `teaser` the widget already has so hive-mind generates + emails the full
// teardown in the background (grounded, placeholder-owned project). Returns
// { ok, status }. Mock fallback (dev only) returns { ok: true, status: "generating" };
// a missing key in production fails closed (503).
export async function POST(req: Request) {
  let body: {
    email?: string;
    url?: string;
    scan?: AutopsyScanV2;
    teaser?: TeaserV2;
    turnstileToken?: string;
    utm?: Record<string, string>;
    referrer?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase() ?? "";
  if (!EMAIL_RE.test(email)) return NextResponse.json({ error: "invalid_email" }, { status: 400 });
  if (isDisposableEmail(email))
    return NextResponse.json({ error: "disposable_email" }, { status: 400 });
  if (!body.url) return NextResponse.json({ error: "missing_url" }, { status: 400 });

  const ip = clientIp(req);
  const human = await verifyTurnstile(body.turnstileToken, ip);
  if (!human) return NextResponse.json({ error: "turnstile_failed" }, { status: 403 });

  if (!hasHivemindCredentials()) {
    if (MOCK_MODE) {
      return NextResponse.json({ ok: true, status: "generating" });
    }
    return NextResponse.json({ error: "service_unconfigured" }, { status: 503 });
  }

  const ipHash = createHash("sha256").update(`${ip}:gtm-autopsy`).digest("hex");

  try {
    const res = await fetch(`${BASE_URL}/api/v1/teardown/lead`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": process.env.HIVEMIND_API_KEY!,
      },
      body: JSON.stringify({
        email,
        url: body.url,
        scan: body.scan,
        teaser: body.teaser,
        // Turnstile is verified above; the token is single-use, so don't forward
        // the now-consumed token (a re-verify downstream would reject it).
        ip_hash: ipHash,
        utm_source: body.utm?.utm_source ?? null,
        utm_medium: body.utm?.utm_medium ?? null,
        utm_campaign: body.utm?.utm_campaign ?? null,
        referrer: body.referrer ?? null,
      }),
      cache: "no-store",
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return NextResponse.json(
        { error: data.error ?? "capture_failed" },
        { status: res.status || 502 },
      );
    }
    return NextResponse.json({ ok: true, status: data.status ?? "generating" });
  } catch (e) {
    return NextResponse.json(
      { error: "capture_failed", detail: String(e).slice(0, 160) },
      { status: 502 },
    );
  }
}
