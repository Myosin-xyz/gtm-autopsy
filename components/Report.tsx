"use client";

import type { AutopsyReport } from "@/lib/types";
import { ScoreBar, ScoreRing } from "./ScoreRing";
import { HivemindTrace } from "./HivemindTrace";
import { CopyButton } from "./CopyButton";
import { Asterisk } from "./Logo";

const IMPACT_COLOR: Record<string, string> = {
  high: "#FF2A38",
  medium: "#FFA22F",
  low: "#FFFF6A",
};

export function Report({
  report,
  onReset,
}: {
  report: AutopsyReport;
  onReset: () => void;
}) {
  const scoreColor =
    report.overallScore >= 60 ? "#FFFF6A" : report.overallScore >= 35 ? "#FFA22F" : "#FF2A38";
  const scoreLabel =
    report.overallScore >= 60 ? "PASSING" : report.overallScore >= 35 ? "WORK TO DO" : "CRITICAL";

  return (
    <main className="relative z-10 mx-auto max-w-6xl space-y-7 px-6 py-12 md:px-10 md:py-16">
      <section
        className="card overflow-hidden"
        style={{ padding: 0 }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0,1fr)",
            gap: 0,
          }}
          className="md:!grid-cols-[1fr_320px]"
        >
          <div style={{ padding: "32px 32px 28px" }}>
            <div className="flex flex-wrap items-center gap-2">
              <span className="chip chip-outline">/ GTM AUTOPSY</span>
              <span
                className="chip"
                style={{ border: "1px solid rgba(255,255,255,0.25)", color: "rgba(255,255,255,0.7)" }}
              >
                {report.input.category}
              </span>
              <span className="annotation ml-2">{new Date(report.generatedAt).toLocaleString()}</span>
            </div>
            <h1 className="display mt-5 text-4xl md:text-6xl">
              {report.input.companyName}
            </h1>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <a
                href={normalizeUrl(report.input.websiteUrl)}
                target="_blank"
                rel="noreferrer"
                style={{
                  fontFamily: "var(--font-mono-stack)",
                  fontSize: 12,
                  letterSpacing: "0.04em",
                  color: "rgba(255,255,255,0.65)",
                  textDecoration: "none",
                }}
              >
                {report.input.websiteUrl}
              </a>
              {report.input.twitterHandle && (
                <>
                  <span style={{ color: "rgba(255,255,255,0.25)" }}>/</span>
                  <a
                    href={`https://x.com/${report.input.twitterHandle.replace(/^@/, "")}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      fontFamily: "var(--font-mono-stack)",
                      fontSize: 12,
                      letterSpacing: "0.04em",
                      color: "rgba(255,255,255,0.65)",
                      textDecoration: "none",
                    }}
                  >
                    @{report.input.twitterHandle.replace(/^@/, "")}
                  </a>
                </>
              )}
            </div>

            <div className="my-7 hairline-dim" />

            <div className="card-label">/ Verdict</div>
            <p className="mt-3 max-w-2xl text-lg leading-relaxed text-white md:text-xl">
              {report.verdict}
            </p>

            <div className="mt-7 flex flex-wrap gap-2">
              <button onClick={onReset} className="btn-ghost">
                ← Run another
              </button>
              <CopyButton
                text={`${report.input.companyName} — GTM Health ${report.overallScore}/100\nVerdict: ${report.verdict}\n\nFull autopsy by HiveMind.`}
                label="Share verdict"
              />
            </div>
          </div>

          <div
            style={{
              background: "linear-gradient(180deg, #1c1c1c 0%, #000 100%)",
              padding: 28,
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              gap: 20,
              position: "relative",
            }}
            className="border-t border-white/10 md:border-l md:border-t-0"
          >
            <div style={{ position: "absolute", top: 14, right: 14, opacity: 0.35 }}>
              <Asterisk size={20} color="#FFFF6A" />
            </div>
            <div className="card-label">/ GTM Health</div>
            <div style={{ display: "flex", justifyContent: "center" }}>
              <ScoreRing score={report.overallScore} size={200} />
            </div>
            <div
              style={{
                fontFamily: "var(--font-mono-stack)",
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.16em",
                color: scoreColor,
                textAlign: "center",
              }}
            >
              {scoreLabel}
            </div>
          </div>
        </div>
      </section>

      <section className="card p-7 md:p-9">
        <div className="flex items-center justify-between">
          <div>
            <div className="card-label">/ Scorecard</div>
            <h3 className="display mt-2 text-2xl md:text-3xl">
              Where it <em>leaks.</em>
            </h3>
          </div>
        </div>
        <div className="mt-7 grid gap-7 md:grid-cols-2">
          <ScoreBar label="Narrative clarity" value={report.scorecard.narrativeClarity} />
          <ScoreBar label="ICP sharpness" value={report.scorecard.icpSharpness} />
          <ScoreBar label="Proof / credibility" value={report.scorecard.proofCredibility} />
          <ScoreBar label="Category differentiation" value={report.scorecard.categoryDifferentiation} />
          <ScoreBar label="Distribution leverage" value={report.scorecard.distributionLeverage} />
        </div>
      </section>

      <section className="card p-7 md:p-9">
        <div className="card-label">/ What's broken</div>
        <h3 className="display mt-2 text-2xl md:text-3xl">
          The honest <em>diagnosis.</em>
        </h3>
        <ul style={{ listStyle: "none", padding: 0, margin: "24px 0 0" }}>
          {report.whatsBroken.map((b, i) => {
            const isLast = i === report.whatsBroken.length - 1;
            return (
              <li
                key={i}
                style={{
                  display: "flex",
                  gap: 18,
                  padding: "16px 0",
                  borderTop: i === 0 ? "1px solid rgba(255,255,255,0.1)" : "0",
                  borderBottom: isLast ? "0" : "1px solid rgba(255,255,255,0.08)",
                  alignItems: "flex-start",
                }}
              >
                <span
                  style={{
                    fontFamily: "var(--font-mono-stack)",
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: "0.1em",
                    color: "#FF2A38",
                    flexShrink: 0,
                    paddingTop: 2,
                  }}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span style={{ fontSize: 15, color: "#fff", lineHeight: 1.55 }}>{b}</span>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="card p-7 md:p-9">
        <div className="card-label">/ What to fix first</div>
        <h3 className="display mt-2 text-2xl md:text-3xl">
          Three moves, <em>prioritized.</em>
        </h3>
        <ol style={{ listStyle: "none", padding: 0, margin: "24px 0 0", display: "flex", flexDirection: "column", gap: 14 }}>
          {report.fixesPrioritized.map((f, i) => (
            <li
              key={i}
              style={{
                border: "1px solid rgba(255,255,255,0.14)",
                padding: 22,
                background: "rgba(255,255,255,0.015)",
              }}
            >
              <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <span
                    style={{
                      fontFamily: "var(--font-mono-stack)",
                      fontSize: 11,
                      fontWeight: 700,
                      letterSpacing: "0.1em",
                      color: "#FFFF6A",
                    }}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span style={{ fontSize: 16, fontWeight: 600, color: "#fff" }}>{f.title}</span>
                </div>
                <span
                  className="chip"
                  style={{
                    background: `${IMPACT_COLOR[f.impact]}1f`,
                    border: `1px solid ${IMPACT_COLOR[f.impact]}66`,
                    color: IMPACT_COLOR[f.impact],
                  }}
                >
                  {f.impact} impact
                </span>
              </div>
              <p style={{ marginTop: 10, fontSize: 14, lineHeight: 1.6, color: "rgba(255,255,255,0.7)" }}>{f.detail}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="card p-7 md:p-9">
        <div className="card-label">/ Before → After</div>
        <h3 className="display mt-2 text-2xl md:text-3xl">
          Rewrites you can <em>ship today.</em>
        </h3>

        <div className="mt-7 grid gap-5 md:grid-cols-2">
          <div style={{ border: "1px solid rgba(255,255,255,0.1)", padding: 20 }}>
            <div className="card-label" style={{ marginBottom: 10 }}>/ Hero — before</div>
            <p style={{ fontSize: 14, lineHeight: 1.55, color: "rgba(255,255,255,0.5)", textDecoration: "line-through", textDecorationColor: "rgba(255,255,255,0.25)" }}>
              {report.beforeAfter.homepageHeroBefore}
            </p>
          </div>
          <div style={{ border: "1px solid rgba(255,255,106,0.5)", background: "rgba(255,255,106,0.06)", padding: 20 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <div className="card-label" style={{ color: "#FFFF6A" }}>/ Hero — after</div>
              <CopyButton text={report.beforeAfter.homepageHeroAfter} />
            </div>
            <p style={{ fontSize: 14, lineHeight: 1.55, color: "#fff", fontWeight: 500 }}>
              {report.beforeAfter.homepageHeroAfter}
            </p>
          </div>

          <div style={{ border: "1px solid rgba(255,255,255,0.1)", padding: 20 }}>
            <div className="card-label" style={{ marginBottom: 10 }}>/ Positioning — before</div>
            <p style={{ fontSize: 14, lineHeight: 1.55, color: "rgba(255,255,255,0.5)", textDecoration: "line-through", textDecorationColor: "rgba(255,255,255,0.25)" }}>
              {report.beforeAfter.positioningBefore}
            </p>
          </div>
          <div style={{ border: "1px solid rgba(255,255,106,0.5)", background: "rgba(255,255,106,0.06)", padding: 20 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <div className="card-label" style={{ color: "#FFFF6A" }}>/ Positioning — after</div>
              <CopyButton text={report.beforeAfter.positioningAfter} />
            </div>
            <p style={{ fontSize: 14, lineHeight: 1.55, color: "#fff", fontWeight: 500 }}>
              {report.beforeAfter.positioningAfter}
            </p>
          </div>
        </div>
      </section>

      <section className="card p-7 md:p-9">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="card-label">/ Ghostwriter output</div>
            <h3 className="display mt-2 text-2xl md:text-3xl">
              Ready to <em>post.</em>
            </h3>
            <p className="mt-3 max-w-lg text-sm leading-relaxed text-white/65">
              By the Ghostwriter persona in {report.input.companyName}'s implied founder voice.
            </p>
          </div>
          <span className="chip" style={{ border: "1px solid rgba(172,250,82,0.5)", color: "#ACFA52" }}>
            ✎ GHOSTWRITER
          </span>
        </div>

        <div className="mt-7 grid gap-3">
          {report.ghostwriter.xPosts.map((p, i) => (
            <div key={i} style={{ border: "1px solid rgba(255,255,255,0.1)", padding: 18 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <div className="card-label">/ X post · draft {String(i + 1).padStart(2, "0")}</div>
                <CopyButton text={p} />
              </div>
              <pre style={{ margin: 0, fontFamily: "var(--font-body-stack)", fontSize: 14, lineHeight: 1.6, color: "#fff", whiteSpace: "pre-wrap" }}>
                {p}
              </pre>
            </div>
          ))}
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2">
          <div style={{ border: "1px solid rgba(255,255,255,0.1)", padding: 18 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <div className="card-label">/ Founder LinkedIn post</div>
              <CopyButton text={report.ghostwriter.linkedinPost} />
            </div>
            <pre style={{ margin: 0, fontFamily: "var(--font-body-stack)", fontSize: 13.5, lineHeight: 1.6, color: "#fff", whiteSpace: "pre-wrap" }}>
              {report.ghostwriter.linkedinPost}
            </pre>
          </div>
          <div style={{ border: "1px solid rgba(255,255,255,0.1)", padding: 18 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <div className="card-label">/ Cold DM</div>
              <CopyButton text={report.ghostwriter.coldDm} />
            </div>
            <pre style={{ margin: 0, fontFamily: "var(--font-body-stack)", fontSize: 13.5, lineHeight: 1.6, color: "#fff", whiteSpace: "pre-wrap" }}>
              {report.ghostwriter.coldDm}
            </pre>
          </div>
        </div>
      </section>

      <section className="card p-7 md:p-9">
        <div className="card-label">/ Growth experiments</div>
        <h3 className="display mt-2 text-2xl md:text-3xl">
          Three experiments worth <em>running.</em>
        </h3>
        <div className="mt-7 grid gap-px overflow-hidden bg-white/10 md:grid-cols-3">
          {report.growthExperiments.map((e, i) => (
            <div key={i} style={{ background: "#000", padding: 22 }}>
              <div
                style={{
                  fontFamily: "var(--font-mono-stack)",
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.14em",
                  color: "#FFFF6A",
                }}
              >
                {String(i + 1).padStart(2, "0")}
              </div>
              <div style={{ marginTop: 10, fontSize: 15, fontWeight: 600, color: "#fff" }}>{e.name}</div>
              <p style={{ marginTop: 8, fontSize: 13, lineHeight: 1.6, color: "rgba(255,255,255,0.7)" }}>{e.hypothesis}</p>
              <div style={{ marginTop: 14, display: "flex", flexWrap: "wrap", gap: 6 }}>
                <span
                  style={{
                    fontFamily: "var(--font-mono-stack)",
                    fontSize: 10,
                    padding: "3px 8px",
                    border: "1px solid rgba(255,255,255,0.12)",
                    color: "rgba(255,255,255,0.55)",
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                  }}
                >
                  {e.effort}
                </span>
                <span
                  style={{
                    fontFamily: "var(--font-mono-stack)",
                    fontSize: 10,
                    padding: "3px 8px",
                    border: "1px solid rgba(255,255,255,0.12)",
                    color: "rgba(255,255,255,0.55)",
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                  }}
                >
                  metric · {e.metric}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <HivemindTrace report={report} />

      <section
        style={{
          position: "relative",
          overflow: "hidden",
          background: "var(--myo-yellow)",
          color: "#000",
          borderRadius: 18,
          padding: "44px 36px",
        }}
      >
        <div style={{ position: "absolute", top: 22, right: 22, opacity: 0.5 }}>
          <Asterisk size={32} color="#000" />
        </div>
        <div
          style={{
            fontFamily: "var(--font-mono-stack)",
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            color: "rgba(0,0,0,0.55)",
          }}
        >
          / This was the teaser
        </div>
        <h2
          style={{
            fontFamily: "var(--font-mono-stack)",
            fontSize: "clamp(36px, 6vw, 56px)",
            fontWeight: 700,
            lineHeight: 0.95,
            letterSpacing: "-0.02em",
            textTransform: "uppercase",
            marginTop: 18,
            color: "#000",
            maxWidth: 720,
          }}
        >
          Hire the<br />full HiveMind plan.
        </h2>
        <p style={{ marginTop: 16, fontSize: 16, lineHeight: 1.55, color: "rgba(0,0,0,0.75)", maxWidth: 560 }}>
          The full plan: 30-day execution calendar, channel allocation, ghostwriter cadence, wedge-test rubric. Real humans behind the personas.
        </p>
        <div style={{ marginTop: 26, display: "flex", flexWrap: "wrap", gap: 12 }}>
          <a
            href="mailto:hello@myosin.xyz?subject=Hire%20HiveMind%20for%20our%20GTM"
            style={{
              padding: "14px 24px",
              borderRadius: 999,
              background: "#000",
              color: "#FFFF6A",
              textDecoration: "none",
              fontFamily: "var(--font-mono-stack)",
              fontWeight: 700,
              fontSize: 12,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
            }}
          >
            Hire HiveMind →
          </a>
          <button
            onClick={onReset}
            style={{
              padding: "13px 22px",
              borderRadius: 999,
              background: "transparent",
              border: "1px solid rgba(0,0,0,0.4)",
              color: "#000",
              fontFamily: "var(--font-mono-stack)",
              fontWeight: 500,
              fontSize: 12,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              cursor: "pointer",
            }}
          >
            / Run another autopsy
          </button>
        </div>
      </section>
    </main>
  );
}

function normalizeUrl(u: string) {
  if (!u) return "#";
  if (/^https?:\/\//i.test(u)) return u;
  return `https://${u}`;
}
