# Phase 2 — gtm-autopsy lead hook — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the hackathon GTM Autopsy widget into a lead hook: single-URL input → free teaser → blurred/locked full report → email gate → write lead via hive-mind `POST /api/v1/leads` → unlock, with domain cache, per-IP limit, Turnstile, disposable-email block, and PostHog events.

**Architecture:** The orchestrator collapses from 4 calls to 2 (`runTeaser`, `runFullReport`), dropping the RAG call. Three server routes (`/api/autopsy/teaser`, `/api/leads`, `/api/autopsy/full`) keep the Hivemind `x-api-key` and the lead-capture call server-side. The widget renders a state machine: idle → teaser → gate → full. Abuse controls live in small Upstash-backed libs; analytics in a thin PostHog wrapper.

**Tech Stack:** Next.js 14 App Router, React 18, TypeScript, `@upstash/redis` + `@upstash/ratelimit`, Cloudflare Turnstile, `posthog-js`.

## Global Constraints

- Branch: `feat/gtm-autopsy-lead-hook` (already created). Commit frequently.
- **Graceful degradation is mandatory:** every external dependency (Hivemind API, Upstash, Turnstile, PostHog) must no-op or fall back when its env var is unset, so `npm run dev` works with zero credentials (mock mode), exactly like today.
- Hivemind key stays server-side only. Turnstile secret stays server-side; only the site key is `NEXT_PUBLIC_*`.
- Target hive-mind API: staging. `HIVEMIND_API_BASE_URL` points at the staging hive-mind deployment; `/api/v1/leads` (Phase 1) must be deployed there before end-to-end testing.
- Tests run with `npx tsx <file>` (add as needed); pure-logic tasks are TDD. Run `npx tsc --noEmit` before each commit.
- Reuse existing types in `lib/types.ts` and the mock builder `buildMockReport` / `mockFrameworks` in `lib/mocks.ts`. Do not duplicate report shapes.

---

## Task 1: Domain normalization + teaser types

**Files:**
- Create: `lib/domain.ts`
- Modify: `lib/types.ts`
- Test: `lib/domain.test.ts`

**Interfaces:**
- Produces:
  ```ts
  // lib/domain.ts
  export function normalizeDomain(rawUrl: string): string | null
  export function companyNameFromDomain(domain: string): string
  // lib/types.ts (additions)
  export interface TeaserResult {
    input: AutopsyInput
    overallScore: number
    verdict: string
    scorecard: ScoreCard
    whatsBroken: string[]
    trace: AutopsyReport['trace']
    generatedAt: string
  }
  export interface GateMeta { utmSource?: string; utmMedium?: string; utmCampaign?: string; referrer?: string }
  ```
  Consumed by Tasks 2–6.

- [ ] **Step 1: Write the failing test**

Create `lib/domain.test.ts`:
```ts
import assert from 'node:assert'
import {normalizeDomain, companyNameFromDomain} from './domain'

assert.equal(normalizeDomain('https://www.Vaultline.xyz/p?q=1'), 'vaultline.xyz')
assert.equal(normalizeDomain('vaultline.xyz'), 'vaultline.xyz')
assert.equal(normalizeDomain('garbage'), null)
assert.equal(companyNameFromDomain('vaultline.xyz'), 'Vaultline')
assert.equal(companyNameFromDomain('agent-frame.ai'), 'Agent Frame')
console.log('domain: passed')
```

- [ ] **Step 2: Run to verify it fails**

```bash
npx tsx lib/domain.test.ts
```
Expected: FAIL — cannot find module `./domain`.

- [ ] **Step 3: Implement `lib/domain.ts`**

```ts
export function normalizeDomain(rawUrl: string): string | null {
  if (!rawUrl || typeof rawUrl !== 'string') return null
  try {
    const withScheme = /^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`
    const host = new URL(withScheme).hostname
    if (!host || !host.includes('.')) return null
    return host.replace(/^www\./i, '').toLowerCase()
  } catch {
    return null
  }
}

export function companyNameFromDomain(domain: string): string {
  const label = domain.split('.')[0] ?? domain
  return label
    .split(/[-_]/)
    .filter(Boolean)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}
