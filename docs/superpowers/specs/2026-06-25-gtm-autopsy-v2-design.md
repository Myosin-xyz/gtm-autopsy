# GTM Autopsy v2 — grounded, product-integrated lead hook (2026-06-25)

Supersedes the v1 lead hook ([v1 spec](./2026-06-25-gtm-autopsy-lead-hook-design.md)). v1 shipped but read generic because it never looked at the visitor's site. v2 grounds the analysis in a real website scrape and wires the funnel into the actual Hivemind product (a real, free, onboarded project on conversion).

## Decisions locked (with Mitch, 2026-06-25)

- **Root fix:** the analysis must be grounded in a **real website scrape** (Hivemind's HiveScan), not guessed from the domain. This is the #1 lever.
- **Two surfaces, two origins:** `myosin.xyz/hivemind` is the **Framer marketing homepage**; the **app** is the separate hive-mind Next.js codebase. v2 **embeds into Framer**, so the front end stays a **standalone widget/codebase**. It talks to hive-mind over `x-api-key`.
- **Gate = email capture in the widget** — NOT Supabase auth in the iframe (third-party-cookie/redirect restrictions make in-iframe auth unreliable).
- **Placeholder ownership via the API key:** creating a project with the autopsy `x-api-key` auto-assigns ownership to the key's user (`getKeyUserId`). So lead-projects are owned by **one shared placeholder user** with quota/limit overrides. No nullable-user hacks.
- **Thin creation at lead time:** website scrape only. **No** social scraping, **no** intelligence reports (the expensive enrichment) until the user actually converts.
- **Transfer on conversion:** when the captured email signs up through the normal hive-mind flow, **transfer the project's `owner_id`** placeholder → new user and **then** run the expensive onboarding. Ownership transfer is not quota-gated, so the user keeps their 1/month quota.
- **Email report deferred to roadmap** — cut from v2; revisit (via Resend) only if the teaser→signup UX shows good response.
- **Signup handoff with email prefill:** the widget CTA deep-links to the Hivemind signup route with the captured email appended (`?email=…`), so the signup form prefills it — the visitor just sets a password, verifies, and lands in-app where the expensive runs fire.
- **UI:** shrink the oversized input to a compact field + inline errors; brand-match the Hivemind look.

## 1. Architecture

Two codebases, bridged by `x-api-key` (no service-role key ever leaves hive-mind):

- **gtm-autopsy (standalone widget)** — the embeddable surface dropped into Framer. Renders the funnel UI, calls hive-mind autopsy endpoints. Holds only the `x-api-key`.
- **hive-mind (backend)** — owns the scrape (HiveScan), persona analysis, thin project creation, the placeholder user + overrides, the leads table, and the conversion → transfer → enrich handoff.

```
Framer homepage (myosin.xyz/hivemind)
  └─ <script> embed → gtm-autopsy widget (iframe)
        │  x-api-key
        ▼
   hive-mind /api/v1/autopsy/* + /api/v1/projects (thin)
        │  service role
        ▼
   Supabase (staging → prod): project_profiles, gtm_autopsy_leads, auth.users
```

## 2. The funnel (end to end)

```
1. Visitor enters URL  ──► [HiveScan scrape] ──► grounded TEASER (score + verdict + top fixes)   [anonymous, free]
2. Email gate (in widget) ──► create THIN project owned by PLACEHOLDER user (seeded from scrape)
                          ──► generate FULL teardown grounded in scrape ──► store on project + lead row
                          ──► unlock teardown; CTA → Hivemind signup with email prefilled (?email=…)
3. Visitor signs up via normal hive-mind flow (same email, prefilled)
                          ──► conversion correlated by email (converted_user_id FK)
                          ──► TRANSFER project owner_id: placeholder → new user (uncharged)
                          ──► run EXPENSIVE onboarding (intelligence reports, optional social scrape)
                          ──► user lands in-app with a free, fully-enriched project; 1/month quota intact
```

## 3. Components

### 3.1 Grounding — HiveScan scrape (hive-mind)
- **Reuse** `lib/hivescan/scanner.ts` (`websiteScanner.scanWebsite(url)`) + `lib/hivescan/api/steps/analyze.ts` (`aiWebAnalysis`) — the same website read onboarding uses. Returns structured site data (name, description, category, audiences, channels, social handles).
- **New lead-scoped endpoint** `POST /api/v1/autopsy/teaser` (x-api-key): scrape the URL → run the `gtm-architect` persona grounded in the scrape → return `{ teaser, scan }`. The teaser's scores and "what's broken" cite real page content. Cached by normalized domain (reuse the cache built in v1).
- Rationale for a hive-mind endpoint (not the standalone app): HiveScan is server-side and session-authed; wrapping it in one x-api-key endpoint keeps the scrape + grounding where the code already lives.

### 3.2 Email capture + thin project (hive-mind)
- **New endpoint** `POST /api/v1/autopsy/lead` (x-api-key), replaces v1 `/api/v1/leads`:
  1. validate email (reuse v1 `validateLead` + disposable block + Turnstile verify).
  2. **Create a thin project** owned by the placeholder user via the existing creation path with enrichment suppressed (see 3.3): seed `project_name`, `website_url`, `description`, `project_type`/`category`, `social_handles`, `geographics`, `audiences`, `channels` from the scan; `enrichment_status` left deferred.
  3. **Generate the full teardown** (combined `genius-strategist` + `ghostwriter`, grounded in the scan) and store it on the project (`context_report` jsonb) and on the `gtm_autopsy_leads` row (`report`).
  4. write/extend the `gtm_autopsy_leads` row: email, normalized_domain, **`project_id`** (new column → the placeholder-owned project), overall_score, verdict, report, ip_hash, utm/referrer.
- Returns `{ lead_id, project_id, report }` so the widget can unlock the full teardown (the CTA then hands off to signup — 3.5).

### 3.3 Thin creation (hive-mind change)
- The existing `POST /api/v1/projects` creates a project owned by `getKeyUserId(key)` and reserves quota — but it fires background enrichment (`after(() => …)`, `enrichment_status: 'enriching'`). v2 needs a **thin path**.
- **Decision (recommended):** add a `skip_enrichment?: boolean` (or `source: 'gtm_autopsy'`) input to `POST /api/v1/projects` that, when set, skips the `after()` enrichment and sets `enrichment_status: 'deferred'`. Minimal surface, reuses owner/quota/insert logic. (Alternative: a dedicated `POST /api/v1/autopsy/project` — more isolation, more duplication. Prefer the flag.)
- Thin creation still goes through `reserveProjectCreation` under the **placeholder** user, so the placeholder needs a high project-limit override (3.4).

### 3.4 Placeholder user + overrides (hive-mind / data)
- **One shared placeholder/service user** owns all unclaimed lead-projects — the user tied to the autopsy `x-api-key`. **For now: `product@myosin.xyz`** (we need a placeholder with a real, accessible inbox; a dedicated sustainable service account is a later follow-up).
- Overrides so lead volume never trips default enforcement:
  - **Project creation:** `project_creation_limits` row for the placeholder with a high `monthly_limit` (e.g. 100000) — per the supported per-user override path (`resolveProjectCreationLimit`).
  - **Chat/API cap:** already set on the key (`knowledge`/`chat` = 2000 via `api_key_cap_overrides`); raise as needed for teaser+full volume.
  - **Messaging/usage:** add a `user_usage_overrides` / message-quota override if teardown generation would otherwise hit the per-user message cap.

### 3.5 Signup handoff — email prefill (gtm-autopsy widget + hive-mind signup form)
- The unlock CTA deep-links to the **normal Hivemind signup route** with the captured email appended: `…/signup?email=<urlencoded>&utm_source=gtm_autopsy` (plus any existing attribution params).
- **Small hive-mind change:** the signup form reads the `email` query param and **prefills the email field** so the visitor only sets a password → submits → verifies → lands in-app. Email verification is unchanged.
- The param is UX-only; conversion correlation still happens server-side by email match (the `converted_user_id` FK), so a tampered/missing param can't break attribution. (A signed token instead of a raw email is a later hardening option.)
- **Report email (Resend) is cut from v2** — moved to the roadmap (§8). The reusable `sendEmail` infra stays available for when we add it.

### 3.6 Conversion → transfer → enrich (hive-mind) — the tricky part
- We already attribute conversion: the `auth.users` AFTER INSERT trigger fills `gtm_autopsy_leads.converted_user_id` on email match (built in v1).
- **New app-level claim step:** on signup/onboarding, look up a matching `gtm_autopsy_leads` row by email; if found with a `project_id`:
  1. **Transfer ownership** — `UPDATE project_profiles SET user_id = <new user> WHERE id = <project_id>` (+ reassign any dependent rows: `conversation_ids` owner, etc.). Not quota-gated → no charge to the new user.
  2. **Run the expensive onboarding** for that project now — `runOnboardingSideEffects()` (tag sync, **intelligence reports**, optional social scrape).
  3. mark the lead `status='converted'`, `converted_at` (trigger already does the FK).
- **Seam (decided):** conversion happens through the **normal Hivemind signup route** — the widget CTA deep-links there with the email prefilled (3.5). The claim hooks into that **standard post-signup onboarding path** (where the user's first project is normally created): it checks for a claimable autopsy project (by email match) before/instead of creating a fresh one. No custom auth flow. (Exact code seam in the onboarding path confirmed during planning.)
- The DB trigger cannot do app-level work (LLM/jobs), so transfer+enrich is app code triggered at signup, keyed off the same email match.

### 3.7 Widget UI (gtm-autopsy)
- **Compact input:** replace the oversized idle screen with a single URL field + inline error area (below the field) — no large hero/sample grid dominating the frame.
- **Teaser → email gate → unlock** (as v1 shape) but grounded content; brand-match to Hivemind (colors/type/spacing from the marketing site).
- **Unlock CTA:** soft "want to dig into this more? create a free Hivemind account and get started" → deep-links to the normal Hivemind signup route with `?email=<captured>` (3.5) so the signup form prefills the email; signup is what drives the claim/transfer.
- Calls `POST /api/v1/autopsy/teaser` then `/api/v1/autopsy/lead`. PostHog events retained (`started`, `teaser_viewed`, `email_captured`).

## 4. Data model

- **Reuse (v1):** `gtm_autopsy_leads` (+ `converted_user_id` FK + conversion trigger), `gtm_autopsy_teaser_cache`, `gtm_autopsy_rate_events` + `gtm_autopsy_rate_check`.
- **New column:** `gtm_autopsy_leads.project_id uuid` → the placeholder-owned `project_profiles` row (nullable; set at email capture).
- **Reuse (product):** `project_profiles` (owned by placeholder, transferred on convert), `email_sends`, billing/quota tables (read-only except the placeholder override).

## 5. Error handling

- Scrape failure (unreachable / bot-blocked, HiveScan 422) → teaser falls back to a clearly-labeled "couldn't read your site" state, NOT silent generic mock. Offer retry.
- Thin-create failure → return the teaser anyway; capture the lead without a `project_id` (degraded), log for backfill.
- Conversion claim is idempotent (only the first claim transfers; re-runs no-op) and best-effort on enrichment (failures logged, never block signup).
- Every external dep (HiveScan, chat, Turnstile) degrades without breaking the funnel; with no creds the standalone app still runs mock for local dev.

## 6. Testing

- **hive-mind:** scrape→teaser grounded shape; thin create suppresses enrichment (`enrichment_status='deferred'`, no `after()` job); placeholder override lets N creates through; lead endpoint writes `project_id`; signup form prefills email from `?email=`; conversion claim transfers `owner_id` + enqueues enrichment + is idempotent. Against staging.
- **gtm-autopsy:** compact UI renders; teaser/lead/unlock happy path; scrape-failure state; mock fallback with no creds; build green.

## 7. Build order (phased, internal to this spec)

1. **hive-mind:** placeholder user + overrides (project limit, usage); `gtm_autopsy_leads.project_id` migration.
2. **hive-mind:** `skip_enrichment` thin path on `POST /api/v1/projects`.
3. **hive-mind:** `POST /api/v1/autopsy/teaser` (scrape + grounded architect) and `POST /api/v1/autopsy/lead` (thin project + full teardown + lead row).
4. **hive-mind:** signup form email-prefill from `?email=`; conversion claim (transfer owner_id + deferred enrichment) wired into the signup/onboarding seam.
5. **gtm-autopsy:** rewire widget to the new endpoints; compact input + inline errors; brand match; grounded teaser/teardown rendering; unlock CTA deep-links to signup with `?email=`.
6. Deploy + embed in Framer; verify end-to-end on staging.

## 8. Out of scope (v2) / roadmap
- **Report email via Resend** — deferred to the roadmap; revisit if the teaser→signup UX shows good response. The reusable `sendEmail` infra is ready when we want it.
- In-iframe Supabase auth (explicitly avoided).
- Social scraping at lead time (deferred; revisit only if teaser quality needs it — intelligence reports stay deferred to conversion regardless).
- Paid-tier behavior changes; billing UI.

## 9. Decisions & open items

**Resolved (2026-06-25):**
- **Email report cut from v2** — moved to roadmap; revisit if UX response is good.
- **Signup handoff** — widget CTA deep-links to the Hivemind signup route with `?email=` prefilled; the signup form reads the param and prefills the email field. Correlation still by email match server-side.
- **Conversion seam** — the normal Hivemind signup route; teaser CTA deep-links there; claim hooks into the standard post-signup onboarding (email match). No custom auth flow.
- **Thin creation** — add a `skip_enrichment` flag to `POST /api/v1/projects` (approved).
- **Placeholder user** — use `product@myosin.xyz` for now (real inbox); dedicated sustainable service account is a later follow-up.

**Still open (resolve in planning):**
- Exact code location of the onboarding seam that creates the first project (trace it, hook the claim there).
- Whether to seed `project_profiles.context_report` with the teardown vs a dedicated field.
- Confirm no `COUNT(*)`-over-`project_profiles` quota path exists that would retroactively count a transferred project (explorer says none).
