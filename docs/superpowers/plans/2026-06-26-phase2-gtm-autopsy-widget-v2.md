# Phase 2 — gtm-autopsy widget v2 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rewire the embeddable widget to the v2 grounded endpoints, shrink the oversized input to a compact field with inline errors, brand-match Hivemind, render the grounded teaser/teardown, and hand off to Hivemind signup with the email prefilled.

**Architecture:** The standalone Next app keeps thin server-route proxies that hold the `x-api-key` and forward to the new hive-mind endpoints (`/api/v1/autopsy/teaser`, `/api/v1/autopsy/lead`). The client passes the `scan`+`teaser` it received back into the lead call. The unlock CTA deep-links to the Hivemind signup route with `?email=`.

**Tech Stack:** Next.js 14 App Router, React 18, TypeScript.

## Global Constraints

- Branch `feat/gtm-autopsy-v2-widget` off `feat/gtm-autopsy-v2` (where the v2 spec lives). Push to the `myosin` remote (`Myosin-xyz/gtm-autopsy`).
- **Depends on Phase 1** (hive-mind v2 endpoints live on staging). With no `HIVEMIND_API_KEY`, everything degrades to mock so `npm run dev` works locally.
- Hivemind app base URL (for the signup deep-link) comes from a new public env `NEXT_PUBLIC_HIVEMIND_APP_URL` (e.g. the staging app origin); unset → fall back to `https://myosin.xyz`.
- `x-api-key` stays server-side (the proxy routes), never in the browser.
- Run `node_modules/.bin/tsc --noEmit` before each commit; keep `npm run build` green.

---

## Task 1: Branch + env

- [ ] **Step 1:** `git checkout feat/gtm-autopsy-v2 && git checkout -b feat/gtm-autopsy-v2-widget`
- [ ] **Step 2:** Add to `.env.example`:
```
# Hivemind app origin for the signup deep-link (unset → https://myosin.xyz)
# NEXT_PUBLIC_HIVEMIND_APP_URL=https://staging-app.myosin.xyz
```
- [ ] **Step 3:** Commit: `git add .env.example && git commit -m "chore(v2): NEXT_PUBLIC_HIVEMIND_APP_URL env"`

---

## Task 2: Proxy server routes → v2 endpoints

**Files:**
- Modify: `app/api/autopsy/teaser/route.ts`
- Modify: `app/api/leads/route.ts` → rename intent to the lead+project call
- Remove: `app/api/autopsy/full/route.ts` (full teardown now comes from the lead call)

**Interfaces:**
- Produces: `/api/autopsy/teaser` returns `{ teaser }` where `teaser` includes `{ overallScore, verdict, scorecard, whatsBroken, scan }`; `/api/leads` returns `{ lead_id, project_id, report }`.

