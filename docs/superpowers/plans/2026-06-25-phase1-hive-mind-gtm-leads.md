# Phase 1 — hive-mind GTM Autopsy leads layer — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the `gtm_autopsy_leads` table, an `auth.users` conversion trigger, and a `POST /api/v1/leads` capture endpoint to hive-mind, so the gtm-autopsy app can write leads and attribute conversions.

**Architecture:** A SQL migration creates the table (RLS on, service-role-only), a SECURITY DEFINER email→user lookup function, and an AFTER INSERT trigger on `auth.users` that backfills `converted_user_id`. A new App-Router route reuses hive-mind's existing `x-api-key` auth factory and the service-role Supabase client to validate + insert leads, doing a capture-time conversion check.

**Tech Stack:** Next.js App Router (hive-mind), Supabase Postgres (staging `zxjidctilwncsgwamfgn`), TypeScript, `npx tsx` test scripts.

## Global Constraints

- **All work in a git worktree off `main`**, branch `feat/gtm-autopsy-leads`. Never commit on hive-mind's active checkout (`feat/scraper-handle-warnings`).
- **Target DB: staging only** (`zxjidctilwncsgwamfgn`). Do not touch prod `TheHiveMind`.
- Migrations are raw SQL files in `scripts/supabase/migrations/`, named `YYYYMMDD<letter>_description.sql`. Today's date prefix: `20260625`.
- Apply migrations to staging via the Supabase MCP `apply_migration` tool (no local supabase CLI stack).
- Reuse existing utilities — do not invent new auth or Supabase-client patterns:
  - Service-role client: `createClient()` from `@/lib/supabase`.
  - API-key auth factory: `createApiKeyAuth` from `@/lib/api/middleware/validate-api-key`, `validateApiKey` from `@/lib/api/utils/api-keys` (model on `lib/api/middleware/knowledge-auth.ts`).
  - CORS: `getCorsHeaders`, `addCorsHeaders` from `@/lib/api/utils/cors`.
- Conventions: single quotes, no semicolons (match `app/api/v1/chat/route.ts`). Run `npm run type-check` before each commit.

---

## Task 0: Create the worktree

**Files:** none (git operation)

- [ ] **Step 1: Create an isolated worktree off `main`**

Run from `/home/mitch/github/hive-mind`:
```bash
git fetch origin
git worktree add -b feat/gtm-autopsy-leads /home/mitch/github/hive-mind-gtm-leads origin/main
```
Expected: `Preparing worktree ... HEAD is now at <sha>`.

- [ ] **Step 2: Install deps in the worktree (symlink-free, safe)**

```bash
cd /home/mitch/github/hive-mind-gtm-leads && npm install
```
Expected: completes without error. All subsequent Phase 1 paths are relative to `/home/mitch/github/hive-mind-gtm-leads`.

---

## Task 1: Migration — table, lookup function, conversion trigger

**Files:**
- Create: `scripts/supabase/migrations/20260625a_gtm_autopsy_leads.sql`

**Interfaces:**
- Produces: table `public.gtm_autopsy_leads`; function `public.gtm_lookup_auth_user_id(text) returns uuid`; trigger `gtm_autopsy_leads_conversion` on `auth.users`. Later tasks insert into the table and call the function via service-role rpc.

- [ ] **Step 1: Write the migration SQL**

Create `scripts/supabase/migrations/20260625a_gtm_autopsy_leads.sql`:
```sql
-- GTM Autopsy lead hook: leads table + conversion attribution.
-- Target: staging. RLS on, service-role-only access.

create table if not exists public.gtm_autopsy_leads (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  website_url text not null,
  normalized_domain text not null,
  x_handle text,
  overall_score int,
  verdict text,
  report jsonb,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  referrer text,
  ip_hash text,
  status text not null default 'new',
  converted_user_id uuid references auth.users(id) on delete set null,
  converted_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists gtm_autopsy_leads_converted_user_id_idx
  on public.gtm_autopsy_leads (converted_user_id);
create index if not exists gtm_autopsy_leads_email_lower_idx
  on public.gtm_autopsy_leads (lower(email));
create index if not exists gtm_autopsy_leads_domain_idx
  on public.gtm_autopsy_leads (normalized_domain);
create index if not exists gtm_autopsy_leads_created_at_idx
  on public.gtm_autopsy_leads (created_at);

alter table public.gtm_autopsy_leads enable row level security;
-- No policies: only the service role (which bypasses RLS) may read/write.

-- Email -> auth user id lookup for capture-time conversion checks.
-- SECURITY DEFINER so the service role can read auth.users via rpc.
create or replace function public.gtm_lookup_auth_user_id(p_email text)
returns uuid
language sql
security definer
set search_path = public, auth
as $$
  select id from auth.users where lower(email) = lower(p_email) limit 1;
$$;

revoke all on function public.gtm_lookup_auth_user_id(text) from public, anon, authenticated;

-- Backfill converted_user_id when a lead's email later signs up.
create or replace function public.gtm_autopsy_leads_on_signup()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  update public.gtm_autopsy_leads
  set converted_user_id = new.id,
      converted_at = now(),
      status = 'converted'
  where lower(email) = lower(new.email)
    and converted_user_id is null;
  return new;
end;
$$;

drop trigger if exists gtm_autopsy_leads_conversion on auth.users;
create trigger gtm_autopsy_leads_conversion
  after insert on auth.users
  for each row execute function public.gtm_autopsy_leads_on_signup();
```

