# GTM Autopsy — Embed Guide

A drop-in widget that adds a "Run a free GTM Autopsy" launcher to any page on `myosin.xyz` (or any Hivemind property). One click opens a modal with the full diagnostic tool — branded, sandboxed, and styled to match Myosin's look.

**Time to install: 30 seconds. One line of HTML.**

---

## TL;DR

Paste this once, anywhere before `</body>`:

```html
<script src="https://gtm-autopsy.vercel.app/embed.js" defer></script>
```

> Replace `gtm-autopsy.vercel.app` with the live production URL we share with you. Everything else in this guide stays the same.

That's it. A yellow launcher pill appears bottom-right on every page the snippet loads on. Click it → the full GTM Autopsy app opens in a modal over your site. Close with `×`, click outside, or `Esc`.

---

## What ships out of the box

- **Launcher button** — fixed-position pill, IBM Plex Mono, Hivemind yellow (`#FFFF6A`), `★ NEW` badge.
- **Modal** — 480px wide, 740px tall (or full-screen on mobile), blurred backdrop, sandboxed iframe pointing at the GTM Autopsy app.
- **Keyboard + a11y** — `role="dialog"`, `aria-modal`, `Esc` to close, focusable controls, scroll-lock on the host page while open.
- **Zero dependencies, zero global CSS leakage** — all styles are scoped under `.gtma-*` classes injected into a single `<style id="gtma-style">` tag.
- **Idempotent** — loading the script twice is a no-op (guarded by `window.__gtmAutopsyEmbedLoaded`).

---

## Configuration

All config is set via `data-*` attributes on the `<script>` tag. All optional.

```html
<script
  src="https://gtm-autopsy.vercel.app/embed.js"
  data-label="Run a free GTM Autopsy"
  data-position="bottom-right"
  data-accent="#FFFF6A"
  data-cta="https://hivemind.myosin.xyz/#contact"
  data-cta-label="Hire Hivemind →"
  data-auto="false"
  defer
></script>
```

| Attribute        | Default                                     | What it controls                                                                 |
| ---------------- | ------------------------------------------- | -------------------------------------------------------------------------------- |
| `data-label`     | `Run a free GTM Autopsy`                    | Text on the launcher pill.                                                       |
| `data-icon`      | *(none)*                                    | Optional emoji/glyph prepended to the label, e.g. `data-icon="⚡"`.              |
| `data-position`  | `bottom-right`                              | Where the launcher sits: `bottom-right`, `bottom-left`, `top-right`, `top-left`. |
| `data-accent`    | `#FFFF6A`                                   | Pill background + close-button hover color. Use any valid CSS color.             |
| `data-cta`       | *current page* `#contact`                   | URL the "Hire Hivemind →" CTA inside the report links to.                        |
| `data-cta-label` | `Hire Hivemind →`                           | Text of that CTA button.                                                         |
| `data-auto`      | `false`                                     | If `true`, modal auto-opens 800ms after load. Use for landing-page experiments.  |

---

## Programmatic control

The script exposes a tiny global API so you can open/close the modal from your own code (analytics-triggered openings, exit-intent, CTA buttons elsewhere on the page, etc.):

```js
window.GTMAutopsy.open();          // open the modal
window.GTMAutopsy.close();         // close the modal
window.GTMAutopsy.isOpen();        // → boolean
```

Example — open from any element on the page:

```html
<button onclick="GTMAutopsy.open()">Get your free GTM teardown</button>
```

Example — open on exit intent:

```js
document.addEventListener('mouseleave', e => {
  if (e.clientY < 0 && !GTMAutopsy.isOpen()) GTMAutopsy.open();
}, { once: true });
```

---

## Recommended placements

| Page                              | Why                                                                                |
| --------------------------------- | ---------------------------------------------------------------------------------- |
| `myosin.xyz/hivemind`             | Primary — visitors evaluating Hivemind get a live demo of what Hivemind builds.    |
| Hivemind blog posts on GTM topics | Contextual — reader is in-topic, "try the thing you just read about" converts.     |
| Pricing page                      | Late-funnel — soft proof before they fill out the contact form.                    |
| `/404` page                       | Recovery — turn dead-ends into a high-signal lead.                                 |

For the hackathon landing page, the default position (`bottom-right`) and default CTA (`Hire Hivemind →`) are already tuned. Don't change unless you have a reason.

---

## Layout it on a real page

Three install options depending on how your stack works:

### 1. Plain HTML / static site

Drop into the page template right before `</body>`:

```html
  <!-- ...your page... -->
  <script src="https://gtm-autopsy.vercel.app/embed.js" defer></script>
</body>
```

