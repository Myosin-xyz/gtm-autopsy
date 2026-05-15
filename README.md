# GTM Autopsy — by Hivemind

A public-facing diagnostic surface that turns any company URL + X handle into a shareable, brutally honest GTM teardown — diagnosing positioning, ICP clarity, narrative health, proof gaps, and distribution leverage, then rewriting the homepage hero, 5 X posts, a LinkedIn post, a cold DM, and 3 growth experiments.

Built for the Hivemind Hackathon. The "Hivemind Trace" section is the point: every report is explicitly stitched from the **GTM Architect**, **Genius Strategist**, and **Ghostwriter** personas, citing the Hivemind frameworks library (Narrative Health Audit, Category Design Sprint, Founder-Led Distribution, Web3 Community Growth Loops, Launch Readiness Audit).

## Run

```bash
npm install
npm run dev
# open http://localhost:3030
```

Works fully without credentials — falls back to deterministic high-quality mocks so the demo never breaks.

## Live mode

Drop a real key in `.env.local`:

```
HIVEMIND_API_KEY=hm_k_...
# optional override
# HIVEMIND_API_BASE_URL=https://hivemind.myosin.xyz
```

When `HIVEMIND_API_KEY` is set, the orchestrator hits:

1. `POST /api/knowledge/search` — persona-targeted RAG over the Hivemind frameworks library
2. `POST /api/v1/chat` with `persona: gtm-architect` — structural diagnosis
3. `POST /api/v1/chat` with `persona: genius-strategist` — wedge identification
4. `POST /api/v1/chat` with `persona: ghostwriter` — voice-matched rewrites

All API calls live behind `lib/hivemind.ts`. The orchestrator falls back per-step, so any single failed call degrades gracefully into the mock.

## Architecture

```
app/
  page.tsx                  homepage form → loading → report (client state)
  layout.tsx                global styles + metadata
  api/autopsy/route.ts      POST handler that validates input and calls runAutopsy
components/
  Form.tsx                  input form with sample fill-ins
  LoadingSequence.tsx       6-step animated runner
  Report.tsx                full teardown render
  HivemindTrace.tsx         persona chips + frameworks + call chain
  ScoreRing.tsx             score ring + per-axis bars
  CopyButton.tsx            per-section copy helpers
  Logo.tsx                  inline SVG mark
lib/
  hivemind.ts               Hivemind client + orchestrator (runAutopsy, knowledgeSearch, chat)
  mocks.ts                  deterministic mock builder (seeded by input)
  types.ts                  shared types
```

## Demo script (under 2 minutes)

1. Land on homepage → "Paste a URL. Get a brutally honest GTM teardown."
2. Click a sample, hit "Run GTM Autopsy".
3. Loading sequence runs the 6 named steps — clearly shows Hivemind personas in flight.
4. Report renders: GTM Health score → scorecard → "What's broken" → "What to fix first" → Before/After rewrites → Ghostwriter X/LinkedIn/DM → 3 growth experiments → **Hivemind Trace** → CTA.
5. Scroll to the Hivemind Trace block. This is the judging hook: "This isn't generic AI output" — personas, frameworks, and the literal call chain.

## Why this isn't a generic content tool

- The report is structured around Hivemind's persona stack, not a single LLM prompt.
- Every section's authority comes from a named framework retrieved via knowledge search.
- The output is the diagnostic, not a chatbot — readable, shareable, and ends in a clear "Request access" CTA that maps directly to Hivemind's growth funnel.
