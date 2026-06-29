# Streaming teaser preview — design

**Date:** 2026-06-29
**Status:** Approved, ready for implementation
**Repos:** `gtm-autopsy` (widget + proxy), `hive-mind` (backend pipeline)

## Problem

The widget's teardown preview can take ~30s to appear. Today the widget makes
one blocking call to its own `/api/teardown/teaser` proxy, which calls the
hive-mind `/api/v1/teardown/teaser` endpoint. That endpoint runs three
sequential server-side stages and returns everything at once:

1. `scanWebsite()` — raw scrape (~few sec)
2. `aiWebAnalysis()` — LLM classification, up to 45s timeout (category,
   audiences, channels)
3. `buildTeaser()` — Opus 4.8 diagnosis, ~15-30s (score, verdict, what's broken)

During the wait the widget shows three *fake* timed loading steps. The user
stares at a blank-ish screen with no real, personalized content until the whole
thing finishes.

## Goal

Surface real, grounded content as soon as it is available, to keep the user
engaged. Decision: **two-stage Server-Sent Events (SSE)**.

- Stage 1 (`scan`, ~15s): scrape + classification done → show "what we read
  about you" (company, description, category, audiences, channels).
- Stage 2 (`teaser`, ~+15-30s): diagnosis done → score, verdict, what's broken,
  email gate (the existing `TeaserScreen`).

Token-level streaming of the diagnosis is explicitly **out of scope** (the
`scan` card fills the diagnosis gap; token-streaming a `json_object` is fragile).

## Architecture & data flow

```
WidgetApp (browser)
  └─ fetch POST /api/teardown/teaser/stream          [same-origin proxy]
        └─ gtm-autopsy proxy: pipe upstream SSE body through (holds API key)
              └─ POST /api/v1/teardown/teaser/stream  [hive-mind, NEW]
                    ├─ event: scan   {projectName, description, category, audiences, channels}
                    ├─ event: teaser {overallScore, verdict, scorecard, whatsBroken, scan}
                    └─ event: error  {error}          (terminal)
```

### hive-mind (backend)

- New route `app/api/v1/teardown/teaser/stream/route.ts` returning
  `text/event-stream` via a `ReadableStream`.
- Extract the scan→diagnosis core currently inline in the JSON route into a
  shared helper so both routes stay in sync (no logic drift). The helper takes
  `(url, domain, rateKey)` and exposes the two intermediate results.
- Flow:
  - Cache hit (`getCachedTeaser` with `scan`) → emit `scan` then `teaser`
    back-to-back immediately (still streamed, just fast).
  - Miss → `rateCheck`; on fail emit `error: rate_limited` and close.
    Else `scanForAutopsy` → emit `scan`; `buildTeaser` → emit `teaser`; then
    `setCachedTeaser(domain, {...teaser, scan})`.
  - Any throw → emit `error: scan_failed` and close.
- `scan` event payload omits `rawText` (not needed client-side). The terminal
  `teaser` event carries the full `scan` (incl. whatever the lead call needs).
- CORS via existing `getCorsHeaders`; add `OPTIONS`. `export const maxDuration = 60`.
- The existing JSON route is **unchanged** (internal callers: lead route, tests).

### gtm-autopsy (proxy)

- New route `app/api/teardown/teaser/stream/route.ts`.
- Validates URL + credentials exactly like the existing proxy. On success,
  calls the hive-mind stream endpoint with `x-api-key` and returns
  `new Response(upstream.body, { headers: text/event-stream, no-store })` —
  a pass-through pipe.
- Pre-stream errors stay HTTP status codes (`invalid_url` 400,
  `service_unconfigured` 503, upstream 429 `rate_limited`).
- **Mock mode** (local dev, no creds): synthesize the two SSE events from
  `mockTeaserV2` (a `scan` event, a short delay, then a `teaser` event) so the
  streaming UX is exercisable offline.
- `export const maxDuration = 60`.

### widget (`components/WidgetApp.tsx`)

- Replace `submitUrl`'s `fetch + res.json()` with a streaming reader over
  `/api/teardown/teaser/stream` + a tiny SSE line parser.
- New phase `scanned` between `loadingTeaser` and `teaser`. New state holding
  the partial `scan` object.
- On `scan` event → set scan state, move to `scanned` phase (reveal the scan
  card while diagnosis continues).
- On `teaser` event → set teaser, move to `teaser` phase (existing screen).
- On `error` event or a stream that ends without `teaser` → `scanFailed`.

## Widget UX

`LoadingScreen` stays for the first ~15s; its step list is driven by **real**
progress (step 1 "reading your site" completes when the `scan` event arrives)
rather than fake timers. When `scan` lands, render a grounded card in the
`scanned` phase:

> **✓ We read [Company]**
> *[description]*
> `/ CATEGORY` chips · `/ WHO YOU'RE TALKING TO` (audiences) · `/ CHANNELS`
> + a live "Diagnosing your GTM…" shimmer where the score will appear.

Then the `teaser` event swaps in the full `TeaserScreen` unchanged. Iframe
auto-height is handled by the existing `ResizeObserver` as content grows.

## Error handling & edge cases

- Pre-stream errors: HTTP status, mapped by existing `errorCopy`.
- Mid-stream `error` event → `scanFailed`.
- Stream ends before `teaser` → treat as `scan_failed`.
- `maxDuration = 60` on both new routes (diagnosis can exceed the default).
- Cache hit still streams (fast) so the widget has one code path.

## Testing

- hive-mind: unit-test the shared core helper; route test asserting event
  ordering (`scan` before `teaser`) and the cache-hit fast path. Existing
  `teardown-teaser.test.ts` stays green (JSON route untouched).
- widget: SSE parser unit test; proxy stream-through + mock-mode synthesis test.

## Out of scope

- Token-level streaming of the diagnosis.
- Splitting `scanForAutopsy` into scrape vs. classification (three-stage).
- Any change to the JSON teaser endpoint or the lead endpoint.