```

- [ ] **Step 4: Add types to `lib/types.ts`**

Append the `TeaserResult` and `GateMeta` interfaces shown in **Interfaces** above to `lib/types.ts`.

- [ ] **Step 5: Run test to verify it passes**

```bash
npx tsx lib/domain.test.ts
```
Expected: `domain: passed`.

- [ ] **Step 6: Commit**

```bash
git add lib/domain.ts lib/domain.test.ts lib/types.ts
git commit -m "feat(lead-hook): domain normalization + teaser/gate types"
```

---

## Task 2: Orchestrator split — `runTeaser` + `runFullReport` (drop RAG)

**Files:**
- Modify: `lib/hivemind.ts`
- Test: `lib/hivemind.test.ts`

**Interfaces:**
- Consumes: `normalizeDomain`, `companyNameFromDomain` (Task 1); `buildMockReport`, `mockFrameworks` (existing); `TeaserResult` (Task 1).
- Produces:
  ```ts
  export async function runTeaser(input: AutopsyInput): Promise<TeaserResult>
  export async function runFullReport(input: AutopsyInput, teaser: TeaserResult): Promise<AutopsyReport>
  export function inputFromUrl(url: string, xHandle?: string): AutopsyInput | null
  ```
  Consumed by Tasks 3, 5, 6.

- [ ] **Step 1: Write the failing test (mock-mode behavior, no creds)**

Create `lib/hivemind.test.ts`:
```ts
import assert from 'node:assert'
import {runTeaser, runFullReport, inputFromUrl} from './hivemind'

async function main() {
  const input = inputFromUrl('https://vaultline.xyz', 'vaultline')
  assert.ok(input, 'derives input from url')
  assert.equal(input!.companyName, 'Vaultline')

  // No HIVEMIND_API_KEY in test env → deterministic mock.
  const teaser = await runTeaser(input!)
  assert.equal(typeof teaser.overallScore, 'number')
  assert.equal(teaser.whatsBroken.length >= 1, true)
  assert.ok(teaser.verdict)

  const full = await runFullReport(input!, teaser)
  assert.equal(full.overallScore, teaser.overallScore, 'full report keeps teaser score')
  assert.equal(full.ghostwriter.xPosts.length >= 1, true)
  assert.ok(full.beforeAfter.homepageHeroAfter)
  console.log('hivemind split: passed')
}
main().catch(e => { console.error(e); process.exit(1) })
```

- [ ] **Step 2: Run to verify it fails**

```bash
npx tsx lib/hivemind.test.ts
```
Expected: FAIL — `runTeaser`/`inputFromUrl` not exported.

- [ ] **Step 3: Implement the split in `lib/hivemind.ts`**

Add (keep `hivemindFetch`, `chat`, `safeJsonParse`, `hasHivemindCredentials`; you may delete `knowledgeSearch` and the old `runAutopsy` RAG step or leave `runAutopsy` untouched for the out-of-scope "all-frameworks" mode — do NOT call it from the lead-hook path):

```ts
import {normalizeDomain, companyNameFromDomain} from './domain'
import type {TeaserResult} from './types'

export function inputFromUrl(url: string, xHandle?: string): AutopsyInput | null {
  const domain = normalizeDomain(url)
  if (!domain) return null
  return {
    companyName: companyNameFromDomain(domain),
    websiteUrl: /^https?:\/\//i.test(url) ? url : `https://${url}`,
    twitterHandle: xHandle?.replace(/^@/, '') || undefined,
    category: 'other', // server-side; the architect prompt infers the real category
  }
}

// Teaser: single gtm-architect call. Mock fallback on any failure / no creds.
export async function runTeaser(input: AutopsyInput): Promise<TeaserResult> {
  const mock = buildMockReport(input)
  const frameworks = mockFrameworks(input)
  const baseTrace = {
    personasUsed: ['gtm-architect'] as Persona[],
    frameworks,
    steps: [],
    mode: 'mock' as const,
  }
  if (!hasHivemindCredentials()) {
    return {
      input, overallScore: mock.overallScore, verdict: mock.verdict,
      scorecard: mock.scorecard, whatsBroken: mock.whatsBroken,
      trace: baseTrace, generatedAt: new Date().toISOString(),
    }
  }
  try {
    const out = await chat(gtmArchitectPrompt(input, frameworks), 'gtm-architect')
    const arch = safeJsonParse<{
      verdict: string; scorecard: ScoreCard; whatsBroken: string[]
    }>(out.response)
    if (!arch?.scorecard) throw new Error('non-json')
    const s = arch.scorecard
    const overallScore = Math.round(
      (s.narrativeClarity + s.icpSharpness + s.proofCredibility +
        s.categoryDifferentiation + s.distributionLeverage) / 5,
    )
    return {
      input, overallScore, verdict: arch.verdict ?? mock.verdict, scorecard: s,
      whatsBroken: arch.whatsBroken?.length ? arch.whatsBroken : mock.whatsBroken,
      trace: {...baseTrace, mode: 'live'}, generatedAt: new Date().toISOString(),
    }
  } catch {
    return {
      input, overallScore: mock.overallScore, verdict: mock.verdict,
      scorecard: mock.scorecard, whatsBroken: mock.whatsBroken,
      trace: baseTrace, generatedAt: new Date().toISOString(),
    }
  }
}

