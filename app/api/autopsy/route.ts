import { NextResponse } from "next/server";
import { runAutopsy, hasHivemindCredentials } from "@/lib/hivemind";
import type { AutopsyInput, Category } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const VALID_CATEGORIES: Category[] = [
  "DeFi",
  "AI infra",
  "consumer crypto",
  "devtool",
  "agency",
  "other",
];

function sanitize(input: Partial<AutopsyInput>): AutopsyInput | null {
  const companyName = String(input.companyName ?? "").trim().slice(0, 80);
  const websiteUrl = String(input.websiteUrl ?? "").trim().slice(0, 200);
  const rawTwitter = String(input.twitterHandle ?? "").trim().replace(/^@/, "").slice(0, 40);
  const twitterHandle = rawTwitter || undefined;
  const category = VALID_CATEGORIES.includes(input.category as Category)
    ? (input.category as Category)
    : null;
  const competitorUrl = input.competitorUrl
    ? String(input.competitorUrl).trim().slice(0, 200)
    : undefined;
  const competitorHandle = input.competitorHandle
    ? String(input.competitorHandle).trim().replace(/^@/, "").slice(0, 40)
    : undefined;
  if (!companyName || !websiteUrl || !category) return null;
  return { companyName, websiteUrl, twitterHandle, category, competitorUrl, competitorHandle };
}

export async function GET() {
  return NextResponse.json({
    status: "ok",
    mode: hasHivemindCredentials() ? "live" : "mock",
  });
}

export async function POST(req: Request) {
  let body: Partial<AutopsyInput>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const input = sanitize(body);
  if (!input) {
    return NextResponse.json({ error: "missing_required_fields" }, { status: 400 });
  }
  try {
    const report = await runAutopsy(input);
    return NextResponse.json({ report });
  } catch (e) {
    return NextResponse.json(
      { error: "autopsy_failed", detail: String(e).slice(0, 240) },
      { status: 500 },
    );
  }
}
