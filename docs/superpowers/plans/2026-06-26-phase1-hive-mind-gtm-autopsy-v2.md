# Phase 1 — hive-mind GTM Autopsy v2 backend — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the GTM Autopsy real and product-integrated on the hive-mind side: ground the teaser/teardown in a real HiveScan website scrape, create a thin placeholder-owned project per lead, and on signup transfer that project to the new user and run the expensive onboarding — all behind the existing `x-api-key`.

**Architecture:** New lead-scoped `x-api-key` endpoints (`/api/v1/autopsy/teaser`, `/api/v1/autopsy/lead`) wrap HiveScan's scanner + the GTM personas. Projects are created via the existing `/api/v1/projects` path with a new `skip_enrichment` flag so no expensive enrichment fires at lead time. A claim step, triggered on signup (email match against `gtm_autopsy_leads`), transfers `owner_id` and runs `runOnboardingSideEffects`. Reuses v1's `gtm_autopsy_leads` table, conversion trigger, cache, and `withLeadsAuth`.

**Tech Stack:** Next.js App Router (hive-mind), Supabase Postgres (staging `zxjidctilwncsgwamfgn`), TypeScript, `npx tsx` test scripts.

## Global Constraints

- **All work in a git worktree off the v1 branch** `feat/gtm-autopsy-leads` (v2 depends on v1's `gtm_autopsy_leads` table + `withLeadsAuth` + cache-store, which are on PR #306, not yet merged). New branch: `feat/gtm-autopsy-v2-backend`. PR targets `staging` and notes it stacks on #306. Never commit on hive-mind's other active checkouts.
- **Target DB: staging only** (`zxjidctilwncsgwamfgn`). Apply migrations via the Supabase MCP `apply_migration`.
- Migrations: raw SQL in `scripts/supabase/migrations/`, named `20260626<letter>_*.sql`.
- **Placeholder user = `product@myosin.xyz`** (the user tied to the autopsy `hm_k_cnc` key; api_keys id `1ab5a348`). Its knowledge/chat cap override (=2000) already exists.
- **Thin creation must NOT fire enrichment** — no `enrichProjectFromWebsite`, no social scrape, no intelligence reports until conversion.
- Conventions: single quotes, no semicolons (match `app/api/v1/chat/route.ts`). Run `npm run type-check` before each commit. Service-role client via `createClient()` from `@/lib/supabase`. Reuse `validateApiKey`/`withLeadsAuth`.

---

## Task 0: Worktree off the v1 branch

**Files:** none (git)

- [ ] **Step 1: Create the worktree stacked on v1**

From `/home/mitch/github/hive-mind`:
```bash
git fetch origin
git worktree add -b feat/gtm-autopsy-v2-backend /home/mitch/github/hive-mind-gtm-v2 feat/gtm-autopsy-leads
```
Expected: worktree created from the v1 branch tip (has `gtm_autopsy_leads`, `withLeadsAuth`, cache-store, database.types regen).

- [ ] **Step 2: Bring deps + env (real copies, gitignored)**

```bash
cp -a /home/mitch/github/hive-mind/node_modules /home/mitch/github/hive-mind-gtm-v2/node_modules
cp -a /home/mitch/github/hive-mind/.env.local /home/mitch/github/hive-mind-gtm-v2/.env.local
cd /home/mitch/github/hive-mind-gtm-v2 && git check-ignore node_modules .env.local
```
Expected: both print (ignored). All Phase 1 paths below are relative to `/home/mitch/github/hive-mind-gtm-v2`.

---

## Task 1: Migration — `project_id` column + placeholder overrides

**Files:**
- Create: `scripts/supabase/migrations/20260626a_gtm_autopsy_v2.sql`

**Interfaces:**
- Produces: `gtm_autopsy_leads.project_id uuid` (FK → `project_profiles(id)`); a `project_creation_limits` override row giving the placeholder user a high monthly limit.

- [ ] **Step 1: Get the placeholder user id**

Via Supabase MCP `execute_sql` (project `zxjidctilwncsgwamfgn`):
```sql
select id, email from auth.users where email = 'product@myosin.xyz';
```
Record the uuid as `<PLACEHOLDER_UID>`.

- [ ] **Step 2: Inspect `project_creation_limits` columns**

```sql
select column_name, data_type, is_nullable from information_schema.columns
where table_schema='public' and table_name='project_creation_limits' order by ordinal_position;
```
Note the exact columns (the gate resolves a per-user override via `resolveProjectCreationLimit`; confirm the override shape — `user_id`, `monthly_limit`, and any `entitlement` column that must be NULL for a user-level override).

- [ ] **Step 3: Write the migration**

Create `scripts/supabase/migrations/20260626a_gtm_autopsy_v2.sql` (adjust the override INSERT columns to match Step 2):
```sql
-- GTM Autopsy v2: link leads to their placeholder-owned project.
alter table public.gtm_autopsy_leads
  add column if not exists project_id uuid references public.project_profiles(id) on delete set null;

create index if not exists gtm_autopsy_leads_project_id_idx
  on public.gtm_autopsy_leads (project_id);

-- Placeholder user gets effectively-unlimited project creation so lead volume
-- never trips the 1/month free limit. (user-level override; entitlement NULL.)
insert into public.project_creation_limits (user_id, monthly_limit, entitlement)
values ('<PLACEHOLDER_UID>', 100000, null)
on conflict (user_id) do update set monthly_limit = excluded.monthly_limit;
```
If the unique/conflict target differs from `(user_id)`, adjust `on conflict` to the real constraint from Step 2.

- [ ] **Step 4: Apply to staging**

Use Supabase MCP `apply_migration` (`project_id: zxjidctilwncsgwamfgn`, `name: 20260626a_gtm_autopsy_v2`, the SQL above).
Expected: success.

- [ ] **Step 5: Verify**

```sql
select
  (select count(*) from information_schema.columns
     where table_name='gtm_autopsy_leads' and column_name='project_id') as has_col,
  (select monthly_limit from public.project_creation_limits where user_id='<PLACEHOLDER_UID>') as placeholder_limit;
```
Expected: `has_col=1`, `placeholder_limit=100000`.

- [ ] **Step 6: Commit**

```bash
git add scripts/supabase/migrations/20260626a_gtm_autopsy_v2.sql
git commit -m "feat(gtm-autopsy-v2): leads.project_id + placeholder project-limit override (staging)"
```

---

## Task 2: `skip_enrichment` flag on `POST /api/v1/projects`

**Files:**
- Modify: `lib/validation-schemas/api-schemas.ts` (the `createProjectApiSchema`)
- Modify: `app/api/v1/projects/route.ts` (the `enrichment_status` + the `after()` enrichment block)
- Test: `test/gtm-autopsy-thin-create.test.ts`

**Interfaces:**
- Produces: `createProjectApiSchema` accepts optional `skip_enrichment?: boolean`. When true: `project_profiles.enrichment_status = 'deferred'` and the `after(() => enrichProjectFromWebsite(...))` block does not run. Quota reservation is unchanged.

- [ ] **Step 1: Read the two anchors**

Read `app/api/v1/projects/route.ts` around the `projectData` object (`enrichment_status: 'enriching'`) and the `after(() => enrichProjectFromWebsite({...}))` block (≈ line 279). Read `createProjectApiSchema` in `lib/validation-schemas/api-schemas.ts`.

- [ ] **Step 2: Write the failing test**

Create `test/gtm-autopsy-thin-create.test.ts` (validates the schema accepts the flag; full endpoint behavior is verified in Task 4 e2e):
```ts
import assert from 'node:assert'
import {createProjectApiSchema} from '../lib/validation-schemas/api-schemas'

const ok = createProjectApiSchema.safeParse({
  website_url: 'https://acme.com', project_name: 'Acme', skip_enrichment: true,
})
assert.equal(ok.success, true, 'schema accepts skip_enrichment')
if (ok.success) assert.equal(ok.data.skip_enrichment, true)

const def = createProjectApiSchema.safeParse({website_url: 'https://acme.com', project_name: 'Acme'})
assert.equal(def.success, true)
if (def.success) assert.equal(def.data.skip_enrichment ?? false, false, 'defaults falsy')
console.log('thin-create schema: passed')
```

- [ ] **Step 3: Run to verify it fails**

```bash
node --env-file=.env.local node_modules/.bin/tsx test/gtm-autopsy-thin-create.test.ts
```
Expected: FAIL — `skip_enrichment` stripped/unknown (or assertion fails).

- [ ] **Step 4: Add the field to the schema**

In `lib/validation-schemas/api-schemas.ts`, add to `createProjectApiSchema`'s object shape:
```ts
  skip_enrichment: z.boolean().optional(),
```
(Match the file's existing `z` import + style.)

- [ ] **Step 5: Gate the route on the flag**

In `app/api/v1/projects/route.ts`:
1. In the `projectData` object, replace the hardcoded enrichment status:
```ts
        enrichment_status: validated.skip_enrichment ? 'deferred' : 'enriching',
```
2. Wrap the enrichment `after()` block so it only runs when not skipped:
```ts
      if (!validated.skip_enrichment) {
        after(() =>
          enrichProjectFromWebsite({
            // …existing args unchanged…
          }),
        )
      }
```
Also ensure `skip_enrichment` is not persisted as a column — if `projectData` spreads `...validated`, delete it first: `delete (validated as Record<string, unknown>).skip_enrichment` before building `projectData` (it is not a `project_profiles` column).

- [ ] **Step 6: Run schema test + type-check**

```bash
node --env-file=.env.local node_modules/.bin/tsx test/gtm-autopsy-thin-create.test.ts
npm run type-check
```
Expected: `thin-create schema: passed`; type-check exit 0.

- [ ] **Step 7: Commit**

```bash
git add lib/validation-schemas/api-schemas.ts app/api/v1/projects/route.ts test/gtm-autopsy-thin-create.test.ts
git commit -m "feat(gtm-autopsy-v2): skip_enrichment flag on POST /api/v1/projects (thin create)"
```

---

## Task 3: `POST /api/v1/autopsy/teaser` — scrape + grounded teaser

**Files:**
- Create: `lib/api/v1/autopsy/scan.ts`
- Create: `lib/api/v1/autopsy/teaser.ts`
- Create: `app/api/v1/autopsy/teaser/route.ts`
- Test: `test/gtm-autopsy-teaser.test.ts`

**Interfaces:**
- Consumes: `websiteScanner.scanWebsite(url)` (`@/lib/hivescan/scanner`), `aiWebAnalysis` (`@/lib/hivescan/api/steps/analyze`), `withLeadsAuth` (`@/lib/api/middleware/leads-auth`), cache-store from v1 (`@/lib/api/v1/autopsy/cache-store`).
- Produces:
  ```ts
  // scan.ts
  export interface AutopsyScan { projectName: string; description: string; category: string[]; socialHandles: Record<string,string>; audiences: string[]; channels: string[]; rawText: string }
  export async function scanForAutopsy(url: string): Promise<AutopsyScan>
  // teaser.ts
  export interface AutopsyTeaser { overallScore: number; verdict: string; scorecard: Record<string, number>; whatsBroken: string[] }
  export async function buildTeaser(scan: AutopsyScan): Promise<AutopsyTeaser>
  ```
  Consumed by Task 4.

- [ ] **Step 1: Implement `scan.ts` (wrap HiveScan)**

Create `lib/api/v1/autopsy/scan.ts`:
```ts
import {websiteScanner} from '@/lib/hivescan/scanner'
import {aiWebAnalysis} from '@/lib/hivescan/api/steps/analyze'
import {createRequestLogger} from '@/lib/logging/request-tracking'

export interface AutopsyScan {
  projectName: string
  description: string
  category: string[]
  socialHandles: Record<string, string>
  audiences: string[]
  channels: string[]
  rawText: string
}

export async function scanForAutopsy(url: string): Promise<AutopsyScan> {
  const logger = createRequestLogger('gtm-autopsy-scan')
  const content = await websiteScanner.scanWebsite(url)
  const ai = await aiWebAnalysis(logger, url, content, {}, [], 45000)
  return {
    projectName: ai.projectName ?? '',
    description: ai.description ?? '',
    category: ai.category ?? [],
    socialHandles: (ai.socialLinks as Record<string, string>) ?? {},
    audiences: ai.audiences ?? [],
    channels: ai.channels ?? [],
    rawText: [content.title, content.metaDescription, ...(content.headings ?? []), content.bodyText]
      .filter(Boolean).join('\n').slice(0, 6000),
  }
}
```
NOTE: confirm the exact field names on `aiWebAnalysis`'s return + `websiteScanner.scanWebsite`'s `WebsiteContent` (read `lib/hivescan/api/steps/response.ts` / `scanner.ts`) and adjust the mappings; the shape above follows the Explore map (projectName, description, category, socialLinks, audiences, channels).

- [ ] **Step 2: Implement `teaser.ts` (grounded gtm-architect)**

Create `lib/api/v1/autopsy/teaser.ts`:
```ts
import {chat} from '@/lib/api/v1/chat/...'  // reuse the internal persona-chat helper; see note
import type {AutopsyScan} from './scan'

export interface AutopsyTeaser {
  overallScore: number
  verdict: string
  scorecard: Record<string, number>
  whatsBroken: string[]
}

function architectPrompt(scan: AutopsyScan): string {
  return [
    `You are the GTM Architect. Diagnose this company using ONLY the real site content below.`,
    `Company: ${scan.projectName} — ${scan.description}`,
    `Category: ${scan.category.join(', ')}`,
    `Site content:\n"""${scan.rawText}"""`,
    `Return STRICT JSON: { "verdict": "1 brutal sentence grounded in the content above",`,
    `  "scorecard": {"narrativeClarity":0-100,"icpSharpness":0-100,"proofCredibility":0-100,"categoryDifferentiation":0-100,"distributionLeverage":0-100},`,
    `  "whatsBroken": ["5 specific bullets that quote/cite the real content"] }`,
    `Be specific to THIS site. No generic GTM platitudes.`,
  ].join('\n')
}

export async function buildTeaser(scan: AutopsyScan): Promise<AutopsyTeaser> {
  const raw = await chat(architectPrompt(scan), 'gtm-architect') // returns model text
  const parsed = JSON.parse(extractJson(raw)) as Omit<AutopsyTeaser, 'overallScore'>
  const s = parsed.scorecard
  const overallScore = Math.round(
    (s.narrativeClarity + s.icpSharpness + s.proofCredibility + s.categoryDifferentiation + s.distributionLeverage) / 5,
  )
  return {overallScore, verdict: parsed.verdict, scorecard: s, whatsBroken: parsed.whatsBroken}
}

function extractJson(text: string): string {
  const m = text.match(/```json\s*([\s\S]*?)```/) || text.match(/```\s*([\s\S]*?)```/)
  if (m) return m[1]
  const a = text.indexOf('{'); const b = text.lastIndexOf('}')
  return a >= 0 && b > a ? text.slice(a, b + 1) : text
}
```
NOTE: pick the internal persona-chat entry point used server-side (the function `/api/v1/chat` calls to run a persona — read `app/api/v1/chat/route.ts` to find the internal generator; reuse it rather than HTTP-calling our own endpoint). Wire `chat()` to it.

- [ ] **Step 3: Write the route**

Create `app/api/v1/autopsy/teaser/route.ts`:
```ts
import {NextRequest, NextResponse} from 'next/server'
import {withLeadsAuth} from '@/lib/api/middleware/leads-auth'
import {getCorsHeaders} from '@/lib/api/utils/cors'
import {normalizeDomain} from '@/lib/api/v1/leads/validate-lead'
import {getCachedTeaser, setCachedTeaser, rateCheck} from '@/lib/api/v1/autopsy/cache-store'
import {scanForAutopsy} from '@/lib/api/v1/autopsy/scan'
import {buildTeaser} from '@/lib/api/v1/autopsy/teaser'

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {status: 204, headers: {
    ...getCorsHeaders(request),
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, x-api-key',
  }})
}

export async function POST(request: NextRequest) {
  const cors = getCorsHeaders(request)
  return withLeadsAuth(request, async (_key, req) => {
    let body: {url?: string; ip_hash?: string}
    try { body = await req.json() } catch { return NextResponse.json({error: 'invalid_json'}, {status: 400, headers: cors}) }
    const domain = body.url ? normalizeDomain(body.url) : null
    if (!domain) return NextResponse.json({error: 'invalid_url'}, {status: 400, headers: cors})

    const cached = await getCachedTeaser(domain)
    if (cached) return NextResponse.json({teaser: cached, cached: true}, {headers: cors})

    if (!(await rateCheck(body.ip_hash || '0.0.0.0'))) {
      return NextResponse.json({error: 'rate_limited'}, {status: 429, headers: cors})
    }
    try {
      const scan = await scanForAutopsy(body.url!)
      const teaser = await buildTeaser(scan)
      const payload = {...teaser, scan}
      await setCachedTeaser(domain, payload as never)
      return NextResponse.json({teaser: payload, cached: false}, {headers: cors})
    } catch (e) {
      return NextResponse.json({error: 'scan_failed', detail: String(e).slice(0, 200)}, {status: 502, headers: cors})
    }
  })
}
```

- [ ] **Step 4: Integration test (staging, real scrape + LLM)**

Create `test/gtm-autopsy-teaser.test.ts`:
```ts
import assert from 'node:assert'
import {scanForAutopsy} from '../lib/api/v1/autopsy/scan'
import {buildTeaser} from '../lib/api/v1/autopsy/teaser'

async function main() {
  const scan = await scanForAutopsy('https://stripe.com')
  assert.ok(scan.rawText.length > 200, 'scrape returns real content')
  const teaser = await buildTeaser(scan)
  assert.equal(typeof teaser.overallScore, 'number')
  assert.equal(teaser.whatsBroken.length >= 3, true)
  // grounding smoke check: verdict should not be empty and should reference the company
  assert.ok(teaser.verdict.length > 10)
  console.log('teaser grounded:', teaser.overallScore, teaser.verdict.slice(0, 80))
}
main().catch(e => { console.error(e); process.exit(1) })
```

- [ ] **Step 5: Run it**

```bash
node --env-file=.env.local node_modules/.bin/tsx test/gtm-autopsy-teaser.test.ts
```
Expected: prints a grounded score + verdict that references the scraped site (manually eyeball that it's specific, not generic).

- [ ] **Step 6: type-check + commit**

```bash
npm run type-check
git add lib/api/v1/autopsy/scan.ts lib/api/v1/autopsy/teaser.ts app/api/v1/autopsy/teaser/route.ts test/gtm-autopsy-teaser.test.ts
git commit -m "feat(gtm-autopsy-v2): scrape-grounded teaser endpoint"
```

---

## Task 4: `POST /api/v1/autopsy/lead` — thin project + full teardown

**Files:**
- Create: `lib/api/v1/autopsy/full-report.ts`
- Create: `lib/api/v1/autopsy/create-thin-project.ts`
- Create: `app/api/v1/autopsy/lead/route.ts`
- Test: `test/gtm-autopsy-lead.test.ts`

**Interfaces:**
- Consumes: `AutopsyScan`, `AutopsyTeaser` (Task 3); `validateLead`/`isDisposableEmail` (v1); `withLeadsAuth`; `insertLead`/the leads table; `getKeyUserId` (`@/lib/api/utils/key-user`).
- Produces:
  ```ts
  export async function buildFullReport(scan: AutopsyScan, teaser: AutopsyTeaser): Promise<FullReport>
  export async function createThinProject(opts: { keyId: string; scan: AutopsyScan; report: FullReport }): Promise<{ project_id: string }>
  ```

- [ ] **Step 1: Implement `full-report.ts`** (combined strategist+ghostwriter, grounded — mirror `teaser.ts`'s persona-chat + JSON-extract pattern; prompt includes `scan.rawText`). Returns `{ positioningBefore, positioningAfter, homepageHeroBefore, homepageHeroAfter, xPosts[5], linkedinPost, coldDm, growthExperiments[3] }`. (Full code mirrors Task 3 Step 2's structure with the v1 `fullReportPrompt` fields, grounded in `scan`.)

- [ ] **Step 2: Implement `create-thin-project.ts`** — resolve the placeholder user via `getKeyUserId(keyId)`, then **service-role insert** a `project_profiles` row (`status='active'`, `enrichment_status='deferred'`, `user_id=<placeholder>`, seeded from `scan`, `context_report = report`). Use the service-role client directly (not the HTTP endpoint) to avoid a self-call; this is the same effect as `/api/v1/projects` with `skip_enrichment` but in-process. Returns `{ project_id }`.

```ts
import {createClient} from '@/lib/supabase'
import {getKeyUserId} from '@/lib/api/utils/key-user'
import type {AutopsyScan} from './scan'
import type {FullReport} from './full-report'

export async function createThinProject(opts: {keyId: string; scan: AutopsyScan; report: FullReport}): Promise<{project_id: string}> {
  const supabase = createClient()
  const userId = await getKeyUserId(opts.keyId)
  if (!userId) throw new Error('no_key_user')
  const {data, error} = await supabase.from('project_profiles').insert({
    user_id: userId,
    status: 'active',
    enrichment_status: 'deferred',
    project_name: opts.scan.projectName || null,
    description: opts.scan.description || null,
    project_type: opts.scan.category,
    audiences: opts.scan.audiences,
    channels: opts.scan.channels,
    social_handles: opts.scan.socialHandles,
    context_report: opts.report as unknown as Record<string, unknown>,
    created_via_api_key_id: opts.keyId,
  }).select('id').single()
  if (error || !data) throw new Error(`thin_project_failed: ${error?.message ?? 'no row'}`)
  return {project_id: data.id as string}
}
```
NOTE: this direct insert bypasses `reserveProjectCreation` entirely, so it never counts against quota (placeholder or future owner) — preferred over the gated path. The Task 2 flag remains useful for any future HTTP-driven thin creation, but the lead endpoint uses this in-process insert.

- [ ] **Step 3: Write the route** `app/api/v1/autopsy/lead/route.ts` (x-api-key via `withLeadsAuth`): validate email (`validateLead` shape + `isDisposableEmail` + Turnstile if token present), require `scan` + `teaser` in the body (the widget passes back what `/teaser` returned), `buildFullReport`, `createThinProject`, then insert/extend the `gtm_autopsy_leads` row (reuse v1 `insertLead`, extended to accept `project_id`). Return `{ lead_id, project_id, report }`.

- [ ] **Step 4: Extend v1 `insertLead`** (`lib/api/v1/leads/insert-lead.ts`) to accept + persist `project_id` (add to `LeadInput`/the insert row). Keep the capture-time conversion check.

- [ ] **Step 5: Integration test** `test/gtm-autopsy-lead.test.ts` (staging): call the in-process pieces with a real scan → `buildFullReport` returns 5 xPosts; `createThinProject` returns a `project_id` owned by the placeholder with `enrichment_status='deferred'`; lead row has `project_id`. Clean up the created project + lead row at the end.

- [ ] **Step 6: type-check + commit**

```bash
npm run type-check
git add lib/api/v1/autopsy/full-report.ts lib/api/v1/autopsy/create-thin-project.ts app/api/v1/autopsy/lead/route.ts lib/api/v1/leads/insert-lead.ts test/gtm-autopsy-lead.test.ts
git commit -m "feat(gtm-autopsy-v2): lead endpoint — thin placeholder project + grounded full teardown"
```

---

## Task 5: Conversion claim — transfer ownership + deferred enrichment

**Files:**
- Create: `lib/projects/claim-autopsy-project.ts`
- Modify: the onboarding seam that creates a new user's first project (located in Step 1)
- Test: `test/gtm-autopsy-claim.test.ts`

**Interfaces:**
- Consumes: `runOnboardingSideEffects({savedProjectId, projectData, logger})`; `createClient`.
- Produces: `claimAutopsyProject(userId: string, email: string): Promise<{ claimed: boolean; project_id?: string }>` — idempotent; transfers `owner_id`, runs enrichment, marks the lead converted.

- [ ] **Step 1: Locate the seam (discovery, output a file:line)**

The spec's one open item. Trace where a brand-new signed-up user's first project is created. Read `app/api/onboarding/**`, `app/auth/signup/page.tsx`'s submit path, and any post-signup redirect/onboarding action. Decide the hook point: the claim must run **after** the auth user exists and **before/instead of** creating a fresh first project. Record the exact file:line in the task notes. (Candidates from discovery: the onboarding entry the welcome flow calls; `app/api/onboarding/*`.)

- [ ] **Step 2: Implement `claim-autopsy-project.ts`**
```ts
import {createClient} from '@/lib/supabase'
import {runOnboardingSideEffects} from '@/lib/projects/onboarding-side-effects'
import {createRequestLogger} from '@/lib/logging/request-tracking'

export async function claimAutopsyProject(userId: string, email: string): Promise<{claimed: boolean; project_id?: string}> {
  const supabase = createClient()
  // Idempotent: only claim a lead that has a project and isn't converted yet.
  const {data: lead} = await supabase
    .from('gtm_autopsy_leads')
    .select('id, project_id')
    .eq('converted_user_id', userId)        // FK already set by the signup trigger
    .not('project_id', 'is', null)
    .neq('status', 'claimed')
    .order('created_at', {ascending: false})
    .limit(1).maybeSingle()
  if (!lead?.project_id) return {claimed: false}

  // Transfer ownership (not quota-gated → no charge to the new user).
  const {data: proj, error} = await supabase
    .from('project_profiles')
    .update({user_id: userId, enrichment_status: 'enriching'})
    .eq('id', lead.project_id)
    .select('*').single()
  if (error || !proj) return {claimed: false}

  await supabase.from('gtm_autopsy_leads').update({status: 'claimed'}).eq('id', lead.id)

  // Now run the EXPENSIVE onboarding for the real owner.
  await runOnboardingSideEffects({
    savedProjectId: proj.id,
    projectData: proj,
    logger: createRequestLogger('gtm-autopsy-claim'),
  })
  return {claimed: true, project_id: proj.id}
}
```
NOTE: the signup AFTER INSERT trigger (v1) sets `converted_user_id` on email match before this runs; if ordering can race, also match by `lower(email)` as a fallback. Confirm the trigger fires before the seam executes.

- [ ] **Step 3: Hook it at the seam** (from Step 1): before creating a fresh first project for a new user, call `claimAutopsyProject(userId, email)`; if `claimed`, skip the fresh-project creation and route the user to the claimed project.

- [ ] **Step 4: Idempotency + transfer test** `test/gtm-autopsy-claim.test.ts` (staging): seed a lead with a placeholder-owned project + `converted_user_id=<test user>`; call `claimAutopsyProject` twice; assert first returns `claimed:true` and `project_profiles.user_id` is now the test user + lead `status='claimed'`; second returns `claimed:false` (idempotent). Clean up.

- [ ] **Step 5: type-check + commit**

```bash
npm run type-check
git add lib/projects/claim-autopsy-project.ts test/gtm-autopsy-claim.test.ts <seam file>
git commit -m "feat(gtm-autopsy-v2): claim on signup — transfer ownership + run deferred onboarding"
```

---

## Task 6: Signup form email prefill

**Files:**
- Modify: `app/auth/signup/page.tsx`

- [ ] **Step 1: Read `?email=` and prefill**

In `app/auth/signup/page.tsx`, read the `email` search param (client component or `searchParams`) and initialise the email field's default value from it (URL-decoded). Leave it editable. No other behavior changes; verification flow unchanged.

- [ ] **Step 2: Manual check + commit**

Run the app, visit `/auth/signup?email=test%40acme.com`, confirm the email field is prefilled.
```bash
git add app/auth/signup/page.tsx
git commit -m "feat(gtm-autopsy-v2): prefill signup email from ?email= query param"
```

---

## Task 7: PR

- [ ] **Step 1: Push + draft PR targeting `staging` (stacked on #306)**

```bash
git push -u origin feat/gtm-autopsy-v2-backend
gh pr create --draft --base staging --title "feat(gtm-autopsy-v2): grounded scrape + thin project + claim-on-signup" \
  --body "Phase 1 of GTM Autopsy v2. Stacks on #306. Scrape-grounded teaser/teardown, thin placeholder-owned project (no enrichment), transfer-ownership + deferred onboarding on signup, signup email prefill. Applied to staging."
```

---

## Self-Review notes
- Spec coverage: §3.1 → Task 3; §3.2 → Task 4; §3.3 → Task 2; §3.4 → Task 1; §3.5 (prefill) → Task 6; §3.6 → Task 5; data model §4 → Task 1. ✅
- The lead endpoint uses an in-process service-role insert (Task 4 Step 2) for thin creation; the `skip_enrichment` flag (Task 2) covers the HTTP path and is kept for completeness/parity — both documented, not contradictory.
- Open items carried for in-task resolution: exact `aiWebAnalysis`/`WebsiteContent` field names (Task 3 Step 1), the internal persona-chat entry point (Task 3 Step 2), the onboarding seam file:line (Task 5 Step 1). Each is a read-first step, not a code placeholder.
