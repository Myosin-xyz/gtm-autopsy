"use client";

import type { AutopsyReport } from "@/lib/types";
import { ScoreBar, ScoreRing } from "./ScoreRing";
import { HivemindTrace } from "./HivemindTrace";
import { CopyButton } from "./CopyButton";

const IMPACT_COLOR: Record<string, string> = {
  high: "#F43F5E",
  medium: "#F59E0B",
  low: "#22D3EE",
};

export function Report({
  report,
  onReset,
}: {
  report: AutopsyReport;
  onReset: () => void;
}) {
  return (
    <main className="mx-auto max-w-5xl space-y-6 px-5 py-10 md:py-14">
      <header className="card p-6 md:p-8">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="chip">GTM Autopsy</span>
              <span className="chip" style={{ background: "rgba(34,211,238,0.12)", borderColor: "rgba(34,211,238,0.4)", color: "#a5edf6" }}>
                {report.input.category}
              </span>
              <span className="text-xs text-white/40">
                {new Date(report.generatedAt).toLocaleString()}
              </span>
            </div>
            <h1 className="mt-3 text-3xl font-semibold md:text-4xl">
              {report.input.companyName}
            </h1>
            <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-white/55">
              <a href={normalizeUrl(report.input.websiteUrl)} target="_blank" rel="noreferrer" className="hover:text-white/85">
                {report.input.websiteUrl}
              </a>
              {report.input.twitterHandle && (
                <>
                  <span className="text-white/20">·</span>
                  <a href={`https://x.com/${report.input.twitterHandle.replace(/^@/, "")}`} target="_blank" rel="noreferrer" className="hover:text-white/85">
                    @{report.input.twitterHandle.replace(/^@/, "")}
                  </a>
                </>
              )}
            </div>

            <p className="mt-5 text-lg leading-relaxed text-white/85">
              <span className="text-white/40">Verdict — </span>
              {report.verdict}
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              <button onClick={onReset} className="btn-ghost text-sm">
                ← Run another autopsy
              </button>
              <CopyButton
                text={`${report.input.companyName} — GTM Health ${report.overallScore}/100\nVerdict: ${report.verdict}\n\nFull autopsy by Hivemind.`}
                label="Share verdict"
              />
            </div>
          </div>
          <ScoreRing score={report.overallScore} />
        </div>
      </header>

      <section className="card p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <div className="label">Scorecard</div>
            <h3 className="mt-1 text-xl font-semibold">Where it leaks</h3>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <ScoreBar label="Narrative clarity" value={report.scorecard.narrativeClarity} />
          <ScoreBar label="ICP sharpness" value={report.scorecard.icpSharpness} />
          <ScoreBar label="Proof / credibility" value={report.scorecard.proofCredibility} />
          <ScoreBar label="Category differentiation" value={report.scorecard.categoryDifferentiation} />
          <ScoreBar label="Distribution leverage" value={report.scorecard.distributionLeverage} />
        </div>
      </section>

      <section className="card p-6">
        <div className="label">What's broken</div>
        <h3 className="mt-1 text-xl font-semibold">The honest diagnosis</h3>
        <ul className="mt-4 space-y-2.5">
          {report.whatsBroken.map((b, i) => (
            <li key={i} className="flex gap-3 text-white/85">
              <span className="mt-0.5 inline-block h-2 w-2 flex-shrink-0 rounded-full bg-accent-rose/80" />
              <span className="leading-relaxed">{b}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="card p-6">
        <div className="label">What to fix first</div>
        <h3 className="mt-1 text-xl font-semibold">Three moves, prioritized</h3>
        <ol className="mt-4 space-y-4">
          {report.fixesPrioritized.map((f, i) => (
            <li key={i} className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="font-medium text-white/95">
                  <span className="mr-2 inline-block rounded-md bg-white/10 px-2 py-0.5 font-mono text-xs text-white/70">
                    #{i + 1}
                  </span>
                  {f.title}
                </div>
                <span
                  className="chip"
                  style={{
                    background: `${IMPACT_COLOR[f.impact]}1f`,
                    borderColor: `${IMPACT_COLOR[f.impact]}66`,
                    color: IMPACT_COLOR[f.impact],
                  }}
                >
                  {f.impact} impact
                </span>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-white/65">{f.detail}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="card p-6">
        <div className="label">Before → After</div>
        <h3 className="mt-1 text-xl font-semibold">Rewrites you can ship today</h3>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
            <div className="label mb-2">Homepage hero — before</div>
            <p className="text-sm leading-relaxed text-white/55 line-through decoration-white/20">
              {report.beforeAfter.homepageHeroBefore}
            </p>
          </div>
          <div className="rounded-xl border border-accent-violet/30 bg-accent-violet/[0.05] p-4">
            <div className="flex items-center justify-between">
              <div className="label mb-2">Homepage hero — after</div>
              <CopyButton text={report.beforeAfter.homepageHeroAfter} />
            </div>
            <p className="text-sm leading-relaxed text-white/95">
              {report.beforeAfter.homepageHeroAfter}
            </p>
          </div>

          <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
            <div className="label mb-2">Positioning — before</div>
            <p className="text-sm leading-relaxed text-white/55 line-through decoration-white/20">
              {report.beforeAfter.positioningBefore}
            </p>
          </div>
          <div className="rounded-xl border border-accent-violet/30 bg-accent-violet/[0.05] p-4">
            <div className="flex items-center justify-between">
              <div className="label mb-2">Positioning — after</div>
              <CopyButton text={report.beforeAfter.positioningAfter} />
            </div>
            <p className="text-sm leading-relaxed text-white/95">
              {report.beforeAfter.positioningAfter}
            </p>
          </div>
        </div>
      </section>

      <section className="card p-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="label">Ghostwriter output</div>
            <h3 className="mt-1 text-xl font-semibold">Ready-to-post drafts</h3>
            <p className="mt-1 text-sm text-white/55">
              Written by the Hivemind Ghostwriter persona in {report.input.companyName}'s implied founder voice.
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-3">
          {report.ghostwriter.xPosts.map((p, i) => (
            <div
              key={i}
              className="rounded-xl border border-white/5 bg-white/[0.02] p-4"
            >
              <div className="mb-2 flex items-center justify-between">
                <div className="font-mono text-[11px] uppercase tracking-wider text-white/40">
                  X post · draft {i + 1}
                </div>
                <CopyButton text={p} />
              </div>
              <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-white/90">
                {p}
              </pre>
            </div>
          ))}
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
            <div className="mb-2 flex items-center justify-between">
              <div className="font-mono text-[11px] uppercase tracking-wider text-white/40">
                Founder LinkedIn post
              </div>
              <CopyButton text={report.ghostwriter.linkedinPost} />
            </div>
            <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-white/90">
              {report.ghostwriter.linkedinPost}
            </pre>
          </div>
          <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
            <div className="mb-2 flex items-center justify-between">
              <div className="font-mono text-[11px] uppercase tracking-wider text-white/40">
                Cold DM / outreach
              </div>
              <CopyButton text={report.ghostwriter.coldDm} />
            </div>
            <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-white/90">
              {report.ghostwriter.coldDm}
            </pre>
          </div>
        </div>
      </section>

      <section className="card p-6">
        <div className="label">Growth experiments</div>
        <h3 className="mt-1 text-xl font-semibold">Three experiments worth running</h3>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {report.growthExperiments.map((e, i) => (
            <div key={i} className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
              <div className="text-sm font-semibold text-white/95">{e.name}</div>
              <p className="mt-2 text-sm leading-relaxed text-white/70">{e.hypothesis}</p>
              <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-white/55">
                <span className="rounded-md border border-white/10 bg-white/5 px-2 py-0.5">
                  {e.effort}
                </span>
                <span className="rounded-md border border-white/10 bg-white/5 px-2 py-0.5">
                  metric · {e.metric}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <HivemindTrace report={report} />

      <section className="card relative overflow-hidden p-8 text-center">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(600px 200px at 50% 0%, rgba(139,92,246,0.25), transparent 70%)",
          }}
        />
        <div className="relative">
          <div className="label">Next step</div>
          <h3 className="mt-2 text-2xl font-semibold md:text-3xl">
            Want the full Hivemind growth plan?
          </h3>
          <p className="mx-auto mt-2 max-w-xl text-white/65">
            This was the 12-minute autopsy. The full plan includes a 30-day execution calendar,
            channel allocation, ghostwriter cadence, and a wedge test rubric.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <a
              href="mailto:hello@hivemind.myosin.xyz?subject=Request%20full%20Hivemind%20growth%20plan"
              className="btn-primary"
            >
              Request access
            </a>
            <button onClick={onReset} className="btn-ghost">
              Run another autopsy
            </button>
          </div>
        </div>
      </section>

      <footer className="pt-4 text-center text-xs text-white/35">
        GTM Autopsy is a Hivemind diagnostic surface. Reports use the GTM Architect,
        Genius Strategist, and Ghostwriter personas against the Hivemind frameworks library.
      </footer>
    </main>
  );
}

function normalizeUrl(u: string) {
  if (!u) return "#";
  if (/^https?:\/\//i.test(u)) return u;
  return `https://${u}`;
}
