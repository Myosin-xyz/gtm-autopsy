# Teardown Email-Delivery + Rename Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the in-widget full teardown with an email magic-link flow (report generated server-side in hive-mind, delivered as a link to a public `/teardown/<token>` page), rename the feature's code/routes from `autopsy` to `teardown`, add send-abuse protections, and delete the code this refactor orphans.

**Architecture:** The widget stays thin — scrape-grounded teaser preview + email capture. On email submit, the hive-mind lead endpoint validates, rate-limits, dedupes, persists a lead with an unguessable `report_token` (status `generating`), and kicks off a background job that builds the full report, fills the thin placeholder project's `context_report`, and Resends a link to a public hive-mind page. The page renders the stored teardown and carries the signup CTA that feeds the existing claim-on-signup flow. Generation and delivery reuse internal hive-mind modules (scanner, personas/LLM, final-check voice, Resend infra) directly.

**Tech Stack:** Next.js App Router (both repos), Supabase Postgres (staging `zxjidctilwncsgwamfgn`), TypeScript, Resend (`lib/email/*`, already wired), `npx tsx` test scripts.

## Global Constraints

- **Two repos / two branches.** Hive-mind work continues on `feat/gtm-autopsy-v2-backend` (worktree `/home/mitch/github/hive-mind-gtm-v2`, draft PR #307 → `staging`, stacked on #306). Widget work continues on `feat/gtm-autopsy-v2-widget` (`/home/mitch/github/gtm-autopsy`, PR Myosin-xyz/gtm-autopsy#2 → `main`). The rename touches files owned by #306 (`cache` route, `cache-store`, `leads-auth`, lead validate/insert); rename them on the #307 branch and take the rename on the eventual #306→#307 rebase.
- **Naming:** the feature is **`teardown`** in all code, routes, modules, files, identifiers, the public page, and the email. The string "GTM Autopsy" appears in no user-facing copy.
- **Database object names are NOT renamed.** `gtm_autopsy_leads`, `gtm_autopsy_teaser_cache`, `gtm_autopsy_rate_events`, `gtm_autopsy_rate_check`, `gtm_autopsy_leads_on_signup`, `gtm_lookup_auth_user_id`, and existing columns keep their names (storage, not API surface; renaming risks the applied #306 staging migrations). Code that queries them keeps those exact string literals.
- **Target DB: staging only** (`zxjidctilwncsgwamfgn`). Apply migrations via the Supabase MCP `apply_migration`; migrations are raw SQL in `scripts/supabase/migrations/`, named `20260626<letter>_*.sql`.
- **Timing:** report generation runs in the background (`after()`); the widget confirms "check your email" immediately.
- **Validation:** magic-link is the primary gate. Keep server-side syntax + disposable-domain blocks, per-IP rate limit, per-recipient dedupe, Turnstile on submit, and Resend's existing suppression/bounce handling. No new email-verification dependency.
- **Conventions (hive-mind):** single quotes, no semicolons (match `app/api/v1/chat/route.ts`); `npm run type-check` + `./node_modules/.bin/prettier --check` before each commit; service-role client via `createClient()` from `@/lib/supabase`; tests via `npx tsx --env-file-if-exists=.env.local`.
- **Conventions (widget):** double quotes, semicolons (match existing); `./node_modules/.bin/tsc --noEmit` + `npm run build` before each commit.
- **Placeholder user** owns the thin projects + the autopsy api key: `product@myosin.xyz`, uid `2d57da9b-76b8-41cf-8cc9-85e763dc1c8d`, `api_keys.id 1ab5a348-360a-4cd7-9818-ea52b0f758ff`. Use this uid as the `email_sends.user_id` for attribution.

---

## Phase A — Dead-code removal (do first; shrinks the rename surface)

### Task A1: Delete unused widget legacy components + orchestration

**Files (widget repo):**
- Verify-then-delete: `components/Report.tsx`, `components/LoadingSequence.tsx`, `components/Form.tsx`, `components/ScoreRing.tsx`, `components/HivemindTrace.tsx`, `components/CopyButton.tsx`, `lib/hivemind.ts`, `lib/hivemind.test.ts`, `lib/autopsy-cache.ts`, `app/api/autopsy/route.ts`
- Modify (if they import the above): `app/page.tsx`, `app/embed-demo/page.tsx`, `app/install/page.tsx`

**Interfaces:**
- Produces: a widget where the only autopsy/teardown surface is `components/WidgetApp.tsx`, the two proxy routes, `lib/mock-v2.ts`, `lib/types.ts`, `lib/domain.ts`, `lib/disposable-email.ts`, `lib/turnstile.ts`, `lib/analytics.ts`.

- [ ] **Step 1: Prove each candidate is unused**

```bash
cd /home/mitch/github/gtm-autopsy
for f in Report LoadingSequence Form ScoreRing HivemindTrace CopyButton; do
  echo "== components/$f =="; grep -rn "components/$f\|from \"@/components/$f\"\|<$f" app components --include=*.tsx --include=*.ts | grep -v "components/$f.tsx:"; done
echo "== lib/hivemind =="; grep -rn "@/lib/hivemind\b\|from \"@/lib/hivemind\"" app components lib --include=*.ts --include=*.tsx | grep -v "lib/hivemind"
echo "== lib/autopsy-cache =="; grep -rn "autopsy-cache" app components lib --include=*.ts --include=*.tsx | grep -v "lib/autopsy-cache.ts"
echo "== app/api/autopsy/route (legacy /api/autopsy POST) =="; grep -rn "\"/api/autopsy\"\|'/api/autopsy'\|api/autopsy[^/]" app components --include=*.ts --include=*.tsx
```
Expected: no consumer references outside the files themselves. A reference inside `app/page.tsx` / `embed-demo` / `install` means that page renders the legacy standalone demo — handle in Step 2.

- [ ] **Step 2: Resolve page references**

If `app/page.tsx` (the marketing/demo homepage) imports `Report`/`Form`/`runAutopsy`, it is the legacy standalone demo. The widget product is `/widget`. Replace the homepage body with a minimal redirect-or-link to `/widget` (keep the file, drop the legacy demo imports):

```tsx
// app/page.tsx
export default function Home() {
  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#000", color: "#f6f6f6", fontFamily: "system-ui" }}>
      <a href="/widget" style={{ color: "#ff29e8", textDecoration: "underline" }}>
        Open the teardown widget
      </a>
    </main>
  );
}
```
Do the same for `embed-demo`/`install` only if they import deleted modules; otherwise leave them.

- [ ] **Step 3: Delete the dead files**

```bash
cd /home/mitch/github/gtm-autopsy
git rm components/Report.tsx components/LoadingSequence.tsx components/Form.tsx components/ScoreRing.tsx components/HivemindTrace.tsx components/CopyButton.tsx
git rm lib/hivemind.ts lib/hivemind.test.ts lib/autopsy-cache.ts
git rm app/api/autopsy/route.ts
```

- [ ] **Step 4: Verify build is green**

```bash
./node_modules/.bin/tsc --noEmit && npm run build 2>&1 | tail -5
```
Expected: type-check exit 0, build "Compiled successfully". Any "module not found" points at a missed consumer — fix its import, then rebuild.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "refactor(widget): remove legacy standalone demo + client-side orchestration"
```

### Task A2: Delete the v1 client-orchestration mock surface the email flow makes dead

**Files (widget repo):**
- Modify: `lib/mock-v2.ts` (drop `mockReportV2`), `lib/types.ts` (drop `TeaserResult`, `AutopsyReport`, `AutopsyInput`, `ScoreCard`(if unused elsewhere), `FrameworkChunk`, `HivemindTraceStep`, `Persona`, `Category`, `GateMeta`, `ReportV2` — keep only `TeaserV2` + `AutopsyScanV2`), `lib/mocks.ts` (delete entirely if only `mock-v2` used it)

> NOTE: This task runs AFTER Phase D removes the inline `FullScreen` (which is the only `ReportV2`/`mockReportV2` consumer). It is listed here for visibility but its checkbox is executed in Phase D Task D4. Skip now.

---

## Phase B — Rename `autopsy` → `teardown` (code, routes, modules; DB names untouched)

### Task B1: Rename hive-mind routes + lib modules

**Files (hive-mind worktree `/home/mitch/github/hive-mind-gtm-v2`):**
- Move: `app/api/v1/autopsy/{teaser,lead,cache}` → `app/api/v1/teardown/{teaser,lead,cache}`
- Move: `lib/api/v1/autopsy/*.ts` → `lib/api/v1/teardown/*.ts` (`scan`, `teaser`, `full-report`, `create-thin-project`, `voice`, `cache-store`)
- Move: `lib/projects/claim-autopsy-project.ts` → `lib/projects/claim-teardown-project.ts`
- Rename tests: `test/gtm-autopsy-{claim,lead,teaser,thin-create}.test.ts` → `test/teardown-{claim,lead,teaser,thin-create}.test.ts`
- Modify (import paths + identifiers): every file from the rename-surface grep — `app/api/projects/route.ts`, `lib/api/middleware/leads-auth.ts`, `lib/api/v1/leads/{insert-lead,validate-lead}.ts`, and the moved files' internal imports.

**Interfaces:**
- Produces: route paths `/api/v1/teardown/{teaser,lead,cache}`; modules under `@/lib/api/v1/teardown/*`; `claimTeardownProject` exported from `@/lib/projects/claim-teardown-project`.
- Unchanged: all `gtm_autopsy_*` DB string literals inside these files stay verbatim.

- [ ] **Step 1: Move route + lib directories with git**

```bash
cd /home/mitch/github/hive-mind-gtm-v2
git mv app/api/v1/autopsy app/api/v1/teardown
git mv lib/api/v1/autopsy lib/api/v1/teardown
git mv lib/projects/claim-autopsy-project.ts lib/projects/claim-teardown-project.ts
git mv test/gtm-autopsy-claim.test.ts test/teardown-claim.test.ts
git mv test/gtm-autopsy-lead.test.ts test/teardown-lead.test.ts
git mv test/gtm-autopsy-teaser.test.ts test/teardown-teaser.test.ts
git mv test/gtm-autopsy-thin-create.test.ts test/teardown-thin-create.test.ts
```

- [ ] **Step 2: Rewrite import paths (`v1/autopsy` → `v1/teardown`, `claim-autopsy-project` → `claim-teardown-project`)**

```bash
cd /home/mitch/github/hive-mind-gtm-v2
grep -rl "lib/api/v1/autopsy\|api/v1/autopsy\|claim-autopsy-project" app lib test --include=*.ts --include=*.tsx \
 | xargs sed -i 's#api/v1/autopsy#api/v1/teardown#g; s#claim-autopsy-project#claim-teardown-project#g'
```

- [ ] **Step 3: Rename the `claimAutopsyProject` identifier**

```bash
cd /home/mitch/github/hive-mind-gtm-v2
grep -rl "claimAutopsyProject" app lib test --include=*.ts --include=*.tsx \
 | xargs sed -i 's#claimAutopsyProject#claimTeardownProject#g'
```
Update the comment in `app/api/projects/route.ts` that says "GTM Autopsy claim-on-signup" → "Teardown claim-on-signup".

- [ ] **Step 4: Update the migration filenames' comment + the `appLabel` strings**

In the moved `lib/api/v1/teardown/teaser.ts` and `full-report.ts`, change the OpenRouter `appLabel` from `'GTM Autopsy Teaser'` / `'GTM Autopsy Full Report'` to `'Teardown Teaser'` / `'Teardown Full Report'`. In `lib/api/v1/teardown/scan.ts`, change `createRequestLogger('gtm-autopsy-scan')` → `createRequestLogger('teardown-scan')`. In `claim-teardown-project.ts`, change `createRequestLogger('gtm-autopsy-claim')` → `createRequestLogger('teardown-claim')`.

- [ ] **Step 5: Type-check + run the moved tests**

```bash
cd /home/mitch/github/hive-mind-gtm-v2
npm run type-check
npx --yes tsx --env-file-if-exists=.env.local test/teardown-thin-create.test.ts
```
Expected: type-check exit 0; `thin-create schema: passed`.

- [ ] **Step 6: prettier + commit**

```bash
./node_modules/.bin/prettier --write app/api/v1/teardown lib/api/v1/teardown lib/projects/claim-teardown-project.ts app/api/projects/route.ts test/teardown-*.test.ts
git add -A && git commit -m "refactor(teardown): rename autopsy routes/modules to teardown (DB names unchanged)"
```

### Task B2: Rename widget routes + modules

**Files (widget repo):**
- Move: `app/api/autopsy/teaser` → `app/api/teardown/teaser`
- Modify: `app/api/leads/route.ts` (forward URL `…/api/v1/autopsy/teaser` → `…/api/v1/teardown/lead`), the teaser proxy (forward to `/api/v1/teardown/teaser`)
- Modify: `components/WidgetApp.tsx` (fetch `'/api/autopsy/teaser'` → `'/api/teardown/teaser'`), `app/embed.js/route.ts` (iframe + any `/api/autopsy` refs), `lib/analytics.ts` (event names `gtm_autopsy_*` may stay as analytics keys — see Step 3), `lib/types.ts` comments.

**Interfaces:**
- Produces: widget proxy at `/api/teardown/teaser` and `/api/leads`, both forwarding to the renamed hive-mind `/api/v1/teardown/*` endpoints.

- [ ] **Step 1: Move the teaser proxy**

```bash
cd /home/mitch/github/gtm-autopsy
git mv app/api/autopsy/teaser app/api/teardown/teaser
rmdir app/api/autopsy 2>/dev/null || true
```

- [ ] **Step 2: Repoint the proxy forward URLs + the client fetch**

In `app/api/teardown/teaser/route.ts`: `${BASE_URL}/api/v1/autopsy/teaser` → `${BASE_URL}/api/v1/teardown/teaser`.
In `app/api/leads/route.ts`: `${BASE_URL}/api/v1/autopsy/lead` → `${BASE_URL}/api/v1/teardown/lead`.
In `components/WidgetApp.tsx`: `fetch("/api/autopsy/teaser", …)` → `fetch("/api/teardown/teaser", …)`.
In `app/embed.js/route.ts`: any `/api/autopsy` literal → `/api/teardown` (the iframe `src` is `/widget`, unaffected).

- [ ] **Step 3: Decide analytics event keys**

`lib/analytics.ts` event names (`gtm_autopsy_started`, `gtm_autopsy_teaser_viewed`, `gtm_autopsy_email_captured`) are PostHog keys with existing history. KEEP them as-is to preserve funnel continuity; add a one-line comment: `// event keys retain the gtm_autopsy_* prefix for PostHog funnel continuity`.

- [ ] **Step 4: build + commit**

```bash
./node_modules/.bin/tsc --noEmit && npm run build 2>&1 | tail -4
git add -A && git commit -m "refactor(widget): rename autopsy proxy route to teardown; repoint to /api/v1/teardown/*"
```

---

## Phase C — Data model + abuse-prevention migration

### Task C1: Migration — `report_token`, `report_status`, dedupe index

**Files (hive-mind worktree):**
- Create: `scripts/supabase/migrations/20260626c_teardown_report_delivery.sql`

**Interfaces:**
- Produces: `gtm_autopsy_leads.report_token text unique`, `gtm_autopsy_leads.report_status text not null default 'generating'` (check in `('generating','ready','failed')`), an index on `(normalized_domain, email, created_at)` for dedupe.

- [ ] **Step 1: Write the migration**

```sql
-- Teardown email delivery: address the report by an unguessable token and
-- track generation status. (Table name stays gtm_autopsy_leads.)
alter table public.gtm_autopsy_leads
  add column if not exists report_token text,
  add column if not exists report_status text not null default 'generating';

-- Backfill existing rows so the not-null/check holds, then constrain.
update public.gtm_autopsy_leads set report_status = 'ready' where report_status is null;

alter table public.gtm_autopsy_leads
  drop constraint if exists chk_teardown_report_status;
alter table public.gtm_autopsy_leads
  add constraint chk_teardown_report_status
  check (report_status = any (array['generating'::text, 'ready'::text, 'failed'::text]));

create unique index if not exists gtm_autopsy_leads_report_token_key
  on public.gtm_autopsy_leads (report_token) where report_token is not null;

create index if not exists gtm_autopsy_leads_dedupe_idx
  on public.gtm_autopsy_leads (normalized_domain, email, created_at desc);
```

- [ ] **Step 2: Apply to staging (REQUEST USER AUTHORIZATION FIRST)**

The Supabase MCP `apply_migration` is gated by the safety classifier. Before applying, present the SQL to the user and get an explicit yes (as in the Phase 1 migrations). Then `apply_migration(project_id: zxjidctilwncsgwamfgn, name: 20260626c_teardown_report_delivery, query: <above>)`.

- [ ] **Step 3: Verify**

```sql
select column_name from information_schema.columns
 where table_name='gtm_autopsy_leads' and column_name in ('report_token','report_status') order by 1;
```
Expected: two rows.

- [ ] **Step 4: Commit**

```bash
git add scripts/supabase/migrations/20260626c_teardown_report_delivery.sql
git commit -m "feat(teardown): leads.report_token + report_status + dedupe index (staging)"
```

---

## Phase D — Hive-mind: generation, email, public page, lead-endpoint rewrite

### Task D1: Teardown email template

**Files (hive-mind worktree):**
- Create: `lib/email/templates/teardown-report.ts`
- Test: `test/teardown-email-template.test.ts`

**Interfaces:**
- Consumes: `buildEmailHtml`, `buildEmailText`, `buildUnsubscribeUrl` from `@/lib/email/templates/shell`.
- Produces:
  ```ts
  export interface BuildTeardownReportEmailParams { company: string; overallScore: number; reportUrl: string; emailSendId: string }
  export interface TeardownReportTemplate { subject: string; preheader: string; html: string; text: string }
  export function buildTeardownReportEmail(p: BuildTeardownReportEmailParams): TeardownReportTemplate
  ```

- [ ] **Step 1: Write the failing test**

```ts
import assert from 'node:assert'
import {buildTeardownReportEmail} from '../lib/email/templates/teardown-report'

const t = buildTeardownReportEmail({
  company: 'Acme', overallScore: 62,
  reportUrl: 'https://hivemind.myosin.xyz/teardown/abc123', emailSendId: 'send-1',
})
assert.ok(t.subject.toLowerCase().includes('teardown'))
assert.ok(t.html.includes('https://hivemind.myosin.xyz/teardown/abc123'))
assert.ok(t.text.includes('https://hivemind.myosin.xyz/teardown/abc123'))
assert.ok(!t.html.toLowerCase().includes('autopsy'), 'no autopsy wording')
console.log('teardown email template: passed')
```

- [ ] **Step 2: Run it (fails — module missing)**

```bash
npx --yes tsx test/teardown-email-template.test.ts
```
Expected: FAIL (cannot find module).

- [ ] **Step 3: Implement the template**

```ts
import {
  buildEmailHtml,
  buildEmailText,
  buildUnsubscribeUrl,
} from '@/lib/email/templates/shell'

export interface BuildTeardownReportEmailParams {
  company: string
  overallScore: number
  reportUrl: string
  emailSendId: string
}

export interface TeardownReportTemplate {
  subject: string
  preheader: string
  html: string
  text: string
}

export function buildTeardownReportEmail(
  p: BuildTeardownReportEmailParams
): TeardownReportTemplate {
  const company = p.company || 'your company'
  const subject = `Your GTM teardown for ${company} is ready`
  const preheader = `Score ${p.overallScore}/100. Open your full teardown.`
  const content = {
    headline: `Your teardown for ${company} is ready`,
    bodyParagraphs: [
      `We read ${company} the way your market does and scored it ${p.overallScore}/100.`,
      `Your full teardown is the positioning and homepage rewrite, 5 X posts, a LinkedIn post, a cold DM, and 3 growth experiments. It is grounded in your real site, not generic advice.`,
    ],
    ctaLabel: 'Open your teardown',
    ctaCaption: 'This link is yours. No login required.',
    ctaUrl: p.reportUrl,
    preheader,
    unsubscribeUrl: buildUnsubscribeUrl(p.emailSendId),
  }
  return {
    subject,
    preheader,
    html: buildEmailHtml(content),
    text: buildEmailText(content),
  }
}
```

- [ ] **Step 4: Run it (passes)**

```bash
npx --yes tsx test/teardown-email-template.test.ts
```
Expected: `teardown email template: passed`.

- [ ] **Step 5: type-check + prettier + commit**

```bash
npm run type-check && ./node_modules/.bin/prettier --check lib/email/templates/teardown-report.ts
git add lib/email/templates/teardown-report.ts test/teardown-email-template.test.ts
git commit -m "feat(teardown): report-ready email template"
```

### Task D2: Send helper

**Files (hive-mind worktree):**
- Create: `lib/email/send-teardown-email.ts`

**Interfaces:**
- Consumes: `sendEmail` (`@/lib/email/resend`), `buildTeardownReportEmail` (D1), `emailSendsClient` (`@/services/emailSendsClient`).
- Produces:
  ```ts
  export interface SendTeardownEmailParams { to: string; recipientUserId: string; company: string; overallScore: number; reportUrl: string }
  export async function sendTeardownEmail(p: SendTeardownEmailParams): Promise<{emailSendId: string; messageId: string}>
  ```

- [ ] **Step 1: Implement (mirror `lib/email/send-team-emails.ts`)**

```ts
import {randomUUID} from 'node:crypto'

import {sendEmail} from '@/lib/email/resend'
import {buildTeardownReportEmail} from '@/lib/email/templates/teardown-report'
import {emailSendsClient} from '@/services/emailSendsClient'

export interface SendTeardownEmailParams {
  to: string
  recipientUserId: string
  company: string
  overallScore: number
  reportUrl: string
}

export async function sendTeardownEmail(
  p: SendTeardownEmailParams
): Promise<{emailSendId: string; messageId: string}> {
  const emailSendId = randomUUID()
  const template = buildTeardownReportEmail({
    company: p.company,
    overallScore: p.overallScore,
    reportUrl: p.reportUrl,
    emailSendId,
  })
  const {messageId} = await sendEmail({
    to: p.to,
    subject: template.subject,
    html: template.html,
    text: template.text,
    tags: [{name: 'campaign', value: 'teardown_report'}],
  })
  await emailSendsClient.recordTransactionalSend({
    id: emailSendId,
    userId: p.recipientUserId,
    recipientEmail: p.to,
    campaign: 'teardown_report',
    resendMessageId: messageId,
  })
  return {emailSendId, messageId}
}
```

- [ ] **Step 2: type-check + prettier + commit**

```bash
npm run type-check && ./node_modules/.bin/prettier --check lib/email/send-teardown-email.ts
git add lib/email/send-teardown-email.ts
git commit -m "feat(teardown): Resend send helper for the report-ready email"
```

### Task D3: Background generate-and-deliver job

**Files (hive-mind worktree):**
- Create: `lib/api/v1/teardown/generate-and-deliver.ts`
- Test: `test/teardown-generate-deliver.test.ts`

**Interfaces:**
- Consumes: `buildFullReport` (`./full-report`), `createThinProject` (`./create-thin-project`), `getKeyUserId` (`@/lib/api/utils/key-user`), `sendTeardownEmail` (D2), `createClient` (`@/lib/supabase`).
- Produces:
  ```ts
  export interface DeliverDeps { sendEmail: typeof sendTeardownEmail }
  export async function generateAndDeliverTeardown(opts: {
    leadId: string; keyId: string; email: string; websiteUrl: string;
    scan: AutopsyScan; teaser: AutopsyTeaser; reportToken: string;
  }, deps?: DeliverDeps): Promise<{delivered: boolean}>
  ```
  Builds the report, creates the thin project, sets the lead's `project_id` + `report_status='ready'`, sends the email. On any throw: sets `report_status='failed'`, logs, returns `{delivered:false}`. `deps.sendEmail` is injectable so tests don't send real mail.

- [ ] **Step 1: Implement**

```ts
import {getKeyUserId} from '@/lib/api/utils/key-user'
import {createRequestLogger} from '@/lib/logging/request-tracking'
import {createClient} from '@/lib/supabase'

import {createThinProject} from './create-thin-project'
import {buildFullReport} from './full-report'
import type {AutopsyScan} from './scan'
import type {AutopsyTeaser} from './teaser'
import {sendTeardownEmail} from '@/lib/email/send-teardown-email'

const APP_BASE_URL =
  process.env.EMAIL_APP_BASE_URL ?? 'https://hivemind.myosin.xyz'

export interface DeliverDeps {
  sendEmail: typeof sendTeardownEmail
}

export async function generateAndDeliverTeardown(
  opts: {
    leadId: string
    keyId: string
    email: string
    websiteUrl: string
    scan: AutopsyScan
    teaser: AutopsyTeaser
    reportToken: string
  },
  deps: DeliverDeps = {sendEmail: sendTeardownEmail}
): Promise<{delivered: boolean}> {
  const logger = createRequestLogger('teardown-deliver')
  const supabase = createClient()
  try {
    const report = await buildFullReport(opts.scan, opts.teaser)
    const {project_id} = await createThinProject({
      keyId: opts.keyId,
      websiteUrl: opts.websiteUrl,
      scan: opts.scan,
      report,
    })

    await supabase
      .from('gtm_autopsy_leads')
      .update({project_id, report_status: 'ready'})
      .eq('id', opts.leadId)

    const ownerId = (await getKeyUserId(opts.keyId)) ?? opts.keyId
    const reportUrl = `${APP_BASE_URL.replace(/\/$/, '')}/teardown/${opts.reportToken}`
    await deps.sendEmail({
      to: opts.email,
      recipientUserId: ownerId,
      company: opts.scan.projectName || opts.websiteUrl,
      overallScore: opts.teaser.overallScore,
      reportUrl,
    })
    return {delivered: true}
  } catch (e) {
    logger.error('Teardown generate/deliver failed', {
      action: 'teardown-deliver-failed',
      leadId: opts.leadId,
      error: e instanceof Error ? e.message : String(e),
    })
    await supabase
      .from('gtm_autopsy_leads')
      .update({report_status: 'failed'})
      .eq('id', opts.leadId)
    return {delivered: false}
  }
}
```

- [ ] **Step 2: Integration test (staging DB + OpenRouter; mock the email)**

```ts
import assert from 'node:assert'
;(globalThis as unknown as {__name?: unknown}).__name ??= <T>(fn: T): T => fn
import {generateAndDeliverTeardown} from '../lib/api/v1/teardown/generate-and-deliver'
import type {AutopsyScan} from '../lib/api/v1/teardown/scan'
import type {AutopsyTeaser} from '../lib/api/v1/teardown/teaser'
import {createClient} from '../lib/supabase'

const KEY_ID = '1ab5a348-360a-4cd7-9818-ea52b0f758ff'
const PLACEHOLDER = '2d57da9b-76b8-41cf-8cc9-85e763dc1c8d'
const SCAN: AutopsyScan = {projectName: 'Acme', description: 'Test', category: ['SaaS'], socialHandles: {}, audiences: ['devs'], channels: ['docs'], rawText: 'Acme builds widgets for developers. Ship faster.'}
const TEASER: AutopsyTeaser = {overallScore: 60, verdict: 'Blurry story.', scorecard: {narrativeClarity: 60, icpSharpness: 50, proofCredibility: 60, categoryDifferentiation: 55, distributionLeverage: 50}, whatsBroken: ['a','b','c']}

async function main() {
  const supabase = createClient()
  const token = 'test-' + Math.abs(SCAN.rawText.length * 7).toString(36)
  const {data: lead} = (await supabase.from('gtm_autopsy_leads').insert({
    email: `deliver-test+${token}@example.com`, website_url: 'https://acme.test',
    normalized_domain: 'acme.test', report_token: token, report_status: 'generating',
  } as never).select('id').single()) as unknown as {data: {id: string}}

  let sent = 0
  const res = await generateAndDeliverTeardown(
    {leadId: lead.id, keyId: KEY_ID, email: 'deliver-test@example.com', websiteUrl: 'https://acme.test', scan: SCAN, teaser: TEASER, reportToken: token},
    {sendEmail: async () => { sent++; return {emailSendId: 'x', messageId: 'y'} }},
  )
  assert.equal(res.delivered, true)
  assert.equal(sent, 1, 'email sent once')

  const {data: after} = await supabase.from('gtm_autopsy_leads').select('report_status, project_id').eq('id', lead.id).single()
  assert.equal(after?.report_status, 'ready')
  assert.ok(after?.project_id, 'project linked')

  const {data: proj} = await supabase.from('project_profiles').select('user_id, enrichment_status').eq('id', after!.project_id).single()
  assert.equal(proj?.user_id, PLACEHOLDER)
  assert.equal(proj?.enrichment_status, 'deferred')

  await supabase.from('gtm_autopsy_leads').delete().eq('id', lead.id)
  await supabase.from('project_profiles').delete().eq('id', after!.project_id)
  console.log('generate-and-deliver: PASS')
}
main().catch(e => { console.error(e); process.exit(1) })
```

- [ ] **Step 3: Run it**

```bash
npx --yes tsx --env-file-if-exists=.env.local test/teardown-generate-deliver.test.ts
```
Expected: `generate-and-deliver: PASS`.

- [ ] **Step 4: type-check + prettier + commit**

```bash
npm run type-check && ./node_modules/.bin/prettier --check lib/api/v1/teardown/generate-and-deliver.ts
git add lib/api/v1/teardown/generate-and-deliver.ts test/teardown-generate-deliver.test.ts
git commit -m "feat(teardown): background generate-and-deliver job (report + project + email)"
```

### Task D4: Rewrite the lead endpoint (validate, rate-limit, dedupe, background-deliver)

**Files (hive-mind worktree):**
- Modify: `app/api/v1/teardown/lead/route.ts`
- Consumes: `rateCheck` (`@/lib/api/v1/teardown/cache-store`), `validateLead`/`normalizeDomain` (`@/lib/api/v1/leads/validate-lead`), `isDisposableEmail` (add — see Step 1), `generateAndDeliverTeardown` (D3), `insertLead` (`@/lib/api/v1/leads/insert-lead`), `verifyTurnstile` (locate or add), `after` from `next/server`.

- [ ] **Step 1: Confirm/extend disposable + turnstile helpers**

```bash
grep -rn "isDisposableEmail\|verifyTurnstile\|disposable" lib --include=*.ts | grep -v node_modules | head
```
If `isDisposableEmail` is absent in hive-mind, add `lib/api/v1/leads/disposable-email.ts` exporting `isDisposableEmail(email: string): boolean` (port the widget's `lib/disposable-email.ts` list). If Turnstile server-verify is absent, add `lib/api/utils/turnstile.ts` exporting `verifyTurnstile(token: string | undefined, ip: string): Promise<boolean>` that returns `true` when `TURNSTILE_SECRET_KEY` is unset (parity with the widget), else POSTs to `https://challenges.cloudflare.com/turnstile/v0/siteverify`.

- [ ] **Step 2: Rewrite the POST handler**

```ts
import {NextRequest, NextResponse} from 'next/server'
import {after} from 'next/server'
import {randomUUID, createHash} from 'node:crypto'

import {withLeadsAuth} from '@/lib/api/middleware/leads-auth'
import {getCorsHeaders} from '@/lib/api/utils/cors'
import {verifyTurnstile} from '@/lib/api/utils/turnstile'
import {rateCheck} from '@/lib/api/v1/teardown/cache-store'
import {generateAndDeliverTeardown} from '@/lib/api/v1/teardown/generate-and-deliver'
import type {AutopsyScan} from '@/lib/api/v1/teardown/scan'
import type {AutopsyTeaser} from '@/lib/api/v1/teardown/teaser'
import {isDisposableEmail} from '@/lib/api/v1/leads/disposable-email'
import {insertLead} from '@/lib/api/v1/leads/insert-lead'
import {validateLead} from '@/lib/api/v1/leads/validate-lead'
import {createClient} from '@/lib/supabase'

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {status: 204, headers: {
    ...getCorsHeaders(request),
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, x-api-key',
    'Access-Control-Max-Age': '86400',
  }})
}

export async function POST(request: NextRequest) {
  const cors = getCorsHeaders(request)
  return withLeadsAuth(request, async (keyInfo, req) => {
    let body: Record<string, unknown>
    try { body = (await req.json()) as Record<string, unknown> }
    catch { return NextResponse.json({error: 'invalid_json'}, {status: 400, headers: cors}) }

    const leadBody = {...body, website_url: body.website_url ?? body.url}
    const parsed = validateLead(leadBody)
    if (!parsed.ok) return NextResponse.json({error: parsed.error}, {status: 400, headers: cors})
    if (isDisposableEmail(parsed.value.email)) {
      return NextResponse.json({error: 'disposable_email'}, {status: 400, headers: cors})
    }

    const scan = body.scan as AutopsyScan | undefined
    const teaser = body.teaser as AutopsyTeaser | undefined
    if (!scan || !teaser || typeof scan !== 'object' || typeof teaser !== 'object') {
      return NextResponse.json({error: 'missing_scan_or_teaser'}, {status: 400, headers: cors})
    }

    const ipHash = (parsed.value.ip_hash ?? createHash('sha256').update('0.0.0.0:teardown').digest('hex'))
    const turnstileToken = typeof body.turnstileToken === 'string' ? body.turnstileToken : undefined
    if (!(await verifyTurnstile(turnstileToken, ipHash))) {
      return NextResponse.json({error: 'turnstile_failed'}, {status: 403, headers: cors})
    }
    if (!(await rateCheck(ipHash))) {
      return NextResponse.json({error: 'rate_limited'}, {status: 429, headers: cors})
    }

    // Dedupe: one teardown per (domain,email) per 24h. Re-submit returns the
    // existing one instead of generating + emailing again.
    const supabase = createClient()
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const {data: existing} = (await supabase
      .from('gtm_autopsy_leads')
      .select('id, report_status')
      .eq('normalized_domain', parsed.value.normalized_domain)
      .ilike('email', parsed.value.email)
      .gte('created_at', since)
      .order('created_at', {ascending: false})
      .limit(1)
      .maybeSingle()) as unknown as {data: {id: string; report_status: string} | null}
    if (existing) {
      return NextResponse.json({ok: true, status: 'already_sent'}, {status: 200, headers: cors})
    }

    const reportToken = randomUUID()
    let leadId: string
    try {
      const ins = await insertLead({
        ...parsed.value,
        overall_score: parsed.value.overall_score ?? teaser.overallScore ?? null,
        verdict: parsed.value.verdict ?? teaser.verdict ?? null,
        report: teaser, // store the teaser so the public page can show score + what's broken
        report_token: reportToken,
        report_status: 'generating',
      })
      leadId = ins.lead_id
    } catch (e) {
      return NextResponse.json({error: 'lead_failed', detail: String(e).slice(0, 160)}, {status: 500, headers: cors})
    }

    after(() =>
      generateAndDeliverTeardown({
        leadId, keyId: keyInfo.key_id, email: parsed.value.email,
        websiteUrl: parsed.value.website_url, scan, teaser, reportToken,
      }),
    )

    return NextResponse.json({ok: true, status: 'generating'}, {status: 202, headers: cors})
  })
}
```

- [ ] **Step 3: Extend `insertLead` + `LeadInput` for `report_token` + `report_status`**

In `lib/api/v1/leads/validate-lead.ts` `LeadInput`, add `report_token?: string | null` and `report_status?: string | null`. In `lib/api/v1/leads/insert-lead.ts`, add to the insert row: `...(value.report_token ? {report_token: value.report_token} : {})`, `...(value.report_status ? {report_status: value.report_status} : {})`. (Typed shim already in place for `gtm_autopsy_leads`.)

- [ ] **Step 4: type-check + prettier + commit**

```bash
npm run type-check && ./node_modules/.bin/prettier --check app/api/v1/teardown/lead/route.ts lib/api/v1/leads/insert-lead.ts lib/api/v1/leads/validate-lead.ts
git add app/api/v1/teardown/lead/route.ts lib/api/v1/leads/{insert-lead,validate-lead}.ts lib/api/utils/turnstile.ts lib/api/v1/leads/disposable-email.ts
git commit -m "feat(teardown): lead endpoint — validate/rate-limit/dedupe + background deliver (no inline report)"
```

### Task D5: Public teardown page

**Files (hive-mind worktree):**
- Create: `app/teardown/[token]/page.tsx`
- Create: `app/teardown/[token]/TeardownReport.tsx` (presentational, brand-styled, ported from the widget `FullScreen` layout)
- Create: `lib/api/v1/teardown/load-by-token.ts`

**Interfaces:**
- Produces: `loadTeardownByToken(token: string): Promise<{status: 'ready'|'generating'|'not_found'; company?: string; overallScore?: number; verdict?: string; whatsBroken?: string[]; report?: FullReport; email?: string}>` — server-side lookup: lead by `report_token` → project `context_report` + scan fields.

- [ ] **Step 1: Implement the loader**

```ts
import {createClient} from '@/lib/supabase'
import type {FullReport} from './full-report'

export interface TeardownView {
  status: 'ready' | 'generating' | 'not_found'
  company?: string
  overallScore?: number
  verdict?: string
  whatsBroken?: string[]
  report?: FullReport
  email?: string
}

export async function loadTeardownByToken(token: string): Promise<TeardownView> {
  const supabase = createClient()
  const {data: lead} = (await supabase
    .from('gtm_autopsy_leads')
    .select('email, report_status, project_id, overall_score, verdict, report')
    .eq('report_token', token)
    .maybeSingle()) as unknown as {
    data: {email: string; report_status: string; project_id: string | null; overall_score: number | null; verdict: string | null; report: {whatsBroken?: string[]} | null} | null
  }
  if (!lead) return {status: 'not_found'}
  if (lead.report_status !== 'ready' || !lead.project_id) return {status: 'generating'}

  const {data: proj} = await supabase
    .from('project_profiles')
    .select('project_name, project_type, context_report')
    .eq('id', lead.project_id)
    .single()
  return {
    status: 'ready',
    company: proj?.project_name ?? undefined,
    overallScore: lead.overall_score ?? undefined,
    verdict: lead.verdict ?? undefined,
    whatsBroken: Array.isArray(lead.report?.whatsBroken) ? lead.report!.whatsBroken : [],
    report: (proj?.context_report ?? undefined) as FullReport | undefined,
    email: lead.email,
  }
}
```

- [ ] **Step 2: Implement `TeardownReport.tsx`** (server component, no client JS). Port the widget `FullScreen` JSX (hero before/after, positioning before/after, 5 X posts, LinkedIn, cold DM, 3 experiments) into a styled server component using the teardown brand tokens (ABC Maxi headings, Inter body, pink accent, dark cards, on the hive-mind page background). Include the signup CTA `<a href={\`/auth/signup?email=\${encodeURIComponent(email)}&utm_source=teardown\`}>Create a free account</a>` using the cream/pink button treatment. (Reuse exact CSS from `gtm-autopsy/components/WidgetApp.tsx` `WidgetStyles` for the report cards + button; inline as a `<style>` in the page.)

- [ ] **Step 3: Implement the page**

```tsx
import {notFound} from 'next/navigation'
import {loadTeardownByToken} from '@/lib/api/v1/teardown/load-by-token'
import {TeardownReport} from './TeardownReport'

export const dynamic = 'force-dynamic'

export default async function TeardownPage({params}: {params: {token: string}}) {
  const view = await loadTeardownByToken(params.token)
  if (view.status === 'not_found') notFound()
  if (view.status === 'generating') {
    return <main style={{minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#000', color: '#f6f6f6'}}>
      <p>Your teardown is still being prepared. Refresh in a moment.</p>
    </main>
  }
  return <TeardownReport company={view.company ?? ''} overallScore={view.overallScore ?? 0} verdict={view.verdict ?? ''} whatsBroken={view.whatsBroken ?? []} report={view.report!} email={view.email ?? ''} />
}
```

- [ ] **Step 4: Verify the route is public** — confirm `/teardown` is not in `middleware.ts` `protectedRoutes` (it is not), so no auth redirect. No middleware change needed.

- [ ] **Step 5: type-check + prettier + commit**

```bash
npm run type-check && ./node_modules/.bin/prettier --check app/teardown/[token]/page.tsx app/teardown/[token]/TeardownReport.tsx lib/api/v1/teardown/load-by-token.ts
git add app/teardown lib/api/v1/teardown/load-by-token.ts
git commit -m "feat(teardown): public /teardown/[token] report page + signup CTA"
```

### Task D6: End-to-end staging check (manual, real email)

- [ ] **Step 1:** Run hive-mind dev (`npm run dev`, :3000) + the widget (Phase E). Submit a real address you control through the widget. Confirm: 202 from the lead endpoint, an email arrives via Resend with a `/teardown/<token>` link, the link renders the teardown, the signup CTA prefills the email. Delete the test lead + project rows afterward (provide cleanup SQL).

---

## Phase E — Widget: email-sent state, remove inline teardown

### Task E1: `EmailSentScreen` + rewire `submitEmail`

**Files (widget repo):**
- Modify: `components/WidgetApp.tsx`

- [ ] **Step 1: Add the `"sent"` phase + `EmailSentScreen`**

Add `"sent"` to the `Phase` union. Replace the body of `submitEmail` so that on a successful `/api/leads` response it sets `setPhase("sent")` (no `report` handling). Render:

```tsx
{phase === "sent" && (
  <EmailSentScreen email={email} onReset={reset} />
)}
```

```tsx
function EmailSentScreen({ email, onReset }: { email: string; onReset: () => void }) {
  return (
    <div>
      <div className="myo-kicker" style={{ color: "var(--myo-lime)" }}>/ CHECK YOUR INBOX</div>
      <h3 className="myo-display" style={{ fontSize: 24 }}>Your teardown is on its way.</h3>
      <p className="myo-lead" style={{ margin: "10px 0 18px" }}>
        We&apos;re building your full teardown now and sending it to {email}. Open the email to read
        the rewrite, the posts, and the plan.
      </p>
      <button onClick={onReset} className="myo-text-link">/ run another teardown</button>
    </div>
  );
}
```

- [ ] **Step 2: Update `submitEmail`** to expect `{ok, status}` (not `{report}`):

```tsx
const data = await res.json();
if (!res.ok || !data.ok) {
  setError(data.error ?? "capture_failed");
  setPhase("teaser");
  return;
}
track("gtm_autopsy_email_captured", { url: url.trim() });
setPhase("sent");
```

Remove the `loadingFull` phase + `FULL_STEPS` usage from `submitEmail` (no second loading screen). Keep `loadingFull`/`FULL_STEPS` only if still referenced; otherwise delete in E2.

- [ ] **Step 3: build + commit**

```bash
./node_modules/.bin/tsc --noEmit && npm run build 2>&1 | tail -4
git add components/WidgetApp.tsx
git commit -m "feat(widget): email-sent confirmation; stop rendering the teardown inline"
```

### Task E2: Delete the now-dead inline-teardown code (the Phase A2 cleanup)

**Files (widget repo):**
- Modify: `components/WidgetApp.tsx` (delete `FullScreen`, `BeforeAfter`, `ScanFailedScreen` stays, `FULL_STEPS`, the `report` state, `loadingFull` phase, the `Asterisk` only if unused)
- Modify: `lib/mock-v2.ts` (delete `mockReportV2`), `lib/types.ts` (delete `ReportV2` and the v1 types listed in A2), `app/api/leads/route.ts` (mock fallback returns `{ok: true, status: 'generating'}` not a report; drop `mockReportV2` import), `app/api/teardown/teaser/route.ts` (unchanged), delete `lib/mocks.ts` if now unused.

- [ ] **Step 1: Remove `FullScreen` + `BeforeAfter` + `report`/`loadingFull` from `WidgetApp.tsx`**

Delete the `FullScreen` and `BeforeAfter` components, the `report` state, the `loadingFull` phase + its render branch, `FULL_STEPS`, and the `{phase === "full" …}` branch. Keep `ScanFailedScreen`, `LoadingScreen` (teaser only), `TeaserScreen`, `EmailSentScreen`, `Turnstile`, `ScoreHeader`, `WhatsBroken`.

- [ ] **Step 2: Update the `/api/leads` proxy mock fallback**

```ts
// app/api/leads/route.ts — mock branch
if (!hasHivemindCredentials()) {
  return NextResponse.json({ ok: true, status: "generating" });
}
```
And in the live branch, return `{ ok: true, status: data.status ?? "generating" }` instead of `{ report }`. Remove the `mockReportV2` import. **Also forward `ip_hash`** so the hive-mind per-IP rate limit works: compute it the same way the teaser proxy does (`createHash("sha256").update(`${clientIp(req)}:gtm-autopsy`).digest("hex")`) and include `ip_hash` in the forwarded body.

- [ ] **Step 3: Prune dead types/mocks**

```bash
cd /home/mitch/github/gtm-autopsy
grep -rn "ReportV2\|mockReportV2\|TeaserResult\|AutopsyReport\|AutopsyInput\|FrameworkChunk\|HivemindTraceStep" app components lib --include=*.ts --include=*.tsx | grep -v "lib/types.ts\|lib/mocks.ts"
```
For every name with zero remaining consumers, delete its declaration from `lib/types.ts` / `lib/mock-v2.ts`. If `lib/mocks.ts` has no importers, `git rm lib/mocks.ts`. Keep `TeaserV2`, `AutopsyScanV2`, `ScoreCard` (if `TeaserV2` uses it), `mockTeaserV2`.

- [ ] **Step 4: build + commit**

```bash
./node_modules/.bin/tsc --noEmit && npm run build 2>&1 | tail -4
git add -A
git commit -m "refactor(widget): delete inline teardown rendering + dead mock/report types"
```

---

## Phase F — PRs

- [ ] **Step 1: Push both branches**

```bash
cd /home/mitch/github/hive-mind-gtm-v2 && git push origin feat/gtm-autopsy-v2-backend
cd /home/mitch/github/gtm-autopsy && git push myosin feat/gtm-autopsy-v2-widget
```

- [ ] **Step 2: Update the two existing PR descriptions** (#307 hive-mind, #2 widget) to describe the email-delivery flow + the teardown rename + the dead-code removal. Note the DB tables retain `gtm_autopsy_*` names and the rename spans #306/#307.

---

## Self-Review notes

- Spec coverage: email magic-link flow → D1–D5 + E1; background timing → D4 (`after()`); abuse prevention → D4 (disposable + turnstile + rate-limit + dedupe) + existing suppression; teardown rename → B1/B2 (+ identifier/file renames); DB names kept → C1 + Global Constraints; dead-code removal → A1 + E2; public page public-by-default → D5 Step 4. ✅
- The thin project + `context_report` + `createThinProject` + claim-on-signup are reused unchanged (only renamed), so conversion attribution still works: the public page CTA prefills the email → signup trigger sets `converted_user_id` → `claimTeardownProject` transfers the project.
- Open in-task discovery: presence of `isDisposableEmail` / `verifyTurnstile` in hive-mind (D4 Step 1) — port from the widget if absent. The `TeardownReport.tsx` styling reuses the widget `WidgetStyles` CSS verbatim (D5 Step 2).
- Phase A2 is intentionally executed inside Phase E (E2) once the inline teardown is gone; listed early only for visibility.
</content>