### 2. Next.js (app router)

In `app/layout.tsx` or a specific page's layout:

```tsx
import Script from 'next/script';

export default function Layout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Script src="https://gtm-autopsy.vercel.app/embed.js" strategy="afterInteractive" />
      </body>
    </html>
  );
}
```

### 3. WordPress / Webflow / Framer / Ghost

Paste the `<script>` tag into the site-wide "Custom Code → Before `</body>`" field. Every CMS calls this something slightly different — search "custom HTML before body" in your CMS docs.

### 4. Google Tag Manager

Create a new **Custom HTML** tag, paste the `<script>` tag, set the trigger to **All Pages** (or a more specific page subset). Publish.

---

## Test on the real site first

Two ways to preview before deploying. Both take under 30 seconds.

### Method A — Inject the widget into the real Hivemind page (recommended)

The most accurate preview possible: it loads the actual widget onto the actual `myosin.xyz/hivemind` page **in your browser only**. Nothing changes for any other visitor. Refreshing removes it.

**Step-by-step:**

1. **Open the host page.** Navigate to `https://myosin.xyz/hivemind` in any modern browser (Chrome, Safari, Firefox, Edge).

2. **Open DevTools.** Press `⌘ + Option + I` on Mac, or `F12` on Windows / Linux. The DevTools panel appears on the right side or bottom of the window.

3. **Click the `Console` tab.** A blinking cursor appears at the prompt — that's where you'll paste.

4. **Paste this and press Enter:**

   ```js
   var s = document.createElement('script');
   s.src = 'https://gtm-autopsy.vercel.app/embed.js';
   s.defer = true;
   document.body.appendChild(s);
   ```

5. **Look in the bottom-right corner.** Within ~1 second, a **yellow pill button** appears reading `★ NEW · Run a free GTM Autopsy →`. That's the launcher.

6. **Click the launcher.** The modal opens over the page. Try the full flow: fill in a sample company (or click *Try a sample*) → press `RUN AUTOPSY` → watch the six-step loading sequence → read the teaser report → confirm the `Hire HiveMind →` CTA links to the right place.

7. **Reload the page to remove the widget.** DevTools injections are session-only. Hit refresh (`⌘ + R` / `F5`) and the launcher is gone. Nothing was persisted on Hivemind's site.

> The script URL **must be HTTPS** — browsers block HTTP scripts from running on HTTPS pages.

#### ✅ What "passing the test" looks like

- The launcher button sits in the bottom-right and doesn't overlap any existing UI (nav, chat widget, etc.).
- Clicking it opens a modal — no layout shift, no broken styles on the host page.
- The form is readable; the loading sequence animates; the report renders within ~10 seconds.
- Closing with `×` / `Esc` / overlay-click restores the host page exactly as it was.
- The browser console shows no red errors related to `gtma-*` or `embed.js`.

