# GTM Autopsy lead hook — implementation design (2026-06-25)

Adapts the Notion SPECIFICATION ([ticket](https://app.notion.com/p/3654252a813a81c3acdbd79908c0a4bd), [full spec](https://app.notion.com/p/3894252a813a8132a343d29e5e266f79)) into a buildable two-repo design.

**Decisions locked with Mitch (2026-06-25):**
- Capture path: **via a new hive-mind `POST /api/v1/leads` endpoint** (service-role key stays in hive-mind).
- Target DB: **Hivemind staging** (`zxjidctilwncsgwamfgn`).
- Scope: **full v1** — core loop + abuse controls + PostHog.
- **hive-mind changes are made in a git worktree on a feature branch off `main`**, never on its active checkout. gtm-autopsy work is on `feat/gtm-autopsy-lead-hook`.

## 1. Scope & shape

Full v1 spans two repos. The seam is the `POST /api/v1/leads` contract. Built in order — the gtm-autopsy gate flow can't be tested end-to-end until the endpoint + table exist.

- **Phase 1 — `hive-mind`**: `gtm_autopsy_leads` table + conversion trigger + capture endpoint + key cap bump. (Worktree off `main`.)
- **Phase 2 — `gtm-autopsy`** (this repo): 2-call orchestrator, single-field input, blur/gate UX, lead capture client, abuse controls, PostHog events.
- **Phase 3 — deploy + Framer embed**: deploy gtm-autopsy to Vercel, add the existing one-line `<script>` to the Framer landing page as an A/B variant. Mostly ops.

Out of scope (v1): full-depth all-frameworks mode, rebuilding off Framer, a dedicated audit-log table, the outbound BD play (fast-follow), and the pre-existing RLS-disabled `hackathon_*` tables on staging (unrelated; flagged separately).

## 2. The contract: `POST /api/v1/leads` (hive-mind)

Auth: existing intelligence `x-api-key` (same key the autopsy already uses), reusing its metering + request logging.

Request body:
```json
{
  "email": "string (required)",
  "website_url": "string (required)",
  "normalized_domain": "string (required)",
  "x_handle": "string|null",
  "overall_score": "int|null",
  "verdict": "string|null",
  "report": "jsonb|null",
  "utm_source": "string|null",
  "utm_medium": "string|null",
  "utm_campaign": "string|null",
  "referrer": "string|null",
  "ip_hash": "string|null"
}
```
Response: `{ "success": true, "lead_id": "uuid" }` or `{ "error": "..." }` with appropriate status (400 invalid body, 401/403 bad key, 429 over cap, 500).

Behavior:
1. Validate + normalize body (server recomputes `normalized_domain` from `website_url` rather than trusting the client).
2. Service-role insert into `gtm_autopsy_leads`.
3. **Capture-time conversion check**: if `lower(email)` already exists in `auth.users`, set `converted_user_id` + `converted_at` + `status='converted'` on the inserted row immediately.

The endpoint follows existing `app/api/v1/chat` conventions in hive-mind (auth middleware, error envelope). Exact paths confirmed during planning by reading that route.

## 3. Phase 1 — hive-mind (data layer)

### 3.1 Migration: `gtm_autopsy_leads`
Per spec §6.1. Columns: `id uuid pk default gen_random_uuid()`, `email text not null`, `website_url text not null`, `normalized_domain text not null`, `x_handle text`, `overall_score int`, `verdict text`, `report jsonb`, `utm_source/medium/campaign text`, `referrer text`, `ip_hash text`, `status text not null default 'new'`, `converted_user_id uuid references auth.users(id) on delete set null`, `converted_at timestamptz`, `created_at timestamptz not null default now()`.

- **RLS enabled, zero public policies** — only the service role writes/reads. No anon/authenticated access.
- Indexes: `converted_user_id`, `lower(email)`, `normalized_domain`, `created_at`.

### 3.2 Conversion trigger on `auth.users`
A dedicated `AFTER INSERT` trigger (separate from `handle_new_user`), SECURITY DEFINER function:
```sql
UPDATE public.gtm_autopsy_leads
SET converted_user_id = NEW.id, converted_at = now(), status = 'converted'
WHERE lower(email) = lower(NEW.email) AND converted_user_id IS NULL;
```
Covers the autopsy-lead → later-signup direction; the endpoint's capture-time check covers already-a-user → later-autopsy. Order-independent.

Then conversion rate = `count(converted_user_id) / count(*)` on the leads table — no query-time email join. `user_profiles.onboarded_at` kept only as an optional activation signal joined via `converted_user_id`.

### 3.3 Capture endpoint
As §2. Applied to staging.

### 3.4 Key cap bump
Raise the autopsy key's monthly chat cap via `api_key_cap_overrides` to a deliberate ceiling (e.g. ~2,000/month ≈ 1,000 leads at 2 calls/lead) — doubles as the hard spend circuit-breaker.

### 3.5 Delivery
Worktree off `main` (e.g. `git worktree add ../hive-mind-gtm-leads feat/gtm-autopsy-leads main`). Migration applied to **staging** via Supabase migration tooling. Its own PR.

## 4. Phase 2 — gtm-autopsy (this repo)

### 4.1 Orchestrator: 4 calls → 2 (`lib/hivemind.ts`)
- **Drop** the standalone `knowledgeSearch` RAG call. Hivemind Trace renders from the static `mockFrameworks` list — no live RAG needed.
- `runTeaser(input)` → `gtm-architect` only: `verdict`, `scorecard`, `whatsBroken`, `overallScore`.
- `runFullReport(input, teaser)` → **one combined `genius-strategist` + `ghostwriter` prompt** returning positioning before/after + hero before/after + 5 X posts + LinkedIn + cold DM + 3 growth experiments.
- Keep per-step mock fallback (deterministic mocks) so any failed/over-quota call degrades gracefully.
- `runAutopsy` (the old 4-call path) is retained only behind the out-of-scope "live all-frameworks" mode, not on the lead-hook path.

### 4.2 Input minimization
Single required field: **company URL**. Optional: X handle. `companyName` + `category` are **derived server-side** (from domain; folded into the architect prompt — the model infers category, and `companyName` defaults to the domain's second-level label). The multi-field idle form in `WidgetApp.tsx` collapses to one URL input.

### 4.3 API routes (gtm-autopsy)
- `POST /api/autopsy/teaser` — `{ url, xHandle? }` → checks domain cache → runs `runTeaser` → returns teaser + caches by normalized domain. Per-IP rate limited.
- `POST /api/leads` — `{ email, url, teaser, utm, referrer, turnstileToken }` → verifies Turnstile → disposable-email check → server-side POST to hive-mind `/api/v1/leads` with `x-api-key` (key never reaches the browser) → returns `{ lead_id }`.
- `POST /api/autopsy/full` — `{ url, xHandle?, teaser, leadId }` → runs `runFullReport` → returns full report; best-effort patch of the report snapshot onto the lead row (via a small hive-mind update or by passing `report` through capture — finalized in planning; v1 may store teaser-only and treat `report` patch as optional).

The legacy single `/api/autopsy` route is replaced by these.

### 4.4 Gate UX (`components/WidgetApp.tsx`)
Phases: `idle` → `loading` (teaser) → `teaser` (verdict + scorecard + what's-broken shown; full report rendered **blurred + locked** beneath) → `gate` (email input + Turnstile) → `full` (unlocked).

- Teaser sections visible: overall score + per-axis scorecard, 1-line verdict, 5 "what's broken" bullets, Hivemind Trace (static).
- Locked-behind-blur: hero before/after, positioning before/after, 5 X posts, LinkedIn, cold DM, 3 growth experiments.
- Email submit: Turnstile → `POST /api/leads` → on success fire `POST /api/autopsy/full` → unlock.

### 4.5 Abuse / rate-limit (cheapest first)
- **Domain cache** — teaser cached by normalized domain ~7 days in **Upstash Redis** (Vercel-native; off the DB). Biggest lever.
- **Per-IP rate limit** — Upstash sliding window (e.g. 5/hour, 20/day) on `/api/autopsy/teaser`; returns 429.
- **Cloudflare Turnstile** — invisible widget on the email-submit step, verified server-side in `/api/leads` so the expensive call #2 can't be bot-triggered. Teaser stays frictionless.
- **Disposable-email block** — reject known disposable domains at capture.
- **Backstop** — the hive-mind key monthly cap (§3.4).

### 4.6 PostHog (project "Hive Mind", id 194109)
First-party events from the widget: `gtm_autopsy_started` (URL submitted) → `gtm_autopsy_teaser_viewed` (teaser rendered) → `gtm_autopsy_email_captured` (lead written). The email→signup leg is owned by the DB FK, not PostHog (cross-origin iframe identity stitching is unreliable).

### 4.7 New env (gtm-autopsy)
`HIVEMIND_API_KEY` (exists), `HIVEMIND_API_BASE_URL` (point at staging hive-mind), `UPSTASH_REDIS_REST_URL` + `_TOKEN`, `TURNSTILE_SECRET_KEY` + `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `NEXT_PUBLIC_POSTHOG_KEY` + `_HOST`. `.env.example` updated.

## 5. Data flow (end to end)

```
URL entered
  → POST /api/autopsy/teaser  (domain-cache hit? return cached : runTeaser → cache)   [per-IP limited]
  → teaser shown; full report blurred/locked
  → email + Turnstile
  → POST /api/leads  → Turnstile verify → disposable check
        → server → hive-mind POST /api/v1/leads (x-api-key, service-role insert,
                    auth.users email check sets converted_user_id if already a user)
        → { lead_id }
  → POST /api/autopsy/full  → runFullReport → unlock (+ optional report-snapshot patch)
  ── later: lead's email signs up → auth.users AFTER INSERT trigger backfills converted_user_id
```

## 6. Testing

- **hive-mind**: endpoint integration tests on staging — valid insert returns `lead_id`; bad/absent `x-api-key` rejected; already-registered email sets `converted_user_id` at capture; `auth.users` insert backfills a pre-existing matching lead. Verified via Supabase queries on staging.
- **gtm-autopsy**: `runTeaser`/`runFullReport` return the correct shapes and fall back to mocks with no creds; gate happy path (teaser → capture → unlock); rate-limit returns 429 past threshold; disposable email rejected; Turnstile failure blocks call #2. Manual run via `npm run dev` (port 3030).

## 7. Build order

1. **hive-mind** (worktree): migration → trigger → `POST /api/v1/leads` → key cap bump → tests on staging → PR.
2. **gtm-autopsy**: orchestrator 4→2 → single-field input → API routes → gate UX → abuse controls → PostHog → `.env.example`.
3. **Deploy**: Vercel deploy → Framer one-line `<script>` as A/B variant. Experiment metric = `gtm_autopsy_email_captured`, downstream signups joined via `converted_user_id`.

## 8. Open items resolved during planning
- Exact hive-mind `app/api/v1/*` route/auth conventions (read `chat` route first).
- Whether the full-report snapshot is patched onto the lead row in v1 or deferred (lean: capture teaser at gate; patch `report` best-effort after call #2).
- Disposable-domain list source (static list vs package).