- [ ] **Step 1:** Rewrite `app/api/autopsy/teaser/route.ts` to forward `{ url, ip_hash }` to `${HIVEMIND_API_BASE_URL}/api/v1/autopsy/teaser` with `x-api-key`, returning its JSON. Compute `ip_hash` from `x-forwarded-for` (reuse v1's hash). Mock fallback (no key) returns the existing deterministic mock teaser shape **plus** an empty `scan` so the lead call still works.
- [ ] **Step 2:** Rewrite `app/api/leads/route.ts` to forward `{ email, url, scan, teaser, turnstileToken }` to `${HIVEMIND_API_BASE_URL}/api/v1/autopsy/lead` with `x-api-key`, returning `{ lead_id, project_id, report }`. Keep disposable-email + Turnstile checks client-side-friendly (server verifies via hive-mind). Mock fallback returns `{ lead_id: null, project_id: null, report: <mock full report> }`.
- [ ] **Step 3:** Delete `app/api/autopsy/full/route.ts` and any client calls to it.
- [ ] **Step 4:** `node_modules/.bin/tsc --noEmit` → clean. Commit: `git commit -am "feat(v2): proxy routes forward to hive-mind autopsy v2 endpoints"`

---

## Task 3: Compact input + inline errors

**Files:**
- Modify: `components/WidgetApp.tsx` (the `IdleScreen`)

- [ ] **Step 1:** Replace the large hero + multi-button sample grid with: a one-line headline (small), a single URL input, an inline error slot directly below the input, and a single primary "Run autopsy" button. Optionally one subtle "try an example" link that fills the field. Remove the oversized `myo-display` 40px hero from idle; keep it for the loading/teaser states if desired but shrink idle.
- [ ] **Step 2:** Inline errors render in the slot below the input (not a separate banner): `invalid_url`, `rate_limited`, `scan_failed` → friendly copy.
- [ ] **Step 3:** Manual check in `npm run dev` at `/widget` — the idle view is compact, input-first. Commit: `git commit -am "feat(v2): compact idle input + inline error slot"`

---

## Task 4: Grounded teaser + teardown rendering

**Files:**
- Modify: `components/WidgetApp.tsx` (state + Teaser/Full screens)

- [ ] **Step 1:** Update the client flow: `submitUrl` → POST `/api/autopsy/teaser` → store `teaser` (incl. `scan`). `submitEmail` → POST `/api/leads` with `{ email, url, scan: teaser.scan, teaser }` → store `report` from the response → unlock.
- [ ] **Step 2:** Teaser screen renders the grounded fields (`overallScore`, `verdict`, `whatsBroken`) — verify the verdict/bullets surface site-specific text. Add a "couldn't read your site" state when the teaser route returns `scan_failed` (offer retry), per spec §5.
- [ ] **Step 3:** Full screen renders the `report` returned by the lead call (hero before/after, positioning, 5 X posts, LinkedIn, cold DM, 3 experiments) — reuse the v1 `FullScreen` layout, fed from the lead response instead of a separate `/full` call.
- [ ] **Step 4:** `tsc --noEmit` clean; manual click-through in dev (mock mode). Commit: `git commit -am "feat(v2): grounded teaser + teardown from lead response; scrape-failure state"`

---

## Task 5: Unlock CTA → Hivemind signup with email prefill

**Files:**
- Modify: `components/WidgetApp.tsx` (Full screen CTA)

- [ ] **Step 1:** Build the signup URL:
```ts
const appUrl = process.env.NEXT_PUBLIC_HIVEMIND_APP_URL || 'https://myosin.xyz'
const signupHref = `${appUrl}/auth/signup?email=${encodeURIComponent(email)}&utm_source=gtm_autopsy`
```
- [ ] **Step 2:** Replace the unlocked-state CTA copy with the soft prompt ("Want to dig into this more? Create a free Hivemind account and get started →") linking to `signupHref`, `target="_top"` so it breaks out of the iframe into a first-party tab.
- [ ] **Step 3:** Manual check: after unlock, the CTA points at `/auth/signup?email=…`. Commit: `git commit -am "feat(v2): unlock CTA deep-links to Hivemind signup with email prefill"`

---

## Task 6: Brand match

**Files:**
- Modify: `components/WidgetApp.tsx` styles (`WidgetStyles`)

- [ ] **Step 1:** Pull the Hivemind marketing palette/type from `myosin.xyz/hivemind` (colors, font stack, button radius/spacing) and reconcile the `myo-*` tokens to match. Keep the dark surface but align accent color, typography, and the CTA pill to the brand. (Reference the live site; capture exact hex/fonts during implementation.)
- [ ] **Step 2:** Visual pass in `npm run dev` at `/widget`. Commit: `git commit -am "style(v2): brand-match widget to Hivemind marketing site"`

---

## Task 7: Build + PR

- [ ] **Step 1:** `npm run build` → green (lint + types).
- [ ] **Step 2:** Push + PR to the Myosin repo:
```bash
git push -u myosin feat/gtm-autopsy-v2-widget
gh pr create --repo Myosin-xyz/gtm-autopsy --base main --head feat/gtm-autopsy-v2-widget \
  --title "feat: GTM Autopsy v2 widget — grounded, compact, signup handoff" \
  --body "Phase 2 of v2. Rewires to the grounded hive-mind endpoints, compact input, grounded teaser/teardown, brand match, unlock CTA → Hivemind signup with ?email= prefill. Depends on hive-mind v2 PR."
```

---

## Self-Review notes
- Spec coverage: §3.7 compact input → Task 3; grounded rendering → Task 4; CTA/prefill → Task 5; brand → Task 6; endpoint rewire → Task 2. ✅
- Removes the separate `/api/autopsy/full` call (teardown now returned by the lead call) — client updated in Task 4 Step 1/3.
- Mock fallback preserved at every proxy so local dev runs without credentials.
- Brand task references the live site for exact tokens (capture during implementation) — a visual task, not a code placeholder.
