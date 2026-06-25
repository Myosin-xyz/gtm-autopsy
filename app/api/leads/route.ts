import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { verifyTurnstile } from "@/lib/turnstile";
import { isDisposableEmail } from "@/lib/disposable-email";
import { postLead } from "@/lib/leads-client";
import type { TeaserResult } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function clientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "0.0.0.0";
}
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
  let body: {
    email?: string;
    url?: string;
    xHandle?: string;
    teaser?: TeaserResult;
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

  const ip_hash = createHash("sha256").update(`${ip}:gtm-autopsy`).digest("hex");

  try {
    const result = await postLead({
      email,
      website_url: body.url,
      x_handle: body.xHandle ?? null,
      overall_score: body.teaser?.overallScore ?? null,
      verdict: body.teaser?.verdict ?? null,
      report: body.teaser ?? null,
      utm_source: body.utm?.utm_source ?? null,
      utm_medium: body.utm?.utm_medium ?? null,
      utm_campaign: body.utm?.utm_campaign ?? null,
      referrer: body.referrer ?? null,
      ip_hash,
    });
    // result is null in dev (no Hivemind key) — still open the gate.
    return NextResponse.json({ success: true, lead_id: result?.lead_id ?? null });
  } catch (e) {
    return NextResponse.json(
      { error: "capture_failed", detail: String(e).slice(0, 160) },
      { status: 502 },
    );
  }
}
