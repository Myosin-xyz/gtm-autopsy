# Streaming Teaser Preview Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stream the teardown preview in two stages — a grounded `scan` reveal (~15s) then the full `teaser` (~30s) — via Server-Sent Events so the user sees real, personalized content instead of a blank 30s wait.

**Architecture:** hive-mind gains a new SSE endpoint that yields a `scan` event then a `teaser` event from its existing scan→diagnose pipeline. The gtm-autopsy proxy pipes that stream through (it holds the API key). The widget reads the stream, reveals a scan card on the `scan` event, then swaps in the existing teaser screen on the `teaser` event. The existing JSON endpoints are untouched.

**Tech Stack:** Next.js App Router (both repos), `ReadableStream` + `TextEncoder` for SSE, `node:assert` + `tsx` for tests, React `useState` phases in the widget.

## Global Constraints

- **hive-mind edits go in a git worktree on a feature branch** — never the active checkout. Copy `node_modules` + `.env.local` into the worktree (real copy, gitignored), never symlink. (See `[[hive-mind-worktree-isolation]]`, `[[worktree-setup-copy-deps]]`.)
- **gtm-autopsy pushes go to `myosin` (Myosin-xyz) only — NEVER `origin`** (Alice's fork). (See `[[gtm-autopsy-remote-push-rule]]`.)
- **Do not modify** the existing JSON routes (`/api/v1/teardown/teaser`, `/api/teardown/teaser`) — they have internal callers (lead route, tests).
- SSE event wire format is exactly: `event: <name>\ndata: <json>\n\n`.
- Both new routes set `export const maxDuration = 60` (diagnosis can exceed the default).
- The `scan` event payload omits `rawText`; the terminal `teaser` event carries the full `scan` (incl. `rawText`) so the lead call is unaffected.
- hive-mind: run lint/type-check with `npm run type-check`. Run a tsx test file with `npx tsx <path>`.
- gtm-autopsy: run a tsx test file with `npx tsx <path>` (matches existing `lib/domain.test.ts` style).

---

## Task 1: hive-mind — streaming core (`teaser-stream.ts`)

A pure, dependency-injected async generator that yields the ordered SSE events, plus an encoder. All I/O (cache, rate-limit, scan, diagnose) is injected so this is unit-testable without Puppeteer or the LLM.

**Files:**
- Create: `~/github/hive-mind` → `lib/api/v1/teardown/teaser-stream.ts`
- Test: `~/github/hive-mind` → `test/teardown-teaser-stream.test.ts`

**Interfaces:**
- Consumes: `AutopsyScan` from `./scan`, `AutopsyTeaser` from `./teaser`.
- Produces:
  - `encodeSseEvent(ev: TeaserStreamEvent): string`
  - `teaserStream(url: string, domain: string, deps: TeaserStreamDeps): AsyncGenerator<TeaserStreamEvent>`
  - `interface TeaserStreamDeps { getCached, setCached, rateOk, scan, diagnose }`
  - `type TeaserStreamEvent = {event:'scan';data:Omit<AutopsyScan,'rawText'>} | {event:'teaser';data:AutopsyTeaser & {scan:AutopsyScan}} | {event:'error';data:{error:string}}`

- [ ] **Step 1: Write the failing test**

Create `test/teardown-teaser-stream.test.ts`:

```ts
import assert from 'node:assert'

import type {AutopsyScan} from '../lib/api/v1/teardown/scan'
import type {AutopsyTeaser} from '../lib/api/v1/teardown/teaser'
import {
  encodeSseEvent,
  teaserStream,
  type TeaserStreamDeps,
} from '../lib/api/v1/teardown/teaser-stream'

const SCAN: AutopsyScan = {
  projectName: 'Stripe',
  description: 'Payments infra.',
  category: ['Payments'],
  socialHandles: {twitter: 'https://x.com/stripe'},
  audiences: ['Developers'],
  channels: ['Docs'],
  rawText: 'lots of on-page text',
}
const TEASER: AutopsyTeaser = {
  overallScore: 72,
  verdict: 'Strong but generic.',
  scorecard: {
    narrativeClarity: 70,
    icpSharpness: 75,
    proofCredibility: 80,
    categoryDifferentiation: 60,
    distributionLeverage: 75,
  },
  whatsBroken: ['a', 'b'],
}

function deps(over: Partial<TeaserStreamDeps> = {}): TeaserStreamDeps {
  return {
    getCached: async () => null,
    setCached: async () => {},
    rateOk: async () => true,
    scan: async () => SCAN,
    diagnose: async () => TEASER,
    ...over,
  }
}

async function collect(url: string, domain: string, d: TeaserStreamDeps) {
  const out = []
  for await (const ev of teaserStream(url, domain, d)) out.push(ev)
  return out
}

// The repo is CommonJS (no top-level await under tsx) — wrap async in main().
async function main() {
  // encodeSseEvent emits the exact wire format.
  assert.equal(
    encodeSseEvent({event: 'scan', data: {x: 1} as never}),
    'event: scan\ndata: {"x":1}\n\n',
  )

  // Miss path: scan event (no rawText) then teaser event (full scan), in order.
  const fresh = await collect('https://stripe.com', 'stripe.com', deps())
  assert.deepEqual(fresh.map((e) => e.event), ['scan', 'teaser'])
  assert.ok(!('rawText' in (fresh[0].data as object)), 'scan event omits rawText')
  assert.equal((fresh[0].data as {projectName: string}).projectName, 'Stripe')
  assert.equal((fresh[1].data as {overallScore: number}).overallScore, 72)
  assert.equal((fresh[1].data as {scan: AutopsyScan}).scan.rawText, 'lots of on-page text')

  // Miss path caches the full payload exactly once.
  let cachedPayload: unknown = null
  await collect('https://stripe.com', 'stripe.com', deps({setCached: async (_d, p) => {cachedPayload = p}}))
  assert.equal((cachedPayload as {overallScore: number}).overallScore, 72)

  // Cache hit: emit scan + teaser immediately, never scan/diagnose/rate-check.
  let scanned = false
  const hitDeps = deps({
    getCached: async () => ({...TEASER, scan: SCAN}),
    scan: async () => {scanned = true; return SCAN},
    rateOk: async () => {throw new Error('should not rate-check on hit')},
  })
  const hit = await collect('https://stripe.com', 'stripe.com', hitDeps)
  assert.deepEqual(hit.map((e) => e.event), ['scan', 'teaser'])
  assert.equal(scanned, false, 'cache hit must not re-scan')

  // Rate limited: single error event.
  const limited = await collect('https://stripe.com', 'stripe.com', deps({rateOk: async () => false}))
  assert.deepEqual(limited.map((e) => e.event), ['error'])
  assert.equal((limited[0].data as {error: string}).error, 'rate_limited')

  // Scan throws: error event, no teaser.
  const broken = await collect('https://x.com', 'x.com', deps({scan: async () => {throw new Error('boom')}}))
  assert.deepEqual(broken.map((e) => e.event), ['error'])
  assert.equal((broken[0].data as {error: string}).error, 'scan_failed')

  console.log('teaser-stream: passed')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd ~/github/hive-mind-worktree && npx tsx test/teardown-teaser-stream.test.ts`
Expected: FAIL — cannot find module `teaser-stream` / `teaserStream is not a function`.

- [ ] **Step 3: Write minimal implementation**

Create `lib/api/v1/teardown/teaser-stream.ts`:

```ts
import type {AutopsyScan} from './scan'
import type {AutopsyTeaser} from './teaser'

export type TeaserStreamEvent =
  | {event: 'scan'; data: Omit<AutopsyScan, 'rawText'>}
  | {event: 'teaser'; data: AutopsyTeaser & {scan: AutopsyScan}}
  | {event: 'error'; data: {error: string}}

export interface TeaserStreamDeps {
  getCached: (domain: string) => Promise<unknown | null>
  setCached: (domain: string, payload: unknown) => Promise<void>
  rateOk: () => Promise<boolean>
  scan: (url: string) => Promise<AutopsyScan>
  diagnose: (scan: AutopsyScan) => Promise<AutopsyTeaser>
}

// `event: <name>\ndata: <json>\n\n` — the exact SSE wire format.
export function encodeSseEvent(ev: TeaserStreamEvent): string {
  return `event: ${ev.event}\ndata: ${JSON.stringify(ev.data)}\n\n`
}

function stripRaw(scan: AutopsyScan): Omit<AutopsyScan, 'rawText'> {
  const {rawText: _rawText, ...rest} = scan
  return rest
}

/**
 * Ordered SSE events for the streaming teaser. Pure control-flow: all I/O is
 * injected, so this runs under tsx without Puppeteer or the LLM.
 *
 * Cache hit → scan, teaser (fast). Miss → rate-check; scan; teaser; cache.
 * Any failure short-circuits to a single `error` event.
 */
export async function* teaserStream(
  url: string,
  domain: string,
  deps: TeaserStreamDeps,
): AsyncGenerator<TeaserStreamEvent> {
  const cached = await deps.getCached(domain)
  if (cached && typeof cached === 'object' && 'scan' in cached) {
    const c = cached as AutopsyTeaser & {scan: AutopsyScan}
    yield {event: 'scan', data: stripRaw(c.scan)}
    yield {event: 'teaser', data: c}
    return
  }

  if (!(await deps.rateOk())) {
    yield {event: 'error', data: {error: 'rate_limited'}}
    return
  }

  try {
    const scan = await deps.scan(url)
    yield {event: 'scan', data: stripRaw(scan)}
    const teaser = await deps.diagnose(scan)
    const payload = {...teaser, scan}
    await deps.setCached(domain, payload)
    yield {event: 'teaser', data: payload}
  } catch {
    yield {event: 'error', data: {error: 'scan_failed'}}
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd ~/github/hive-mind-worktree && npx tsx test/teardown-teaser-stream.test.ts`
Expected: PASS — prints `teaser-stream: passed`.

- [ ] **Step 5: Commit**

```bash
cd ~/github/hive-mind-worktree
git add lib/api/v1/teardown/teaser-stream.ts test/teardown-teaser-stream.test.ts
git commit -m "feat(teardown): streaming core for two-stage teaser SSE"
```

---

## Task 2: hive-mind — SSE route (`teaser/stream/route.ts`)

Wire the streaming core to the real cache/rate-limit/scan/diagnose, behind the same `withLeadsAuth` + CORS as the JSON route, returning `text/event-stream`.

**Files:**
- Create: `~/github/hive-mind` → `app/api/v1/teardown/teaser/stream/route.ts`

**Interfaces:**
- Consumes: `teaserStream`, `encodeSseEvent` (Task 1); `getCachedTeaser`, `setCachedTeaser`, `rateCheck` from `@/lib/api/v1/teardown/cache-store`; `resolveRateKey` from `@/lib/api/v1/teardown/rate-key`; `scanForAutopsy` from `@/lib/api/v1/teardown/scan`; `buildTeaser` from `@/lib/api/v1/teardown/teaser`; `withLeadsAuth`, `getCorsHeaders`, `normalizeDomain`.
- Produces: `POST /api/v1/teardown/teaser/stream` → SSE stream; `OPTIONS` preflight.

- [ ] **Step 1: Write the route**

Create `app/api/v1/teardown/teaser/stream/route.ts`:

```ts
import {NextRequest, NextResponse} from 'next/server'

import {withLeadsAuth} from '@/lib/api/middleware/leads-auth'
import {getCorsHeaders} from '@/lib/api/utils/cors'
import {normalizeDomain} from '@/lib/api/v1/leads/validate-lead'
import {
  getCachedTeaser,
  setCachedTeaser,
  rateCheck,
} from '@/lib/api/v1/teardown/cache-store'
import {resolveRateKey} from '@/lib/api/v1/teardown/rate-key'
import {scanForAutopsy} from '@/lib/api/v1/teardown/scan'
import {
  teaserStream,
  encodeSseEvent,
} from '@/lib/api/v1/teardown/teaser-stream'
import {buildTeaser} from '@/lib/api/v1/teardown/teaser'

export const maxDuration = 60

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      ...getCorsHeaders(request),
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, x-api-key',
      'Access-Control-Max-Age': '86400',
    },
  })
}

/**
 * POST /api/v1/teardown/teaser/stream — same pipeline as the JSON teaser, but
 * streamed as two-stage SSE: a `scan` event (no rawText) when the scrape +
 * classification finish, then a `teaser` event (full payload incl. scan) when
 * the diagnosis finishes. Terminal `error` event on rate-limit / scan failure.
 */
export async function POST(request: NextRequest) {
  const cors = getCorsHeaders(request)
  return withLeadsAuth(request, async (_keyInfo, req) => {
    let body: {url?: string; ip_hash?: string}
    try {
      body = await req.json()
    } catch {
      return NextResponse.json(
        {error: 'invalid_json'},
        {status: 400, headers: cors}
      )
    }

    const domain = body.url ? normalizeDomain(body.url) : null
    if (!domain) {
      return NextResponse.json(
        {error: 'invalid_url'},
        {status: 400, headers: cors}
      )
    }

    const encoder = new TextEncoder()
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          for await (const ev of teaserStream(body.url!, domain, {
            getCached: getCachedTeaser,
            setCached: setCachedTeaser,
            rateOk: () => rateCheck(resolveRateKey(req, body.ip_hash)),
            scan: scanForAutopsy,
            diagnose: buildTeaser,
          })) {
            controller.enqueue(encoder.encode(encodeSseEvent(ev)))
          }
        } catch {
          controller.enqueue(
            encoder.encode(
              encodeSseEvent({event: 'error', data: {error: 'scan_failed'}})
            )
          )
        } finally {
          controller.close()
        }
      },
    })

    // NextResponse (not Response) — withLeadsAuth's callback is typed to return
    // NextResponse; it accepts a ReadableStream body.
    return new NextResponse(stream, {
      headers: {
        ...cors,
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
      },
    })
  })
}
```

- [ ] **Step 2: Type-check**

Run: `cd ~/github/hive-mind-worktree && npm run type-check`
Expected: PASS (no new errors referencing this route).

- [ ] **Step 3: Manual smoke (mock-free, optional if env present)**

If `.env.local` has hive-mind creds and a dev server is running (`npm run dev`):
Run: `curl -N -s -X POST localhost:3000/api/v1/teardown/teaser/stream -H 'content-type: application/json' -H "x-api-key: $HIVEMIND_API_KEY" -d '{"url":"stripe.com"}'`
Expected: an `event: scan` block, then later an `event: teaser` block. Skip if no creds/server — Task 1 covers the logic; gtm-autopsy mock mode (Task 4) covers the end-to-end UX.

- [ ] **Step 4: Commit**

```bash
cd ~/github/hive-mind-worktree
git add app/api/v1/teardown/teaser/stream/route.ts
git commit -m "feat(teardown): SSE endpoint for streaming teaser"
```

---

## Task 3: gtm-autopsy — SSE parser (`components/sse.ts`)

A pure incremental SSE parser the widget feeds decoded stream chunks into.

**Files:**
- Create: `~/github/gtm-autopsy` → `components/sse.ts`
- Test: `~/github/gtm-autopsy` → `components/sse.test.ts`

**Interfaces:**
- Produces:
  - `interface SseEvent { event: string; data: string }`
  - `parseSseBuffer(buffer: string): {events: SseEvent[]; rest: string}`

- [ ] **Step 1: Write the failing test**

Create `components/sse.test.ts`:

```ts
import assert from "node:assert";
import { parseSseBuffer } from "./sse";

// Two complete events parse; named events captured.
const a = parseSseBuffer(
  'event: scan\ndata: {"projectName":"Stripe"}\n\nevent: teaser\ndata: {"overallScore":72}\n\n',
);
assert.deepEqual(a.events.map((e) => e.event), ["scan", "teaser"]);
assert.equal(a.events[0].data, '{"projectName":"Stripe"}');
assert.equal(a.rest, "");

// A trailing incomplete event is returned as `rest`, not parsed.
const b = parseSseBuffer('event: scan\ndata: {"a":1}\n\nevent: teaser\ndata: {"over');
assert.deepEqual(b.events.map((e) => e.event), ["scan"]);
assert.equal(b.rest, 'event: teaser\ndata: {"over');

// Default event name is "message" when only data: is present.
const c = parseSseBuffer("data: hello\n\n");
assert.equal(c.events[0].event, "message");
assert.equal(c.events[0].data, "hello");

// No complete event yet → everything is rest.
const d = parseSseBuffer("event: scan\ndata: {");
assert.deepEqual(d.events, []);
assert.equal(d.rest, "event: scan\ndata: {");

console.log("sse: passed");
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd ~/github/gtm-autopsy && npx tsx components/sse.test.ts`
Expected: FAIL — cannot find module `./sse`.

- [ ] **Step 3: Write minimal implementation**

Create `components/sse.ts`:

```ts
export interface SseEvent {
  event: string;
  data: string;
}

// Parse every complete SSE event (terminated by a blank line) in `buffer`.
// Returns the parsed events plus the unparsed remainder — an incomplete
// trailing event the caller carries into the next chunk. Multiple `data:`
// lines in one event are joined with "\n" per the SSE spec.
export function parseSseBuffer(buffer: string): {
  events: SseEvent[];
  rest: string;
} {
  const events: SseEvent[] = [];
  const blocks = buffer.split("\n\n");
  const rest = blocks.pop() ?? "";
  for (const block of blocks) {
    let event = "message";
    const dataLines: string[] = [];
    for (const line of block.split("\n")) {
      if (line.startsWith("event:")) event = line.slice(6).trim();
      else if (line.startsWith("data:")) dataLines.push(line.slice(5).trim());
    }
    if (dataLines.length) events.push({ event, data: dataLines.join("\n") });
  }
  return { events, rest };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd ~/github/gtm-autopsy && npx tsx components/sse.test.ts`
Expected: PASS — prints `sse: passed`.

- [ ] **Step 5: Commit**

```bash
cd ~/github/gtm-autopsy
git add components/sse.ts components/sse.test.ts
git commit -m "feat(widget): incremental SSE parser"
```

---

## Task 4: gtm-autopsy — streaming proxy route (`teaser/stream/route.ts`)

Pipe the hive-mind SSE stream through (proxy holds the API key); synthesize the two events from the mock in local dev.

**Files:**
- Create: `~/github/gtm-autopsy` → `lib/mock-stream.ts`
- Create: `~/github/gtm-autopsy` → `lib/mock-stream.test.ts`
- Create: `~/github/gtm-autopsy` → `app/api/teardown/teaser/stream/route.ts`

**Interfaces:**
- Consumes: `mockTeaserV2` from `@/lib/mock-v2`; `normalizeDomain` from `@/lib/domain`; `hasHivemindCredentials` from `@/lib/hivemind`.
- Produces:
  - `buildMockStreamEvents(url: string): {event: string; data: string}[]` (in `lib/mock-stream.ts`)
  - `POST /api/teardown/teaser/stream`

- [ ] **Step 1: Write the failing test for the mock-event builder**

Create `lib/mock-stream.test.ts`:

```ts
import assert from "node:assert";
import { buildMockStreamEvents } from "./mock-stream";

const evs = buildMockStreamEvents("stripe.com");
assert.deepEqual(evs.map((e) => e.event), ["scan", "teaser"]);

// scan event omits rawText; teaser event is the full TeaserV2.
const scan = JSON.parse(evs[0].data);
assert.ok(!("rawText" in scan), "mock scan event omits rawText");
assert.ok(typeof scan.projectName === "string" && scan.projectName.length > 0);

const teaser = JSON.parse(evs[1].data);
assert.equal(typeof teaser.overallScore, "number");
assert.ok(Array.isArray(teaser.whatsBroken));
assert.ok(teaser.scan, "teaser event carries scan for the lead call");

console.log("mock-stream: passed");
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd ~/github/gtm-autopsy && npx tsx lib/mock-stream.test.ts`
Expected: FAIL — cannot find module `./mock-stream`.

- [ ] **Step 3: Implement the mock-event builder**

Create `lib/mock-stream.ts`:

```ts
import { mockTeaserV2 } from "./mock-v2";

// The two SSE events the streaming proxy replays in local dev (no hive-mind
// creds), mirroring the backend: a `scan` event (no rawText) then a `teaser`
// event carrying the full TeaserV2 (incl. scan) for the lead call.
export function buildMockStreamEvents(
  url: string,
): { event: string; data: string }[] {
  const teaser = mockTeaserV2(url);
  const { rawText: _rawText, ...scanNoRaw } = teaser.scan;
  return [
    { event: "scan", data: JSON.stringify(scanNoRaw) },
    { event: "teaser", data: JSON.stringify(teaser) },
  ];
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd ~/github/gtm-autopsy && npx tsx lib/mock-stream.test.ts`
Expected: PASS — prints `mock-stream: passed`.

- [ ] **Step 5: Write the proxy route**

Create `app/api/teardown/teaser/stream/route.ts`:

```ts
import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { normalizeDomain } from "@/lib/domain";
import { hasHivemindCredentials } from "@/lib/hivemind";
import { buildMockStreamEvents } from "@/lib/mock-stream";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

const BASE_URL =
  process.env.HIVEMIND_API_BASE_URL?.replace(/\/$/, "") ||
  "https://hivemind.myosin.xyz";
const MOCK_MODE = process.env.NODE_ENV !== "production";

const SSE_HEADERS = {
  "Content-Type": "text/event-stream; charset=utf-8",
  "Cache-Control": "no-cache, no-transform",
  Connection: "keep-alive",
};

function clientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "0.0.0.0";
}

// Streaming sibling of /api/teardown/teaser. Pipes the hive-mind SSE stream
// straight through (we hold the API key); degrades to a replayed mock stream in
// local dev so the two-stage UX works offline.
export async function POST(req: Request) {
  let body: { url?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const domain = body.url ? normalizeDomain(body.url) : null;
  if (!domain) return NextResponse.json({ error: "invalid_url" }, { status: 400 });

  if (!hasHivemindCredentials()) {
    if (MOCK_MODE) return mockStreamResponse(body.url!);
    return NextResponse.json({ error: "service_unconfigured" }, { status: 503 });
  }

  const ipHash = createHash("sha256")
    .update(`${clientIp(req)}:gtm-autopsy`)
    .digest("hex");

  let upstream: Response;
  try {
    upstream = await fetch(`${BASE_URL}/api/v1/teardown/teaser/stream`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": process.env.HIVEMIND_API_KEY!,
      },
      body: JSON.stringify({ url: body.url, ip_hash: ipHash }),
      cache: "no-store",
    });
  } catch (e) {
    return NextResponse.json(
      { error: "scan_failed", detail: String(e).slice(0, 160) },
      { status: 502 },
    );
  }

  if (upstream.status === 429)
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  if (!upstream.ok || !upstream.body) {
    const data = await upstream.json().catch(() => ({}));
    return NextResponse.json(
      { error: data.error ?? "scan_failed" },
      { status: upstream.status || 502 },
    );
  }

  return new Response(upstream.body, { headers: SSE_HEADERS });
}

function mockStreamResponse(url: string): Response {
  const events = buildMockStreamEvents(url);
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      // scan first; a short pause; then teaser — mirroring real timing.
      controller.enqueue(
        encoder.encode(`event: ${events[0].event}\ndata: ${events[0].data}\n\n`),
      );
      await new Promise((r) => setTimeout(r, 1200));
      controller.enqueue(
        encoder.encode(`event: ${events[1].event}\ndata: ${events[1].data}\n\n`),
      );
      controller.close();
    },
  });
  return new Response(stream, { headers: SSE_HEADERS });
}
```

- [ ] **Step 6: Manual smoke (mock mode)**

Run (in one terminal): `cd ~/github/gtm-autopsy && npm run dev`
Run (in another): `curl -N -s -X POST localhost:3030/api/teardown/teaser/stream -H 'content-type: application/json' -d '{"url":"stripe.com"}'`
Expected: an `event: scan` block immediately, then ~1.2s later an `event: teaser` block. (Assumes no hive-mind creds in `.env.local`, i.e. mock mode.)

- [ ] **Step 7: Commit**

```bash
cd ~/github/gtm-autopsy
git add lib/mock-stream.ts lib/mock-stream.test.ts app/api/teardown/teaser/stream/route.ts
git commit -m "feat(widget): streaming teaser proxy with mock-mode replay"
```

---

## Task 5: gtm-autopsy — widget consumes the stream

Read the stream, reveal a grounded scan card on the `scan` event, swap in the existing teaser screen on the `teaser` event.

**Files:**
- Modify: `~/github/gtm-autopsy` → `components/WidgetApp.tsx`

**Interfaces:**
- Consumes: `parseSseBuffer` (Task 3); `POST /api/teardown/teaser/stream` (Task 4); `AutopsyScanV2`, `TeaserV2` from `@/lib/types`.

- [ ] **Step 1: Add imports and the `scanned` phase + scan state**

In `components/WidgetApp.tsx`:

Add to the type imports (top of file):

```tsx
import type { TeaserV2, AutopsyScanV2 } from "@/lib/types";
import { parseSseBuffer } from "./sse";
```

Add `"scanned"` to the `Phase` union:

```tsx
type Phase =
  | "idle"
  | "loadingTeaser"
  | "scanned"
  | "teaser"
  | "scanFailed"
  | "sent"
  | "limitReached";
```

Add scan state next to the other `useState` hooks (after `teaser` state):

```tsx
  const [scan, setScan] = useState<Partial<AutopsyScanV2> | null>(null);
```

Clear it in `reset()` (add inside the existing function body):

```tsx
    setScan(null);
```

- [ ] **Step 2: Replace `submitUrl`'s fetch/json with the stream reader**

Replace the entire body of `submitUrl` (from `setError(null)` through the closing `catch`) with:

```tsx
    setError(null);
    setScan(null);
    setStepIdx(0);
    setPhase("loadingTeaser");
    track("gtm_autopsy_started", { url: url.trim() });
    try {
      const res = await fetch("/api/teardown/teaser/stream", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}));
        const err = data.error ?? "scan_failed";
        setError(err);
        setPhase(err === "scan_failed" ? "scanFailed" : "idle");
        return;
      }

      const reader = res.body
        .pipeThrough(new TextDecoderStream())
        .getReader();
      let buffer = "";
      let gotTeaser = false;

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += value;
        const { events, rest } = parseSseBuffer(buffer);
        buffer = rest;
        for (const ev of events) {
          if (ev.event === "scan") {
            setScan(JSON.parse(ev.data) as Partial<AutopsyScanV2>);
            setPhase("scanned");
          } else if (ev.event === "teaser") {
            setTeaser(JSON.parse(ev.data) as TeaserV2);
            setPhase("teaser");
            gotTeaser = true;
            track("gtm_autopsy_teaser_viewed", { url: url.trim() });
          } else if (ev.event === "error") {
            const err =
              (JSON.parse(ev.data) as { error?: string }).error ?? "scan_failed";
            setError(err);
            setPhase(err === "rate_limited" ? "idle" : "scanFailed");
            return;
          }
        }
      }

      if (!gotTeaser) {
        setError("scan_failed");
        setPhase("scanFailed");
      }
    } catch (err) {
      setError(String(err));
      setPhase("scanFailed");
    }
```

> Note: this removes the old artificial `elapsed < 2200` delay and the `loadingTeaser`/`Date.now()` timing — real events now drive the screens. The teaser loading-step animation effect (the `useEffect` watching `phase === "loadingTeaser"`) stays as-is and runs until the first `scan`/`teaser` event flips the phase.

- [ ] **Step 3: Render the `scanned` phase**

In the JSX `return` of `WidgetApp`, add a branch right after the `loadingTeaser` block and before the `teaser` block:

```tsx
        {phase === "scanned" && scan && (
          <ScanRevealScreen scan={scan} />
        )}
```

- [ ] **Step 4: Add the `ScanRevealScreen` component**

Add this component (next to the other screen components, e.g. after `LoadingScreen`):

```tsx
function Chips({ label, items }: { label: string; items?: string[] }) {
  if (!items || items.length === 0) return null;
  return (
    <div style={{ marginTop: 16 }}>
      <div className="myo-card-label">{label}</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
        {items.slice(0, 6).map((it, i) => (
          <span
            key={i}
            style={{
              fontFamily: "var(--font-mono-stack)",
              fontSize: 12,
              color: "rgba(255,255,255,0.85)",
              border: "1px solid rgba(255,255,255,0.16)",
              borderRadius: 999,
              padding: "5px 12px",
            }}
          >
            {it}
          </span>
        ))}
      </div>
    </div>
  );
}

// Shown the moment the `scan` event lands: real, grounded facts about the site
// while the diagnosis (score / what's broken) is still running.
function ScanRevealScreen({ scan }: { scan: Partial<AutopsyScanV2> }) {
  const company = scan.projectName || "your site";
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div className="myo-card">
        <div className="myo-card-label" style={{ color: "var(--myo-lime)" }}>
          / We read {company}
        </div>
        {scan.description && (
          <p
            style={{
              margin: "10px 0 0",
              fontSize: 17,
              color: "#fff",
              lineHeight: 1.5,
            }}
          >
            {scan.description}
          </p>
        )}
        <Chips label="/ Category" items={scan.category} />
        <Chips label="/ Who you're talking to" items={scan.audiences} />
        <Chips label="/ Channels" items={scan.channels} />
      </div>

      <div
        className="myo-kicker"
        style={{
          color: "var(--myo-pink)",
          display: "flex",
          alignItems: "center",
          gap: 8,
          margin: 0,
        }}
      >
        <span className="myo-pulse-dot" />
        / Diagnosing your GTM&hellip;
      </div>
      <div
        style={{
          height: 2,
          width: "100%",
          background: "rgba(255,255,255,0.08)",
          overflow: "hidden",
        }}
      >
        <div className="myo-shimmer-bar" />
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Type-check / lint**

Run: `cd ~/github/gtm-autopsy && npm run lint`
Expected: PASS (no errors in `WidgetApp.tsx`). Fix any unused-import or type errors surfaced.

- [ ] **Step 6: Manual verification (mock mode)**

Run: `cd ~/github/gtm-autopsy && npm run dev`, open `localhost:3030/widget`, enter `stripe.com`, submit.
Expected: loading steps → a scan card ("We read Stripe", category/audience/channel chips, "Diagnosing…" shimmer) at ~scan time → the full teaser screen ~1.2s later. Email gate still works.

- [ ] **Step 7: Commit**

```bash
cd ~/github/gtm-autopsy
git add components/WidgetApp.tsx
git commit -m "feat(widget): two-stage streaming teaser with scan reveal"
```

---

## Verification (whole feature)

- [ ] hive-mind worktree: `npx tsx test/teardown-teaser-stream.test.ts` passes; `npm run type-check` clean.
- [ ] gtm-autopsy: `npx tsx components/sse.test.ts` and `npx tsx lib/mock-stream.test.ts` pass; `npm run lint` clean.
- [ ] Manual mock-mode run shows scan reveal then teaser.
- [ ] Existing `~/github/hive-mind` `test/teardown-teaser.test.ts` still passes (JSON route untouched).
- [ ] Integration: with hive-mind creds, the widget against a real backend shows the scan card before the score.

## Deferred / follow-up

- Token-level streaming of the diagnosis (verdict + bullets typing in live).
- Three-stage split (earliest `reading` event right after the raw scrape).
- Driving the `LoadingScreen` step list from real event progress (currently still timer-animated until the first event).