// Full: ONE combined strategist+ghostwriter call. Merges onto the teaser.
function fullReportPrompt(input: AutopsyInput, teaser: TeaserResult): string {
  return [
    `You are the Genius Strategist AND the Ghostwriter for ${input.companyName} (${input.websiteUrl}).`,
    `Teaser diagnosis: verdict="${teaser.verdict}"; whatsBroken=${JSON.stringify(teaser.whatsBroken)}.`,
    `Return STRICT JSON:`,
    `{`,
    `  "positioningBefore": "1 line", "positioningAfter": "1-2 lines ending with the wedge",`,
    `  "homepageHeroBefore": "weak generic (1 line)", "homepageHeroAfter": "sharp H1 (1-2 lines)",`,
    `  "xPosts": ["...", ...5], "linkedinPost": "100-180 words", "coldDm": "3-5 sentences",`,
    `  "growthExperiments": [{"name":"...","hypothesis":"if/then","effort":"Low|Medium|High + note","metric":"..."}, ...3]`,
    `}`,
    `Voice: clipped, no hashtags, no emojis. Strong opinions.`,
  ].join('\n')
}

export async function runFullReport(input: AutopsyInput, teaser: TeaserResult): Promise<AutopsyReport> {
  const mock = buildMockReport(input)
  let out: { positioningBefore: string; positioningAfter: string; homepageHeroBefore: string;
    homepageHeroAfter: string; xPosts: string[]; linkedinPost: string; coldDm: string;
    growthExperiments: AutopsyReport['growthExperiments'] } | null = null
  if (hasHivemindCredentials()) {
    try {
      const res = await chat(fullReportPrompt(input, teaser), 'genius-strategist')
      out = safeJsonParse(res.response)
    } catch { out = null }
  }
  return {
    input,
    overallScore: teaser.overallScore,
    verdict: teaser.verdict,
    scorecard: teaser.scorecard,
    whatsBroken: teaser.whatsBroken,
    fixesPrioritized: mock.fixesPrioritized,
    beforeAfter: {
      homepageHeroBefore: out?.homepageHeroBefore ?? mock.beforeAfter.homepageHeroBefore,
      homepageHeroAfter: out?.homepageHeroAfter ?? mock.beforeAfter.homepageHeroAfter,
      positioningBefore: out?.positioningBefore ?? mock.beforeAfter.positioningBefore,
      positioningAfter: out?.positioningAfter ?? mock.beforeAfter.positioningAfter,
    },
    ghostwriter: {
      xPosts: out?.xPosts?.length ? out.xPosts : mock.ghostwriter.xPosts,
      linkedinPost: out?.linkedinPost ?? mock.ghostwriter.linkedinPost,
      coldDm: out?.coldDm ?? mock.ghostwriter.coldDm,
    },
    growthExperiments: out?.growthExperiments?.length ? out.growthExperiments : mock.growthExperiments,
    trace: {
      personasUsed: ['gtm-architect', 'genius-strategist', 'ghostwriter'],
      frameworks: teaser.trace.frameworks,
      steps: teaser.trace.steps,
      mode: hasHivemindCredentials() && out ? 'live' : 'mock',
    },
    generatedAt: new Date().toISOString(),
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx tsx lib/hivemind.test.ts
```
Expected: `hivemind split: passed`.

- [ ] **Step 5: type-check + commit**

```bash
npx tsc --noEmit && git add lib/hivemind.ts lib/hivemind.test.ts && git commit -m "feat(lead-hook): collapse orchestrator to 2 calls (teaser + full), drop RAG"
```

---

## Task 3: Abuse libs + `/api/autopsy/teaser` route

**Files:**
- Create: `lib/redis.ts`, `lib/ratelimit.ts`, `lib/cache.ts`
- Create: `app/api/autopsy/teaser/route.ts`
- Test: `lib/cache.test.ts`

**Interfaces:**
- Produces:
  ```ts
  // lib/redis.ts
  export const redis: import('@upstash/redis').Redis | null   // null when env unset
  // lib/ratelimit.ts
  export async function checkIpLimit(ip: string): Promise<{ ok: boolean }>   // always ok when redis null
  // lib/cache.ts
  export async function getCachedTeaser(domain: string): Promise<TeaserResult | null>
  export async function setCachedTeaser(domain: string, t: TeaserResult): Promise<void>
  ```

- [ ] **Step 1: Install deps**

```bash
npm install @upstash/redis @upstash/ratelimit
```

- [ ] **Step 2: Write the failing test (cache no-ops without redis)**

Create `lib/cache.test.ts`:
```ts
import assert from 'node:assert'
import {getCachedTeaser, setCachedTeaser} from './cache'

async function main() {
  // No UPSTASH env in test → must no-op, never throw.
  await setCachedTeaser('acme.com', {} as never)
  const v = await getCachedTeaser('acme.com')
  assert.equal(v, null, 'returns null with no redis configured')
  console.log('cache: passed')
}
main().catch(e => { console.error(e); process.exit(1) })
```

- [ ] **Step 3: Run to verify it fails**

```bash
npx tsx lib/cache.test.ts
```
Expected: FAIL — module not found.

- [ ] **Step 4: Implement the three libs**

`lib/redis.ts`:
```ts
import {Redis} from '@upstash/redis'

export const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
    : null
```

`lib/ratelimit.ts`:
```ts
import {Ratelimit} from '@upstash/ratelimit'
import {redis} from './redis'

const hourly = redis
  ? new Ratelimit({redis, limiter: Ratelimit.slidingWindow(5, '1 h'), prefix: 'gtm:ip:h'})
  : null
const daily = redis
  ? new Ratelimit({redis, limiter: Ratelimit.slidingWindow(20, '1 d'), prefix: 'gtm:ip:d'})
  : null

export async function checkIpLimit(ip: string): Promise<{ok: boolean}> {
  if (!hourly || !daily) return {ok: true}
  const [h, d] = await Promise.all([hourly.limit(ip), daily.limit(ip)])
  return {ok: h.success && d.success}
}
```

`lib/cache.ts`:
```ts
import {redis} from './redis'
import type {TeaserResult} from './types'

const TTL_SECONDS = 7 * 24 * 60 * 60

export async function getCachedTeaser(domain: string): Promise<TeaserResult | null> {
  if (!redis) return null
  try {
    return (await redis.get<TeaserResult>(`gtm:teaser:${domain}`)) ?? null
  } catch {
    return null
  }
}

export async function setCachedTeaser(domain: string, t: TeaserResult): Promise<void> {
  if (!redis) return
  try {
    await redis.set(`gtm:teaser:${domain}`, t, {ex: TTL_SECONDS})
  } catch {
    /* cache is best-effort */
  }
}
```

- [ ] **Step 5: Run test to verify it passes**

```bash
npx tsx lib/cache.test.ts
```
Expected: `cache: passed`.

- [ ] **Step 6: Write the teaser route**

Create `app/api/autopsy/teaser/route.ts`:
```ts
import {NextResponse} from 'next/server'
import {runTeaser, inputFromUrl} from '@/lib/hivemind'
import {normalizeDomain} from '@/lib/domain'
import {checkIpLimit} from '@/lib/ratelimit'
import {getCachedTeaser, setCachedTeaser} from '@/lib/cache'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function clientIp(req: Request): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '0.0.0.0'
}

export async function POST(req: Request) {
  let body: {url?: string; xHandle?: string}
  try { body = await req.json() } catch { return NextResponse.json({error: 'invalid_json'}, {status: 400}) }

  const domain = body.url ? normalizeDomain(body.url) : null
  if (!domain) return NextResponse.json({error: 'invalid_url'}, {status: 400})

  const cached = await getCachedTeaser(domain)
  if (cached) return NextResponse.json({teaser: cached, cached: true})

  const {ok} = await checkIpLimit(clientIp(req))
  if (!ok) return NextResponse.json({error: 'rate_limited'}, {status: 429})

  const input = inputFromUrl(body.url!, body.xHandle)
  if (!input) return NextResponse.json({error: 'invalid_url'}, {status: 400})

  const teaser = await runTeaser(input)
  await setCachedTeaser(domain, teaser)
  return NextResponse.json({teaser, cached: false})
}
```

- [ ] **Step 7: type-check + commit**

```bash
npx tsc --noEmit && git add lib/redis.ts lib/ratelimit.ts lib/cache.ts lib/cache.test.ts app/api/autopsy/teaser/route.ts && git commit -m "feat(lead-hook): teaser route with domain cache + per-IP limit"
```

---

## Task 4: Turnstile + disposable-email + `/api/leads` route

**Files:**
- Create: `lib/turnstile.ts`, `lib/disposable-email.ts`, `lib/leads-client.ts`
- Create: `app/api/leads/route.ts`
- Test: `lib/disposable-email.test.ts`

**Interfaces:**
- Consumes: `normalizeDomain` (Task 1).
- Produces:
  ```ts
  export async function verifyTurnstile(token: string | undefined, ip: string): Promise<boolean> // true when secret unset (dev)
  export function isDisposableEmail(email: string): boolean
  export async function postLead(payload: LeadPayload): Promise<{ lead_id: string } | null> // null when HIVEMIND creds unset
  ```

- [ ] **Step 1: Write the failing test**

Create `lib/disposable-email.test.ts`:
```ts
import assert from 'node:assert'
import {isDisposableEmail} from './disposable-email'
assert.equal(isDisposableEmail('a@mailinator.com'), true)
assert.equal(isDisposableEmail('a@gmail.com'), false)
assert.equal(isDisposableEmail('founder@acme.io'), false)
console.log('disposable: passed')
```

- [ ] **Step 2: Run to verify it fails**

```bash
npx tsx lib/disposable-email.test.ts
```
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the three libs**

`lib/disposable-email.ts`:
```ts
const DISPOSABLE = new Set([
  'mailinator.com', 'guerrillamail.com', '10minutemail.com', 'tempmail.com',
  'temp-mail.org', 'throwaway.email', 'yopmail.com', 'trashmail.com',
  'getnada.com', 'sharklasers.com', 'maildrop.cc', 'fakeinbox.com',
])
export function isDisposableEmail(email: string): boolean {
  const domain = email.split('@')[1]?.toLowerCase().trim()
  return domain ? DISPOSABLE.has(domain) : true
}
```

`lib/turnstile.ts`:
```ts
export async function verifyTurnstile(token: string | undefined, ip: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY
  if (!secret) return true // dev / not configured → don't block
  if (!token) return false
  try {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: {'content-type': 'application/x-www-form-urlencoded'},
      body: new URLSearchParams({secret, response: token, remoteip: ip}),
    })
    const data = (await res.json()) as {success: boolean}
    return data.success === true
  } catch {
    return false
  }
}
```

`lib/leads-client.ts`:
```ts
export interface LeadPayload {
  email: string
  website_url: string
  x_handle?: string | null
  overall_score?: number | null
  verdict?: string | null
  report?: unknown
  utm_source?: string | null
  utm_medium?: string | null
  utm_campaign?: string | null
  referrer?: string | null
  ip_hash?: string | null
}

