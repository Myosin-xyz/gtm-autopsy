"use client";
import posthog from "posthog-js";

// event keys retain the gtm_autopsy_* prefix for PostHog funnel continuity
type GtmEvent =
  | "gtm_autopsy_started"
  | "gtm_autopsy_teaser_viewed"
  | "gtm_autopsy_email_captured";

let ready = false;

export function initAnalytics(): void {
  if (ready || typeof window === "undefined") return;
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key) return;
  posthog.init(key, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com",
    capture_pageview: false,
    persistence: "memory", // sandboxed cross-origin iframe — don't rely on cookies
  });
  ready = true;
}

export function track(event: GtmEvent, props?: Record<string, unknown>): void {
  if (!ready) return;
  posthog.capture(event, props);
}