- [ ] **Step 2: Apply the migration to staging**

Use the Supabase MCP `apply_migration` tool with `project_id: "zxjidctilwncsgwamfgn"`, `name: "20260625a_gtm_autopsy_leads"`, and the SQL above as `query`.
Expected: success, no error.

- [ ] **Step 3: Verify the table and trigger exist**

Use Supabase MCP `execute_sql` (project `zxjidctilwncsgwamfgn`):
```sql
select
  (select count(*) from information_schema.tables
     where table_schema='public' and table_name='gtm_autopsy_leads') as has_table,
  (select count(*) from information_schema.triggers
     where trigger_name='gtm_autopsy_leads_conversion') as has_trigger;
```
Expected: `has_table = 1`, `has_trigger = 1`.

- [ ] **Step 4: Verify the conversion trigger backfills (against a throwaway lead)**

Run via `execute_sql`. Pick a real existing auth user's email to avoid creating users:
```sql
-- Insert a lead whose email matches an existing auth user, with the FK NULL,
-- then simulate the post-signup backfill the trigger performs and confirm it fills.
with u as (select id, email from auth.users order by created_at limit 1)
insert into public.gtm_autopsy_leads (email, website_url, normalized_domain)
select email, 'https://example.com', 'example.com' from u
returning id, email, converted_user_id;
```
Then run the trigger's update body manually to prove the matching logic (the real trigger fires on auth signup, which we don't want to force here):
```sql
update public.gtm_autopsy_leads l
set converted_user_id = u.id, converted_at = now(), status='converted'
from auth.users u
where lower(l.email) = lower(u.email) and l.converted_user_id is null
returning l.id, l.converted_user_id, l.status;
```
Expected: the row now has a non-null `converted_user_id` and `status='converted'`.

- [ ] **Step 5: Clean up the throwaway row**

```sql
delete from public.gtm_autopsy_leads where website_url='https://example.com';
```
Expected: `DELETE 1`.

- [ ] **Step 6: Commit**

```bash
git add scripts/supabase/migrations/20260625a_gtm_autopsy_leads.sql
git commit -m "feat(gtm-leads): add gtm_autopsy_leads table + conversion trigger (staging)"
```

---

## Task 2: Lead request validation (pure function)

**Files:**
- Create: `lib/api/v1/leads/validate-lead.ts`
- Test: `test/gtm-leads-validate.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export interface LeadInput {
    email: string
    website_url: string
    normalized_domain: string
    x_handle: string | null
    overall_score: number | null
    verdict: string | null
    report: unknown | null
    utm_source: string | null
    utm_medium: string | null
    utm_campaign: string | null
    referrer: string | null
    ip_hash: string | null
  }
  export function normalizeDomain(rawUrl: string): string | null
  export function validateLead(body: unknown): { ok: true; value: LeadInput } | { ok: false; error: string }
  ```
  Task 3 consumes `validateLead` and `normalizeDomain`.

- [ ] **Step 1: Write the failing test**