If any of these fail, screenshot the console and ping Alice — usually it's a CSP rule on Hivemind's side that needs the rule additions from the [CSP section](#content-security-policy) below.

---

### Method B — Visit the demo page we host

A simpler option for sharing the preview over chat (no DevTools needed):

```
https://gtm-autopsy.vercel.app/embed-demo
```

This is a styled-as-Hivemind mock marketing page with the widget already installed. The launcher, modal, fonts, and colors are exactly what'll ship on `myosin.xyz`. Great for sending to a non-technical reviewer.

For the modal contents in isolation (e.g. embedding in a pitch deck or screenshot), use:

```
https://gtm-autopsy.vercel.app/widget
```

---

## Content Security Policy

If you run a CSP, allow the script source and the iframe source. Both are the same origin:

```
script-src   'self' https://gtm-autopsy.vercel.app;
frame-src    https://gtm-autopsy.vercel.app;
style-src    'self' 'unsafe-inline' https://fonts.googleapis.com;
font-src     https://fonts.gstatic.com;
img-src      'self' data:;
```

The widget uses inline styles (injected once into `<style id="gtma-style">`), so `'unsafe-inline'` in `style-src` is required. If your policy can't accept that, ping us — we can ship a nonce-aware variant.

---

## How it actually works (for the engineer reviewing this)

1. `<script src="…/embed.js">` fetches a small (~5KB) self-contained loader from our edge function.
2. The loader reads `data-*` attributes off its own `<script>` tag.
3. On `DOMContentLoaded`, it appends a single `<button class="gtma-launcher">` to `<body>` and a single `<style id="gtma-style">` to `<head>`.
4. On click, it appends a `<div class="gtma-overlay">` containing a lazy-loaded `<iframe>` pointed at `https://gtm-autopsy.vercel.app/widget?cta=…&label=…`.
5. The iframe is fully sandboxed — no parent-page DOM access. Nothing your site does is observable to it; nothing it does is observable to your site.

Source: [`app/embed.js/route.ts`](app/embed.js/route.ts) — ~190 lines, no dependencies, no build step on your side.

---

## Tracking

The widget itself doesn't fire analytics events (we keep it dependency-free). To track engagement from your side, instrument these events on your existing analytics layer:

```js
// Launcher visible
window.addEventListener('load', () => {
  setTimeout(() => {
    if (document.querySelector('.gtma-launcher')) {
      analytics.track('gtm_autopsy_launcher_visible');
    }
  }, 1000);
});

// Launcher clicked / modal opened
document.addEventListener('click', e => {
  if (e.target.closest('.gtma-launcher')) {
    analytics.track('gtm_autopsy_opened');
  }
});
```

If you want first-party analytics built into the script itself (open / submit / report-viewed / CTA-clicked), ping us — easy add.

---

## Troubleshooting

**Launcher doesn't appear.**
Open DevTools → Network → confirm `embed.js` loaded 200. If blocked, check CSP. If served, check Console for errors — most likely a JS error from another script earlier on the page broke `DOMContentLoaded`.

**Launcher overlaps your own chat widget (Intercom, Drift, etc.).**
Use `data-position="bottom-left"` or `top-right`. All four corners are supported.

**Modal opens but iframe is blank.**
The iframe URL is being blocked by your CSP. Add `https://gtm-autopsy.vercel.app` to `frame-src` (see CSP section).

**Styling clashes with your design system.**
It shouldn't — all selectors are namespaced `.gtma-*` and the iframe contents are fully isolated. If something leaks, screenshot and send to us.

**You changed `data-accent` and the close-button hover color also changed.**
Working as intended. The close-button picks up the accent on hover for visual consistency.

---

## Questions / changes / feature requests

Ping Alice (or open an issue on the repo). Common asks we can turn around fast:

- Different launcher shape (icon-only, FAB, ribbon).
- Multiple launchers on one page with different CTAs.
- Auto-open triggered by scroll depth, time on page, or specific element visibility.
- First-party analytics + Hivemind funnel attribution.
- Whitelabel (remove Hivemind branding from the launcher; keep it inside the report).

---

## Quick reference card

```html
<!-- Minimum -->
<script src="https://gtm-autopsy.vercel.app/embed.js" defer></script>

<!-- Fully configured -->
<script
  src="https://gtm-autopsy.vercel.app/embed.js"
  data-label="Run a free GTM Autopsy"
  data-icon="⚡"
  data-position="bottom-right"
  data-accent="#FFFF6A"
  data-cta="https://myosin.xyz/hivemind#contact"
  data-cta-label="Hire Hivemind →"
  data-auto="false"
  defer
></script>

<!-- Programmatic -->
<script>
  GTMAutopsy.open();
  GTMAutopsy.close();
  GTMAutopsy.isOpen();
</script>
```

## Lead hook (teaser → email gate → full report)

The widget runs a paywall-style flow built for landing-page lead capture:

1. **Single URL input** — visitor enters a company URL (X handle optional). `companyName` + `category` are inferred server-side.
2. **Free teaser** (`POST /api/autopsy/teaser`) — one `gtm-architect` call returns score + verdict + 5 "what's broken" bullets. Cached by normalized domain and per-IP rate-limited via the hive-mind DB (`POST /api/v1/autopsy/cache`).
3. **Email gate** — the full report renders blurred/locked behind an email field.
4. **Capture** (`POST /api/leads`) — blocks disposable emails, then posts the lead to hive-mind (server-side, with the `x-api-key`). The service-role key never touches this app.
5. **Full report** (`POST /api/autopsy/full`) — one combined `genius-strategist` + `ghostwriter` call returns hero/positioning rewrites, 5 X posts, LinkedIn, cold DM, and 3 growth experiments. The report unlocks.

**Two LLM calls total** (teaser + full); the expensive one only fires after an email. PostHog events (`gtm_autopsy_started`, `_teaser_viewed`, `_email_captured`) fire from the widget when `NEXT_PUBLIC_POSTHOG_KEY` is set.

**Requirements:** the hive-mind endpoints (`/api/v1/leads`, `/api/v1/autopsy/cache`) must be live at `HIVEMIND_API_BASE_URL`. With no env set, everything degrades to mock mode and the gate still opens (no capture). See `.env.example`.