const BASE_URL =
  process.env.HIVEMIND_API_BASE_URL?.replace(/\/$/, '') || 'https://hivemind.myosin.xyz'

export async function postLead(payload: LeadPayload): Promise<{lead_id: string} | null> {
  const apiKey = process.env.HIVEMIND_API_KEY
  if (!apiKey) return null // dev / mock mode: no capture backend
  const res = await fetch(`${BASE_URL}/api/v1/leads`, {
    method: 'POST',
    headers: {'content-type': 'application/json', 'x-api-key': apiKey},
    body: JSON.stringify(payload),
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`lead_capture_failed: ${res.status}`)
  const data = (await res.json()) as {lead_id: string}
  return {lead_id: data.lead_id}
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx tsx lib/disposable-email.test.ts
```
Expected: `disposable: passed`.

- [ ] **Step 5: Write the `/api/leads` route**

Create `app/api/leads/route.ts`:
```ts
import {NextResponse} from 'next/server'
import {createHash} from 'node:crypto'
import {verifyTurnstile} from '@/lib/turnstile'
import {isDisposableEmail} from '@/lib/disposable-email'
import {postLead} from '@/lib/leads-client'
import type {TeaserResult} from '@/lib/types'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function clientIp(req: Request): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '0.0.0.0'
}
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(req: Request) {
  let body: {
    email?: string; url?: string; xHandle?: string; teaser?: TeaserResult
    turnstileToken?: string; utm?: Record<string, string>; referrer?: string
  }
  try { body = await req.json() } catch { return NextResponse.json({error: 'invalid_json'}, {status: 400}) }

  const email = body.email?.trim().toLowerCase() ?? ''
  if (!EMAIL_RE.test(email)) return NextResponse.json({error: 'invalid_email'}, {status: 400})
  if (isDisposableEmail(email)) return NextResponse.json({error: 'disposable_email'}, {status: 400})
  if (!body.url) return NextResponse.json({error: 'missing_url'}, {status: 400})

  const ip = clientIp(req)
  const human = await verifyTurnstile(body.turnstileToken, ip)
  if (!human) return NextResponse.json({error: 'turnstile_failed'}, {status: 403})

  const ip_hash = createHash('sha256').update(`${ip}:gtm-autopsy`).digest('hex')

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
    })
    // result is null in dev (no Hivemind key) — still report success so the gate opens.
    return NextResponse.json({success: true, lead_id: result?.lead_id ?? null})
  } catch (e) {
    return NextResponse.json({error: 'capture_failed', detail: String(e).slice(0, 160)}, {status: 502})
  }
}
```

- [ ] **Step 6: type-check + commit**

```bash
npx tsc --noEmit && git add lib/turnstile.ts lib/disposable-email.ts lib/disposable-email.test.ts lib/leads-client.ts app/api/leads/route.ts && git commit -m "feat(lead-hook): /api/leads with Turnstile + disposable block + hive-mind capture"
```

---

## Task 5: `/api/autopsy/full` route

**Files:**
- Create: `app/api/autopsy/full/route.ts`

**Interfaces:**
- Consumes: `runFullReport`, `inputFromUrl` (Task 2); `TeaserResult` (Task 1).

- [ ] **Step 1: Write the route**

Create `app/api/autopsy/full/route.ts`:
```ts
import {NextResponse} from 'next/server'
import {runFullReport, inputFromUrl} from '@/lib/hivemind'
import type {TeaserResult} from '@/lib/types'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(req: Request) {
  let body: {url?: string; xHandle?: string; teaser?: TeaserResult}
  try { body = await req.json() } catch { return NextResponse.json({error: 'invalid_json'}, {status: 400}) }
  if (!body.url || !body.teaser) return NextResponse.json({error: 'missing_fields'}, {status: 400})

  const input = inputFromUrl(body.url, body.xHandle)
  if (!input) return NextResponse.json({error: 'invalid_url'}, {status: 400})

  const report = await runFullReport(input, body.teaser)
  return NextResponse.json({report})
}
```

- [ ] **Step 2: Smoke-test in dev (mock mode)**

```bash
npm run dev   # in another shell
curl -s localhost:3030/api/autopsy/teaser -H 'content-type: application/json' -d '{"url":"vaultline.xyz"}' | head -c 300
```
Then feed the returned teaser to `/api/autopsy/full`. Expected: both return JSON with `report`/`teaser`, no 500s.

- [ ] **Step 3: Commit**

```bash
git add app/api/autopsy/full/route.ts && git commit -m "feat(lead-hook): /api/autopsy/full route"
```

---

## Task 6: PostHog analytics wrapper

**Files:**
- Create: `lib/analytics.ts`

**Interfaces:**
- Produces:
  ```ts
  export function initAnalytics(): void           // no-op when NEXT_PUBLIC_POSTHOG_KEY unset
  export function track(event: 'gtm_autopsy_started' | 'gtm_autopsy_teaser_viewed' | 'gtm_autopsy_email_captured', props?: Record<string, unknown>): void
  ```

- [ ] **Step 1: Install dep**

```bash
npm install posthog-js
```

- [ ] **Step 2: Implement `lib/analytics.ts`**

```ts
'use client'
import posthog from 'posthog-js'