Create `test/gtm-leads-validate.test.ts`:
```ts
import assert from 'node:assert'
import {validateLead, normalizeDomain} from '../lib/api/v1/leads/validate-lead'

// normalizeDomain
assert.equal(normalizeDomain('https://www.Vaultline.xyz/path?q=1'), 'vaultline.xyz')
assert.equal(normalizeDomain('vaultline.xyz'), 'vaultline.xyz')
assert.equal(normalizeDomain('not a url'), null)

// rejects missing email
{
  const r = validateLead({website_url: 'https://a.com'})
  assert.equal(r.ok, false)
}

// rejects bad email
{
  const r = validateLead({email: 'nope', website_url: 'https://a.com'})
  assert.equal(r.ok, false)
}

// accepts a minimal valid body and recomputes domain server-side
{
  const r = validateLead({email: 'a@b.com', website_url: 'https://WWW.Acme.com/x'})
  assert.equal(r.ok, true)
  if (r.ok) {
    assert.equal(r.value.normalized_domain, 'acme.com')
    assert.equal(r.value.x_handle, null)
    assert.equal(r.value.overall_score, null)
  }
}

// clamps score and trims handle
{
  const r = validateLead({
    email: 'a@b.com', website_url: 'https://acme.com',
    x_handle: '@acme', overall_score: 250,
  })
  assert.equal(r.ok, true)
  if (r.ok) {
    assert.equal(r.value.x_handle, 'acme')
    assert.equal(r.value.overall_score, 100)
  }
}

console.log('validate-lead: all assertions passed')
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npx tsx test/gtm-leads-validate.test.ts
```
Expected: FAIL — cannot find module `validate-lead`.

- [ ] **Step 3: Implement `validate-lead.ts`**

Create `lib/api/v1/leads/validate-lead.ts`:
```ts
export interface LeadInput {
  email: string
  website_url: string
  normalized_domain: string
  x_handle: string | null
  overall_score: number | null
  verdict: string | null
  report: unknown | null
  utm_source: string | null
  utm_medium: string | null
  utm_campaign: string | null
  referrer: string | null
  ip_hash: string | null
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function normalizeDomain(rawUrl: string): string | null {
  if (!rawUrl || typeof rawUrl !== 'string') return null
  let host: string
  try {
    const withScheme = /^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`
    host = new URL(withScheme).hostname
  } catch {
    return null
  }
  if (!host || !host.includes('.')) return null
  return host.replace(/^www\./i, '').toLowerCase()
}

function str(v: unknown, max: number): string | null {
  if (typeof v !== 'string') return null
  const t = v.trim()
  return t ? t.slice(0, max) : null
}

