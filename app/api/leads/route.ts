import { NextResponse } from "next/server";
import { verifyTurnstile } from "@/lib/turnstile";
import { isDisposableEmail } from "@/lib/disposable-email";
import { hasHivemindCredentials } from "@/lib/hivemind";
import { mockReportV2 } from "@/lib/mock-v2";
import type { AutopsyScanV2, TeaserV2 } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const BASE_URL =
  process.env.HIVEMIND_API_BASE_URL?.replace(/\/$/, "") || "https://hivemind.myosin.xyz";

function clientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "0.0.0.0";
}
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Email gate → hive-mind v2 lead endpoint. Forwards the `scan` + `teaser` the
// widget already has so hive-mind builds the grounded teardown and the thin
// placeholder project without re-scraping. Returns { lead_id, project_id,
// report }. Mock fallback (no key) returns a deterministic report so dev works.
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
    return NextResponse.json({
      lead_id: null,
      project_id: null,
      report: mockReportV2(body.url),
    });
  }

  try {
    const res = await fetch(`${BASE_URL}/api/v1/autopsy/lead`, {
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
        turnstileToken: body.turnstileToken,
        utm_source: body.utm?.utm_source ?? null,
        utm_medium: body.utm?.utm_medium ?? null,
        utm_campaign: body.utm?.utm_campaign ?? null,
        referrer: body.referrer ?? null,
      }),
      cache: "no-store",
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.report) {
      return NextResponse.json(
        { error: data.error ?? "capture_failed" },
        { status: res.status || 502 },
      );
    }
    return NextResponse.json({
      lead_id: data.lead_id ?? null,
      project_id: data.project_id ?? null,
      report: data.report,
    });
  } catch (e) {
    return NextResponse.json(
      { error: "capture_failed", detail: String(e).slice(0, 160) },
      { status: 502 },
    );
  }
}
