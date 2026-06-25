export interface LeadPayload {
  email: string;
  website_url: string;
  x_handle?: string | null;
  overall_score?: number | null;
  verdict?: string | null;
  report?: unknown;
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  referrer?: string | null;
  ip_hash?: string | null;
}

const BASE_URL =
  process.env.HIVEMIND_API_BASE_URL?.replace(/\/$/, "") || "https://hivemind.myosin.xyz";

// Posts a lead to the hive-mind capture endpoint. Returns null when no
// Hivemind key is configured (dev / mock mode) so the gate still opens.
export async function postLead(payload: LeadPayload): Promise<{ lead_id: string } | null> {
  const apiKey = process.env.HIVEMIND_API_KEY;
  if (!apiKey) return null;
  const res = await fetch(`${BASE_URL}/api/v1/leads`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": apiKey },
    body: JSON.stringify(payload),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`lead_capture_failed: ${res.status}`);
  const data = (await res.json()) as { lead_id: string };
  return { lead_id: data.lead_id };
}