export function validateLead(
  body: unknown,
): {ok: true; value: LeadInput} | {ok: false; error: string} {
  if (!body || typeof body !== 'object') return {ok: false, error: 'invalid_body'}
  const b = body as Record<string, unknown>

  const email = str(b.email, 200)?.toLowerCase() ?? ''
  if (!EMAIL_RE.test(email)) return {ok: false, error: 'invalid_email'}

  const website_url = str(b.website_url, 500)
  if (!website_url) return {ok: false, error: 'missing_website_url'}

  const normalized_domain = normalizeDomain(website_url)
  if (!normalized_domain) return {ok: false, error: 'invalid_website_url'}

  const rawScore = typeof b.overall_score === 'number' ? Math.round(b.overall_score) : null
  const overall_score =
    rawScore === null ? null : Math.max(0, Math.min(100, rawScore))

  return {
    ok: true,
    value: {
      email,
      website_url,
      normalized_domain,
      x_handle: str(b.x_handle, 40)?.replace(/^@/, '') ?? null,
      overall_score,
      verdict: str(b.verdict, 500),
      report: b.report ?? null,
      utm_source: str(b.utm_source, 120),
      utm_medium: str(b.utm_medium, 120),
      utm_campaign: str(b.utm_campaign, 120),
      referrer: str(b.referrer, 500),
      ip_hash: str(b.ip_hash, 128),
    },
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
npx tsx test/gtm-leads-validate.test.ts
```
Expected: `validate-lead: all assertions passed`.

- [ ] **Step 5: Commit**

```bash
git add lib/api/v1/leads/validate-lead.ts test/gtm-leads-validate.test.ts
git commit -m "feat(gtm-leads): lead request validation + domain normalization"
```

---

## Task 3: `POST /api/v1/leads` endpoint

**Files:**
- Create: `lib/api/middleware/leads-auth.ts`
- Create: `lib/api/v1/leads/insert-lead.ts`
- Create: `app/api/v1/leads/route.ts`
- Test: `test/gtm-leads-insert.test.ts`

**Interfaces:**
- Consumes: `validateLead`, `LeadInput` (Task 2); `createApiKeyAuth` + `validateApiKey`; `createClient` from `@/lib/supabase`.
- Produces:
  ```ts
  // insert-lead.ts
  export async function insertLead(value: LeadInput): Promise<{ lead_id: string }>
  ```
  Inserts the row, runs the capture-time `gtm_lookup_auth_user_id` check, and sets `converted_user_id` when the email already belongs to a user.

- [ ] **Step 1: Write the auth wrapper (mirror knowledge-auth)**

Create `lib/api/middleware/leads-auth.ts`:
```ts
import {createApiKeyAuth} from '@/lib/api/middleware/validate-api-key'
import {validateApiKey} from '@/lib/api/utils/api-keys'
import {logAuthFailure} from '@/lib/api/utils/auth-logging'

export interface LeadsKeyInfo {
  key_id: string
  service_name: string
}

export const withLeadsAuth = createApiKeyAuth<LeadsKeyInfo>({
  extractKey: req => req.headers.get('x-api-key'),
  validate: async key => {
    const result = await validateApiKey(key)
    if (result.valid && result.key_id) {
      return {
        allowed: true,
        keyInfo: {key_id: result.key_id, service_name: result.service_name ?? 'unknown'},
      }
    }
    return {
      allowed: false,
      error_code: result.error_code ?? 'unknown_error',
      service_name: result.service_name,
      retry_after_seconds: result.retry_after_seconds,
      reset_at: result.reset_at,
    }
  },
  onMissingKey: () =>
    new Response(JSON.stringify({error: 'authentication_required'}), {
      status: 401,
      headers: {'content-type': 'application/json'},
    }),
  onError: error =>
    new Response(JSON.stringify({error: error.error_code}), {
      status: error.error_code === 'rate_limited' ? 429 : 401,
      headers: {'content-type': 'application/json'},
    }),
  logFailure: logAuthFailure,
})
```

NOTE: confirm `createApiKeyAuth`'s exact option names by reading `lib/api/middleware/validate-api-key.ts` first; the shape above matches `knowledge-auth.ts`. If `onError`/`onMissingKey` signatures differ, match that file exactly.

- [ ] **Step 2: Write the insert helper**

Create `lib/api/v1/leads/insert-lead.ts`:
```ts
import {createClient} from '@/lib/supabase'
import type {LeadInput} from './validate-lead'

export async function insertLead(value: LeadInput): Promise<{lead_id: string}> {
  const supabase = createClient()

  // Capture-time conversion check: is this email already a user?
  const {data: existingUserId} = await supabase.rpc('gtm_lookup_auth_user_id', {
    p_email: value.email,
  })

  const row = {
    email: value.email,
    website_url: value.website_url,
    normalized_domain: value.normalized_domain,
    x_handle: value.x_handle,
    overall_score: value.overall_score,
    verdict: value.verdict,
    report: value.report,
    utm_source: value.utm_source,
    utm_medium: value.utm_medium,
    utm_campaign: value.utm_campaign,
    referrer: value.referrer,
    ip_hash: value.ip_hash,
    ...(existingUserId
      ? {converted_user_id: existingUserId, converted_at: new Date().toISOString(), status: 'converted'}
      : {}),
  }

  const {data, error} = await supabase
    .from('gtm_autopsy_leads')
    .insert(row)
    .select('id')
    .single()

  if (error || !data) throw new Error(`insert_failed: ${error?.message ?? 'no row'}`)
  return {lead_id: data.id as string}
}
```

- [ ] **Step 3: Write the route**

Create `app/api/v1/leads/route.ts`:
```ts
import {NextRequest, NextResponse} from 'next/server'

import {withLeadsAuth} from '@/lib/api/middleware/leads-auth'
import {getCorsHeaders} from '@/lib/api/utils/cors'
import {insertLead} from '@/lib/api/v1/leads/insert-lead'
import {validateLead} from '@/lib/api/v1/leads/validate-lead'

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

export async function POST(request: NextRequest) {
  const cors = getCorsHeaders(request)
  return withLeadsAuth(request, async (_keyInfo, req) => {
    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({error: 'invalid_json'}, {status: 400, headers: cors})
    }
    const parsed = validateLead(body)
    if (!parsed.ok) {
      return NextResponse.json({error: parsed.error}, {status: 400, headers: cors})
    }
    try {
      const {lead_id} = await insertLead(parsed.value)
      return NextResponse.json({success: true, lead_id}, {status: 201, headers: cors})
    } catch (e) {
      return NextResponse.json(
        {error: 'insert_failed', detail: String(e).slice(0, 200)},
        {status: 500, headers: cors},
      )
    }
  })
}
```

- [ ] **Step 4: Write an integration test (hits the real handler against staging)**

Create `test/gtm-leads-insert.test.ts`. Requires `.env.local` in the worktree pointing `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` at **staging**:
```ts
import assert from 'node:assert'
import {insertLead} from '../lib/api/v1/leads/insert-lead'
import {createClient} from '../lib/supabase'

async function main() {
  const novel = `qa+${Date.now()}@nonexistent-domain-xyz.test`
  const {lead_id} = await insertLead({
    email: novel, website_url: 'https://acme.com', normalized_domain: 'acme.com',
    x_handle: null, overall_score: 42, verdict: 'weak', report: {a: 1},
    utm_source: null, utm_medium: null, utm_campaign: null, referrer: null, ip_hash: null,
  })
  assert.ok(lead_id, 'returns a lead_id')

  const supabase = createClient()
  const {data} = await supabase
    .from('gtm_autopsy_leads').select('converted_user_id, status').eq('id', lead_id).single()
  assert.equal(data?.converted_user_id, null, 'novel email is unconverted')
  assert.equal(data?.status, 'new')

  await supabase.from('gtm_autopsy_leads').delete().eq('id', lead_id)
  console.log('insert-lead: passed')
}
main().catch(e => { console.error(e); process.exit(1) })
```

- [ ] **Step 5: Run the integration test**

```bash
node --env-file=.env.local node_modules/.bin/tsx test/gtm-leads-insert.test.ts
```
(If the project loads env differently, match `test:api-keys` in `package.json`: `node --env-file=.env.local ...`.)
Expected: `insert-lead: passed`.

- [ ] **Step 6: type-check**

```bash
npm run type-check
```
Expected: no errors. (`supabase.rpc('gtm_lookup_auth_user_id', ...)` and the new table may not be in `lib/database.types.ts`; if type-check complains, regenerate types via Supabase MCP `generate_typescript_types` for project `zxjidctilwncsgwamfgn` and update `lib/database.types.ts`, or cast the client call with `as never`/`@ts-expect-error` and leave a TODO to regen. Prefer regenerating.)

- [ ] **Step 7: Commit**

```bash
git add lib/api/middleware/leads-auth.ts lib/api/v1/leads/insert-lead.ts app/api/v1/leads/route.ts test/gtm-leads-insert.test.ts
git commit -m "feat(gtm-leads): POST /api/v1/leads capture endpoint"
```

---

## Task 4: Raise the autopsy key monthly cap

**Files:** none (data operation on staging)

**Interfaces:**
- Consumes: existing `intelligence_api_keys` (1 row) and `api_key_cap_overrides` (5 rows) on staging.

- [ ] **Step 1: Identify the autopsy key id**

Via Supabase MCP `execute_sql` (project `zxjidctilwncsgwamfgn`):
```sql
select id, service_name, monthly_chat_cap from public.intelligence_api_keys;
select * from public.api_key_cap_overrides limit 10;
```
Expected: one intelligence key; note its `id` and the override table's column shape (the exact column names — `key_id`, `monthly_chat_cap`/`monthly_cap` — drive the next step). Read both before writing.

- [ ] **Step 2: Upsert a deliberate ceiling**

Using the real column names from Step 1, set the autopsy key's monthly cap to ~2000 (≈1000 leads at 2 calls/lead). Example shape (adjust columns to match):
```sql
insert into public.api_key_cap_overrides (key_id, monthly_chat_cap)
values ('<autopsy-key-id>', 2000)
on conflict (key_id) do update set monthly_chat_cap = excluded.monthly_chat_cap;
```
Expected: 1 row affected.

- [ ] **Step 3: Verify**

```sql
select * from public.api_key_cap_overrides where key_id = '<autopsy-key-id>';
```
Expected: the row shows `2000`. Record the value in the Phase 1 PR description. (No code commit — note this is a data change applied to staging.)

---

## Task 5: Open the Phase 1 PR

- [ ] **Step 1: Push and open PR**

```bash
git push -u origin feat/gtm-autopsy-leads
gh pr create --title "feat(gtm-leads): GTM Autopsy leads table + capture endpoint" \
  --body "Phase 1 of the GTM Autopsy lead hook. Adds gtm_autopsy_leads (staging), auth.users conversion trigger, POST /api/v1/leads, and a monthly cap bump. See docs in gtm-autopsy repo."
```

---

## Self-Review notes

- Spec coverage: §6.1 table → Task 1; §6.3 trigger + capture-time check → Tasks 1 & 3; §6.2 endpoint → Task 3; §5.5 cap bump → Task 4. ✅
- The `report` snapshot patch (gtm-autopsy `/api/autopsy/full`) is handled in Phase 2; Phase 1's endpoint already accepts `report`, so no extra endpoint is needed — the gtm-autopsy capture call can include the teaser at gate time and the full report can be re-POSTed, OR a follow-up PATCH route added later. v1: include teaser fields at capture; full-report persistence is optional (documented in Phase 2 plan).
- Confirm `createApiKeyAuth` option names by reading `lib/api/middleware/validate-api-key.ts` before Task 3 Step 1 (flagged inline).