let ready = false
export function initAnalytics(): void {
  if (ready || typeof window === 'undefined') return
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY
  if (!key) return
  posthog.init(key, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
    capture_pageview: false,
    persistence: 'memory', // sandboxed cross-origin iframe — don't rely on cookies
  })
  ready = true
}

export function track(
  event: 'gtm_autopsy_started' | 'gtm_autopsy_teaser_viewed' | 'gtm_autopsy_email_captured',
  props?: Record<string, unknown>,
): void {
  if (!ready) return
  posthog.capture(event, props)
}
```

- [ ] **Step 3: type-check + commit**

```bash
npx tsc --noEmit && git add lib/analytics.ts && git commit -m "feat(lead-hook): PostHog analytics wrapper (no-op without key)"
```

---

## Task 7: Widget UX — single-URL input, blur/lock, email gate, unlock

**Files:**
- Modify: `components/WidgetApp.tsx`

**Interfaces:**
- Consumes: `TeaserResult`, `AutopsyReport` (types); routes `/api/autopsy/teaser`, `/api/leads`, `/api/autopsy/full`; `initAnalytics`, `track` (Task 6).

This task rewrites the widget's state machine and form. It is UI-heavy; split into the steps below and verify each in `npm run dev`.

- [ ] **Step 1: Replace the `Phase` machine + state**

In `components/WidgetApp.tsx`, change the phase union and state:
```ts
type Phase = 'idle' | 'loadingTeaser' | 'teaser' | 'gate' | 'loadingFull' | 'full'
```
Replace the six input fields with a single URL field + optional X handle:
```ts
const [url, setUrl] = useState('')
const [xHandle, setXHandle] = useState('')
const [email, setEmail] = useState('')
const [teaser, setTeaser] = useState<TeaserResult | null>(null)
const [report, setReport] = useState<AutopsyReport | null>(null)
const [turnstileToken, setTurnstileToken] = useState<string | undefined>(undefined)
```
Call `initAnalytics()` in a `useEffect(() => { initAnalytics() }, [])`.

- [ ] **Step 2: Submit URL → teaser**

Replace `submit` with:
```ts
async function submitUrl(e: React.FormEvent) {
  e.preventDefault()
  if (!url.trim()) return
  setError(null); setPhase('loadingTeaser'); track('gtm_autopsy_started', {url})
  try {
    const res = await fetch('/api/autopsy/teaser', {
      method: 'POST', headers: {'content-type': 'application/json'},
      body: JSON.stringify({url: url.trim(), xHandle: xHandle.trim() || undefined}),
    })
    const data = await res.json()
    if (!res.ok || !data.teaser) { setError(data.error ?? 'teaser_failed'); setPhase('idle'); return }
    setTeaser(data.teaser); setPhase('teaser'); track('gtm_autopsy_teaser_viewed', {url})
  } catch (err) { setError(String(err)); setPhase('idle') }
}
```

- [ ] **Step 3: Email gate → capture → full**

```ts
async function submitEmail(e: React.FormEvent) {
  e.preventDefault()
  if (!email.trim() || !teaser) return
  setError(null); setPhase('loadingFull')
  try {
    const cap = await fetch('/api/leads', {
      method: 'POST', headers: {'content-type': 'application/json'},
      body: JSON.stringify({
        email: email.trim(), url: url.trim(), xHandle: xHandle.trim() || undefined,
        teaser, turnstileToken, referrer: document.referrer || undefined,
        utm: Object.fromEntries(new URLSearchParams(window.location.search)),
      }),
    })
    const capData = await cap.json()
    if (!cap.ok) { setError(capData.error ?? 'capture_failed'); setPhase('gate'); return }
    track('gtm_autopsy_email_captured', {url})
    const full = await fetch('/api/autopsy/full', {
      method: 'POST', headers: {'content-type': 'application/json'},
      body: JSON.stringify({url: url.trim(), xHandle: xHandle.trim() || undefined, teaser}),
    })
    const fullData = await full.json()
    if (!full.ok || !fullData.report) { setError(fullData.error ?? 'full_failed'); setPhase('gate'); return }
    setReport(fullData.report); setPhase('full')
  } catch (err) { setError(String(err)); setPhase('gate') }
}
```

- [ ] **Step 4: Rewrite `IdleScreen` to a single URL field**

Replace the four-field grid in `IdleScreen` with one required URL input (+ optional X handle), keeping existing `myo-*` classes and the samples row. Samples become URLs: `vaultline.xyz`, `agentframe.ai`, `mergewell.dev`. The submit button calls `submitUrl`.

- [ ] **Step 5: `TeaserScreen` — show free sections + blurred locked report + gate**

Add a `TeaserScreen` that renders, from `teaser`: the score card, verdict, 5 "what's broken" bullets, and the Hivemind Trace chips (static). Below it, render a locked preview block: the hero/positioning/posts/experiments area wrapped in a `div` with `style={{ filter: 'blur(7px)', pointerEvents: 'none', userSelect: 'none' }}` and an overlay card with the email input + (optional) Turnstile widget + "Unlock the full teardown →" button calling `submitEmail`. Use placeholder lorem for the blurred content (do NOT fetch the real full report before capture).

- [ ] **Step 6: Turnstile widget (client)**

If `process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY` is set, render the Cloudflare script + widget in the gate and set `turnstileToken` via its callback. When unset, render nothing and leave `turnstileToken` undefined (server treats unset secret as pass). Minimal injection:
```tsx
{process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && (
  <>
    <script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer />
    <div
      className="cf-turnstile"
      data-sitekey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY}
      ref={el => {
        if (el && (window as any).turnstile) {
          (window as any).turnstile.render(el, {callback: (t: string) => setTurnstileToken(t)})
        }
      }}
    />
  </>
)}
```

- [ ] **Step 7: `FullScreen` — unlocked report + CTA**

Reuse the existing `ReportScreen` rendering for the unlocked state, now fed the real `report` from state, keeping the bottom "Hire Hivemind" CTA.

- [ ] **Step 8: Verify the full flow in dev (mock mode)**

```bash
npm run dev
```
In a browser at `http://localhost:3030/widget`: enter `vaultline.xyz` → teaser renders with blurred locked area → enter `you@company.com` → unlock shows the full report. No console errors. (With no creds, everything uses mocks; capture returns `lead_id: null` but the gate still opens.)

