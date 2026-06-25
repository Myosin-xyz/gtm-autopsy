export function normalizeDomain(rawUrl: string): string | null {
  if (!rawUrl || typeof rawUrl !== "string") return null;
  try {
    const withScheme = /^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`;
    const host = new URL(withScheme).hostname;
    if (!host || !host.includes(".")) return null;
    return host.replace(/^www\./i, "").toLowerCase();
  } catch {
    return null;
  }
}

export function companyNameFromDomain(domain: string): string {
  const label = domain.split(".")[0] ?? domain;
  return label
    .split(/[-_]/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
