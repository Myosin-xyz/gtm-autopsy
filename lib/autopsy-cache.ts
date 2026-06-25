import type { TeaserResult } from "./types";

// Domain cache + per-IP rate limit, backed by the hive-mind Supabase DB via
// POST /api/v1/autopsy/cache (x-api-key). Degrades to allowed / no-cache when
// no Hivemind key is configured (dev / mock mode).

const BASE_URL =
  process.env.HIVEMIND_API_BASE_URL?.replace(/\/$/, "") || "https://hivemind.myosin.xyz";

async function callCache(body: Record<string, unknown>): Promise<Response | null> {
  const key = process.env.HIVEMIND_API_KEY;
  if (!key) return null;
  return fetch(`${BASE_URL}/api/v1/autopsy/cache`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": key },
    body: JSON.stringify(body),
    cache: "no-store",
  });
}

/**
 * Rate-check the IP and fetch any cached teaser in one call.
 * - `allowed: false` → over the per-IP limit (429 upstream).
 * - Fails open (allowed, no cache) when the key is unset or the call errors,
 *   so a cache outage never blocks teaser generation.
 */
export async function teaserGate(
  domain: string,
  ipHash: string,
): Promise<{ allowed: boolean; teaser: TeaserResult | null }> {
  const res = await callCache({ action: "get", domain, ip_hash: ipHash });
  if (!res) return { allowed: true, teaser: null };
  if (res.status === 429) return { allowed: false, teaser: null };
  if (!res.ok) return { allowed: true, teaser: null };
  try {
    const data = (await res.json()) as { allowed?: boolean; teaser?: TeaserResult | null };
    return { allowed: data.allowed !== false, teaser: data.teaser ?? null };
  } catch {
    return { allowed: true, teaser: null };
  }
}

export async function cacheTeaser(domain: string, teaser: TeaserResult): Promise<void> {
  try {
    await callCache({ action: "set", domain, teaser });
  } catch {
    /* best-effort */
  }
}