- [ ] **Step 9: Commit**

```bash
git add components/WidgetApp.tsx && git commit -m "feat(lead-hook): single-URL input, blur/gate UX, email unlock"
```

---

## Task 8: Env, docs, legacy cleanup

**Files:**
- Modify: `.env.example`
- Modify: `EMBED.md` (note the new env + flow)
- Modify/remove: `app/api/autopsy/route.ts` (legacy single-call route)

- [ ] **Step 1: Update `.env.example`**

```
# Hivemind API (live mode + lead capture). Unset → deterministic mock mode.
# HIVEMIND_API_KEY=hm_k_xxxxxxxxxxxxxxxxxxxxxxxx
# HIVEMIND_API_BASE_URL=https://staging-hivemind.example.com

# Abuse controls (optional; unset → disabled, app still works)
# UPSTASH_REDIS_REST_URL=
# UPSTASH_REDIS_REST_TOKEN=
# TURNSTILE_SECRET_KEY=
# NEXT_PUBLIC_TURNSTILE_SITE_KEY=

# Analytics (optional; unset → no events)
# NEXT_PUBLIC_POSTHOG_KEY=
# NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
```

- [ ] **Step 2: Decide on legacy `/api/autopsy`**

The old `app/api/autopsy/route.ts` calls the 4-call `runAutopsy`. The widget no longer uses it. Either delete it, or keep it behind the out-of-scope "all-frameworks" mode. Recommendation: keep the file but add a top comment `// Legacy full-depth mode; not used by the lead hook.` Do not let Task 7 reference it.

