import { NextResponse } from "next/server";
import { runFullReport, inputFromUrl } from "@/lib/hivemind";
import type { TeaserResult } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
  let body: { url?: string; xHandle?: string; teaser?: TeaserResult };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  if (!body.url || !body.teaser)
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });

  const input = inputFromUrl(body.url, body.xHandle);
  if (!input) return NextResponse.json({ error: "invalid_url" }, { status: 400 });

  const report = await runFullReport(input, body.teaser);
  return NextResponse.json({ report });
}