- [ ] **Step 3: Update `EMBED.md`**

Add a short "Lead hook" section: the new flow (teaser → gate → full), the required/optional env vars, and that `/api/v1/leads` (hive-mind, Phase 1) must be live on the configured `HIVEMIND_API_BASE_URL`.

- [ ] **Step 4: Final type-check + lint + commit**

```bash
npx tsc --noEmit && npm run lint && git add .env.example EMBED.md app/api/autopsy/route.ts && git commit -m "docs(lead-hook): env example + embed notes; mark legacy autopsy route"
```

- [ ] **Step 5: Push + open PR**

```bash
git push -u origin feat/gtm-autopsy-lead-hook
gh pr create --title "feat: GTM Autopsy lead hook (teaser → email gate → full)" --body "Phase 2 of the lead hook. 2-call orchestrator, blur/gate UX, abuse controls, PostHog. Depends on hive-mind Phase 1 (POST /api/v1/leads on staging)."
```

---

## Self-Review notes

- Spec coverage: 2-call orchestrator → Task 2; single-field input → Tasks 1,2,7; blur/gate/unlock → Task 7; domain cache + per-IP → Task 3; Turnstile + disposable → Task 4; PostHog → Tasks 6,7; capture via hive-mind endpoint → Task 4. ✅
- Graceful degradation verified per lib: redis/cache/ratelimit (Task 3), turnstile/postLead (Task 4), analytics (Task 6) all no-op without env. ✅
- Type consistency: `TeaserResult` defined in Task 1 and consumed identically in Tasks 2–7; `inputFromUrl`/`runTeaser`/`runFullReport` signatures match across Tasks 2,3,5. ✅
- Open item (carried from design §8): full-report snapshot persistence. v1 stores the **teaser** in `report` at capture (Task 4 sends `report: teaser`). Persisting the post-unlock full report is deferred; if wanted, add a `PATCH /api/v1/leads/:id` in hive-mind as a fast-follow. Documented, not silently dropped.
