"use client";

import { useEffect, useState } from "react";
import type { AutopsyReport, TeaserResult } from "@/lib/types";
import { initAnalytics, track } from "@/lib/analytics";

const PERSONA_META: Record<string, { name: string; color: string; mark: string }> = {
  "gtm-architect": { name: "GTM ARCHITECT", color: "#6989FE", mark: "▰" },
  "genius-strategist": { name: "GENIUS STRATEGIST", color: "#FF29E8", mark: "✦" },
  ghostwriter: { name: "GHOSTWRITER", color: "#ACFA52", mark: "✎" },
};

const TEASER_STEPS = [
  "Reading the homepage",
  "Running GTM Architect diagnosis",
  "Scoring the teardown",
];
const FULL_STEPS = [
  "Finding the strategic wedge",
  "Rewriting hero + posts with Ghostwriter",
  "Compiling the full plan",
];

const SAMPLES = ["vaultline.xyz", "agentframe.ai", "mergewell.dev"];
const BINARY_NOISE = ["00 0 01", "0 10 01", "0 01 00 0"];

type Phase = "idle" | "loadingTeaser" | "teaser" | "loadingFull" | "full";

export function WidgetApp({ ctaUrl, ctaLabel }: { ctaUrl: string; ctaLabel: string }) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [stepIdx, setStepIdx] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const [url, setUrl] = useState("");
  const [xHandle, setXHandle] = useState("");
  const [email, setEmail] = useState("");
  const [teaser, setTeaser] = useState<TeaserResult | null>(null);
  const [report, setReport] = useState<AutopsyReport | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string | undefined>(undefined);

  useEffect(() => {
    initAnalytics();
  }, []);

  // Animate the loading step list during the two loading phases.
  useEffect(() => {
    if (phase !== "loadingTeaser" && phase !== "loadingFull") return;
    const steps = phase === "loadingTeaser" ? TEASER_STEPS : FULL_STEPS;
    if (stepIdx >= steps.length - 1) return;
    const t = setTimeout(() => setStepIdx((i) => Math.min(steps.length - 1, i + 1)), 750);
    return () => clearTimeout(t);
  }, [phase, stepIdx]);

  async function submitUrl(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;
    setError(null);
    setStepIdx(0);
    setPhase("loadingTeaser");
    track("gtm_autopsy_started", { url: url.trim() });
    const t0 = Date.now();
    try {
      const res = await fetch("/api/autopsy/teaser", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url: url.trim(), xHandle: xHandle.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok || !data.teaser) {
        setError(data.error ?? "teaser_failed");
        setPhase("idle");
        return;
      }
      const elapsed = Date.now() - t0;
      if (elapsed < 2200) await new Promise((r) => setTimeout(r, 2200 - elapsed));
      setTeaser(data.teaser as TeaserResult);
      setPhase("teaser");
      track("gtm_autopsy_teaser_viewed", { url: url.trim() });
    } catch (err) {
      setError(String(err));
      setPhase("idle");
    }
  }

  async function submitEmail(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !teaser) return;
    setError(null);
    setStepIdx(0);
    setPhase("loadingFull");
    const t0 = Date.now();
    try {
      const cap = await fetch("/api/leads", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          url: url.trim(),
          xHandle: xHandle.trim() || undefined,
          teaser,
          turnstileToken,
          referrer: typeof document !== "undefined" ? document.referrer || undefined : undefined,
          utm:
            typeof window !== "undefined"
              ? Object.fromEntries(new URLSearchParams(window.location.search))
              : undefined,
        }),
      });
      const capData = await cap.json();
      if (!cap.ok) {
        setError(capData.error ?? "capture_failed");
        setPhase("teaser");
        return;
      }
      track("gtm_autopsy_email_captured", { url: url.trim() });
      const full = await fetch("/api/autopsy/full", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url: url.trim(), xHandle: xHandle.trim() || undefined, teaser }),
      });
      const fullData = await full.json();
      if (!full.ok || !fullData.report) {
        setError(fullData.error ?? "full_failed");
        setPhase("teaser");
        return;
      }
      const elapsed = Date.now() - t0;
      if (elapsed < 2400) await new Promise((r) => setTimeout(r, 2400 - elapsed));
      setReport(fullData.report as AutopsyReport);
      setPhase("full");
    } catch (err) {
      setError(String(err));
      setPhase("teaser");
    }
  }

  function reset() {
    setPhase("idle");
    setUrl("");
    setXHandle("");
    setEmail("");
    setTeaser(null);
    setReport(null);
    setTurnstileToken(undefined);
    setStepIdx(0);
    setError(null);
  }

  return (
    <div className="myo-root">
      <header className="myo-header">
        <div className="myo-header-row">
          <div className="myo-brand">
            <Asterisk size={14} />
            <span className="myo-brand-name">HIVEMIND</span>
            <span className="myo-brand-slash">/</span>
            <span className="myo-brand-product">GTM AUTOPSY</span>
          </div>
          <span className="myo-annotation">{BINARY_NOISE[0]}</span>
        </div>
        <div className="myo-hairline" />
      </header>

      <div className="myo-body">
        {phase === "idle" && (
          <IdleScreen
            url={url}
            setUrl={setUrl}
            xHandle={xHandle}
            setXHandle={setXHandle}
            onSubmit={submitUrl}
            error={error}
          />
        )}
        {phase === "loadingTeaser" && <LoadingScreen steps={TEASER_STEPS} idx={stepIdx} title="Reading the room." />}
        {phase === "loadingFull" && <LoadingScreen steps={FULL_STEPS} idx={stepIdx} title="Writing the plan." />}
        {phase === "teaser" && teaser && (
          <TeaserScreen
            teaser={teaser}
            email={email}
            setEmail={setEmail}
            onSubmitEmail={submitEmail}
            setTurnstileToken={setTurnstileToken}
            error={error}
          />
        )}
        {phase === "full" && report && (
          <FullScreen report={report} ctaUrl={ctaUrl} ctaLabel={ctaLabel} onReset={reset} />
        )}
      </div>

      <footer className="myo-footer">
        <div className="myo-hairline" />
        <div className="myo-footer-row">
          <span className="myo-annotation">2025 / MYOSIN</span>
          <span className="myo-annotation">{BINARY_NOISE[2]}</span>
        </div>
      </footer>

      <WidgetStyles />
    </div>
  );
}

function IdleScreen(props: {
  url: string;
  setUrl: (s: string) => void;
  xHandle: string;
  setXHandle: (s: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  error: string | null;
}) {
  return (
    <div>
      <div className="myo-kicker">/ FREE DIAGNOSTIC · 60 SECONDS</div>
      <h2 className="myo-display" style={{ fontSize: 40 }}>
        Stop sounding<br />
        like the <em>category.</em>
      </h2>
      <p className="myo-lead">
        Paste a URL. Three HiveMind personas read your site, diagnose what&apos;s broken, and rewrite
        your hero. Brutally honest. The teardown is free.
      </p>

      <form onSubmit={props.onSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div>
          <div className="myo-label">/ Company URL</div>
          <input
            className="myo-input"
            placeholder="vaultline.xyz"
            value={props.url}
            onChange={(e) => props.setUrl(e.target.value)}
            maxLength={200}
            autoFocus
            required
          />
        </div>
        <div>
          <div className="myo-label">/ X handle (optional)</div>
          <input
            className="myo-input"
            placeholder="vaultline"
            value={props.xHandle}
            onChange={(e) => props.setXHandle(e.target.value)}
            maxLength={40}
          />
        </div>

        {props.error && (
          <div className="myo-error">
            {props.error === "rate_limited"
              ? "/ ERROR: Too many tries — slow down and retry later"
              : props.error === "invalid_url"
                ? "/ ERROR: Enter a valid company URL"
                : `/ ERROR: ${props.error}`}
          </div>
        )}

        <div style={{ height: 1, background: "rgba(255,255,255,0.1)" }} />

        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
            <span className="myo-samples-label">SAMPLES:</span>
            {SAMPLES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => props.setUrl(s)}
                className="myo-btn-ghost"
                style={{ width: "auto", padding: "8px 14px" }}
              >
                {s}
              </button>
            ))}
          </div>
          <button type="submit" className="myo-btn-primary" style={{ width: "auto", paddingLeft: 26, paddingRight: 26 }}>
            RUN AUTOPSY →
          </button>
        </div>
      </form>

      <div style={{ marginTop: 26, paddingTop: 18, borderTop: "1px solid rgba(255,255,255,0.1)" }}>
        <div className="myo-label" style={{ marginBottom: 10 }}>/ Powered by</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          <span className="myo-chip" style={{ border: "1px solid rgba(105,137,254,0.5)", color: "#6989FE" }}>▰ GTM Architect</span>
          <span className="myo-chip" style={{ border: "1px solid rgba(255,41,232,0.45)", color: "#FF29E8" }}>✦ Genius Strategist</span>
          <span className="myo-chip" style={{ border: "1px solid rgba(172,250,82,0.45)", color: "#ACFA52" }}>✎ Ghostwriter</span>
        </div>
      </div>
    </div>
  );
}

function LoadingScreen({ steps, idx, title }: { steps: string[]; idx: number; title: string }) {
  return (
    <div>
      <div className="myo-kicker" style={{ color: "var(--myo-yellow)", display: "flex", alignItems: "center", gap: 8 }}>
        <span className="myo-pulse-dot" />
        / RUNNING
      </div>
      <h3 className="myo-display" style={{ fontSize: 24 }}>{title}</h3>
      <ol style={{ listStyle: "none", padding: 0, margin: "20px 0 0", display: "flex", flexDirection: "column", gap: 0 }}>
        {steps.map((label, i) => {
          const state = i < idx ? "done" : i === idx ? "active" : "pending";
          return (
            <li
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                padding: "12px 0",
                borderBottom: i < steps.length - 1 ? "1px solid rgba(255,255,255,0.1)" : "0",
              }}
            >
              <span
                style={{
                  fontFamily: "var(--font-mono-stack)",
                  fontSize: 10,
                  fontWeight: 700,
                  color: state === "done" ? "var(--myo-yellow)" : state === "active" ? "#fff" : "rgba(255,255,255,0.3)",
                  width: 28,
                }}
              >
                {String(i + 1).padStart(2, "0")}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, color: state === "pending" ? "rgba(255,255,255,0.35)" : "#fff", fontWeight: 500 }}>
                  {label}
                </div>
                {state === "active" && (
                  <div style={{ marginTop: 8, height: 2, width: "100%", background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
                    <div className="myo-shimmer-bar" />
                  </div>
                )}
              </div>
              <span style={{ fontFamily: "var(--font-mono-stack)", fontSize: 9.5, color: state === "done" ? "var(--myo-yellow)" : "rgba(255,255,255,0.35)" }}>
                {state === "done" ? "✓ OK" : state === "active" ? "..." : ""}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function ScoreHeader({ teaser }: { teaser: TeaserResult }) {
  const score = teaser.overallScore;
  const scoreColor = score >= 60 ? "#FFFF6A" : score >= 35 ? "#FFA22F" : "#FF2A38";
  const scoreLabel = score >= 60 ? "PASSING" : score >= 35 ? "WORK TO DO" : "CRITICAL";
  return (
    <div style={{ display: "flex", alignItems: "stretch", border: "1px solid rgba(255,255,255,0.14)", borderRadius: 16, overflow: "hidden" }}>
      <div style={{ width: 132, padding: 18, background: "linear-gradient(180deg, #1a1a1a 0%, #000 100%)", borderRight: "1px solid rgba(255,255,255,0.14)", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
        <div className="myo-card-label">/ Score</div>
        <div>
          <div style={{ fontFamily: "var(--font-mono-stack)", fontSize: 52, fontWeight: 700, lineHeight: 1, color: scoreColor }}>{score}</div>
          <div style={{ fontFamily: "var(--font-mono-stack)", fontSize: 9, color: "rgba(255,255,255,0.5)", marginTop: 4 }}>/ 100</div>
        </div>
        <div style={{ fontFamily: "var(--font-mono-stack)", fontSize: 9.5, fontWeight: 700, letterSpacing: "0.14em", color: scoreColor }}>{scoreLabel}</div>
      </div>
      <div style={{ flex: 1, padding: 18, display: "flex", flexDirection: "column", justifyContent: "space-between", minWidth: 0 }}>
        <div>
          <div className="myo-card-label">/ {teaser.input.category}</div>
          <div style={{ fontFamily: "var(--font-mono-stack)", fontSize: 18, fontWeight: 700, marginTop: 6, textTransform: "uppercase" }}>{teaser.input.companyName}</div>
        </div>
        <div style={{ fontSize: 12.5, color: "rgba(255,255,255,0.78)", lineHeight: 1.5, marginTop: 10 }}>{teaser.verdict}</div>
      </div>
    </div>
  );
}

function WhatsBroken({ items, max }: { items: string[]; max: number }) {
  return (
    <div className="myo-card">
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <span style={{ width: 8, height: 8, background: "#FF2A38" }} />
        <div className="myo-card-label">/ What&apos;s broken</div>
      </div>
      <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
        {items.slice(0, max).map((b, i) => (
          <li key={i} style={{ display: "flex", gap: 14, padding: "11px 0", borderTop: i === 0 ? "0" : "1px solid rgba(255,255,255,0.08)", fontSize: 13, color: "#fff", lineHeight: 1.5 }}>
            <span style={{ fontFamily: "var(--font-mono-stack)", fontSize: 10, fontWeight: 700, color: "#FF2A38", flexShrink: 0, paddingTop: 2 }}>0{i + 1}</span>
            <span>{b}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function HivemindTrace({ trace }: { trace: TeaserResult["trace"] }) {
  return (
    <div className="myo-card">
      <div className="myo-card-label">/ Hivemind trace</div>
      <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 6 }}>
        {(["gtm-architect", "genius-strategist", "ghostwriter"] as const).map((p) => {
          const m = PERSONA_META[p];
          return (
            <span key={p} className="myo-chip" style={{ border: `1px solid ${m.color}66`, color: m.color }}>
              {m.mark} {m.name}
            </span>
          );
        })}
      </div>
      <div style={{ marginTop: 14, fontFamily: "var(--font-mono-stack)", fontSize: 10.5, color: "rgba(255,255,255,0.55)", lineHeight: 1.7 }}>
        /// {trace.frameworks.slice(0, 3).map((f) => f.title).join("  /  ")}
      </div>
      <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 8 }}>
        <span className="myo-pulse-dot" style={{ background: trace.mode === "live" ? "#FFFF6A" : "#B1B1B1" }} />
        <span style={{ fontFamily: "var(--font-mono-stack)", fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: trace.mode === "live" ? "#FFFF6A" : "rgba(255,255,255,0.55)" }}>
          {trace.mode === "live" ? "Live Hivemind API" : "Demo mode"}
        </span>
      </div>
    </div>
  );
}

function TeaserScreen(props: {
  teaser: TeaserResult;
  email: string;
  setEmail: (s: string) => void;
  onSubmitEmail: (e: React.FormEvent) => void;
  setTurnstileToken: (t: string | undefined) => void;
  error: string | null;
}) {
  const { teaser } = props;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <ScoreHeader teaser={teaser} />
      <WhatsBroken items={teaser.whatsBroken} max={5} />
      <HivemindTrace trace={teaser.trace} />

      {/* Locked full report: blurred preview + email gate overlay. */}
      <div style={{ position: "relative" }}>
        <div className="myo-locked" aria-hidden>
          <div className="myo-card">
            <div className="myo-card-label">/ Rewritten hero · before → after</div>
            <p style={{ margin: "10px 0 0", fontSize: 14, color: "#fff", lineHeight: 1.5 }}>
              Your homepage hero, rewritten in your founder voice — sharper, category-defining, and
              built around the wedge the strategist found.
            </p>
          </div>
          <div className="myo-card" style={{ marginTop: 12 }}>
            <div className="myo-card-label">/ 5 X posts · LinkedIn · cold DM · 3 growth experiments</div>
            <p style={{ margin: "10px 0 0", fontSize: 13, color: "rgba(255,255,255,0.8)", lineHeight: 1.6 }}>
              Five ready-to-post launch tweets, a LinkedIn post, a cold DM that doesn&apos;t pitch, and
              three growth experiments with hypotheses and metrics. All in your voice.
            </p>
          </div>
        </div>

        <div className="myo-gate">
          <div style={{ fontFamily: "var(--font-mono-stack)", fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--myo-yellow)", marginBottom: 8 }}>
            / Unlock the full teardown
          </div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.85)", lineHeight: 1.5, marginBottom: 14 }}>
            Hero rewrite, 5 X posts, LinkedIn, cold DM, and 3 growth experiments. Free — enter your
            email to unlock.
          </div>
          <form onSubmit={props.onSubmitEmail} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <input
              className="myo-input"
              type="email"
              placeholder="you@company.com"
              value={props.email}
              onChange={(e) => props.setEmail(e.target.value)}
              maxLength={200}
              required
            />
            <Turnstile onToken={props.setTurnstileToken} />
            {props.error && (
              <div className="myo-error">
                {props.error === "disposable_email"
                  ? "/ ERROR: Use a real work email"
                  : props.error === "turnstile_failed"
                    ? "/ ERROR: Verification failed — try again"
                    : props.error === "invalid_email"
                      ? "/ ERROR: Enter a valid email"
                      : `/ ERROR: ${props.error}`}
              </div>
            )}
            <button type="submit" className="myo-btn-primary">UNLOCK THE FULL TEARDOWN →</button>
          </form>
        </div>
      </div>
    </div>
  );
}

function Turnstile({ onToken }: { onToken: (t: string | undefined) => void }) {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  useEffect(() => {
    if (!siteKey) return;
    const id = "cf-turnstile-script";
    if (!document.getElementById(id)) {
      const s = document.createElement("script");
      s.id = id;
      s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js";
      s.async = true;
      s.defer = true;
      document.head.appendChild(s);
    }
  }, [siteKey]);
  if (!siteKey) return null;
  return (
    <div
      className="cf-turnstile"
      data-sitekey={siteKey}
      ref={(el) => {
        const ts = (window as unknown as { turnstile?: { render: (e: HTMLElement, o: unknown) => void } }).turnstile;
        if (el && ts && !el.dataset.rendered) {
          el.dataset.rendered = "1";
          ts.render(el, { callback: (t: string) => onToken(t) });
        }
      }}
    />
  );
}

function BeforeAfter({ label, before, after }: { label: string; before: string; after: string }) {
  return (
    <div className="myo-card">
      <div className="myo-card-label">/ {label}</div>
      <div style={{ marginTop: 10, fontSize: 12.5, color: "rgba(255,255,255,0.5)", lineHeight: 1.5, textDecoration: "line-through" }}>{before}</div>
      <div style={{ marginTop: 8, fontSize: 14, color: "#fff", lineHeight: 1.55, fontWeight: 500 }}>{after}</div>
    </div>
  );
}

function FullScreen({ report, ctaUrl, ctaLabel, onReset }: { report: AutopsyReport; ctaUrl: string; ctaLabel: string; onReset: () => void }) {
  const teaser: TeaserResult = {
    input: report.input,
    overallScore: report.overallScore,
    verdict: report.verdict,
    scorecard: report.scorecard,
    whatsBroken: report.whatsBroken,
    trace: report.trace,
    generatedAt: report.generatedAt,
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div className="myo-unlocked-banner">✓ Full teardown unlocked</div>
      <ScoreHeader teaser={teaser} />
      <WhatsBroken items={report.whatsBroken} max={5} />
      <BeforeAfter label="Homepage hero · before → after" before={report.beforeAfter.homepageHeroBefore} after={report.beforeAfter.homepageHeroAfter} />
      <BeforeAfter label="Positioning · before → after" before={report.beforeAfter.positioningBefore} after={report.beforeAfter.positioningAfter} />

      <div className="myo-card">
        <div className="myo-card-label">/ 5 X posts</div>
        <ul style={{ listStyle: "none", padding: 0, margin: "10px 0 0", display: "flex", flexDirection: "column", gap: 10 }}>
          {report.ghostwriter.xPosts.map((p, i) => (
            <li key={i} style={{ fontSize: 13, color: "#fff", lineHeight: 1.5, paddingBottom: 10, borderBottom: i < report.ghostwriter.xPosts.length - 1 ? "1px solid rgba(255,255,255,0.08)" : "0" }}>{p}</li>
          ))}
        </ul>
      </div>

      <div className="myo-card">
        <div className="myo-card-label">/ LinkedIn post</div>
        <p style={{ margin: "10px 0 0", fontSize: 13, color: "#fff", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{report.ghostwriter.linkedinPost}</p>
      </div>
      <div className="myo-card">
        <div className="myo-card-label">/ Cold DM</div>
        <p style={{ margin: "10px 0 0", fontSize: 13, color: "#fff", lineHeight: 1.6 }}>{report.ghostwriter.coldDm}</p>
      </div>

      <div className="myo-card">
        <div className="myo-card-label">/ 3 growth experiments</div>
        <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 12 }}>
          {report.growthExperiments.map((g, i) => (
            <div key={i} style={{ paddingBottom: 12, borderBottom: i < report.growthExperiments.length - 1 ? "1px solid rgba(255,255,255,0.08)" : "0" }}>
              <div style={{ fontFamily: "var(--font-mono-stack)", fontSize: 12, fontWeight: 700, color: "var(--myo-lime)" }}>{g.name}</div>
              <div style={{ fontSize: 12.5, color: "rgba(255,255,255,0.8)", lineHeight: 1.5, marginTop: 4 }}>{g.hypothesis}</div>
              <div style={{ fontFamily: "var(--font-mono-stack)", fontSize: 10, color: "rgba(255,255,255,0.5)", marginTop: 6 }}>
                {g.effort} · metric: {g.metric}
              </div>
            </div>
          ))}
        </div>
      </div>

      <HivemindTrace trace={report.trace} />

      <div style={{ background: "var(--myo-yellow)", color: "#000", borderRadius: 16, padding: 22, position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: 14, right: 14, opacity: 0.4 }}>
          <Asterisk size={20} color="#000" />
        </div>
        <div style={{ fontFamily: "var(--font-mono-stack)", fontSize: 22, fontWeight: 700, lineHeight: 1.15, textTransform: "uppercase", color: "#000" }}>
          Want the humans<br />behind this?
        </div>
        <div style={{ fontSize: 12.5, color: "rgba(0,0,0,0.75)", lineHeight: 1.55, marginTop: 10 }}>
          This was AI-assembled from the Hivemind persona stack. The real team executes it with you.
        </div>
        <a
          href={ctaUrl}
          target="_top"
          rel="noopener"
          style={{ display: "block", marginTop: 14, padding: "13px 18px", background: "#000", color: "var(--myo-yellow)", textDecoration: "none", textAlign: "center", fontFamily: "var(--font-mono-stack)", fontWeight: 700, fontSize: 12, letterSpacing: "0.14em", textTransform: "uppercase", borderRadius: 999 }}
        >
          {ctaLabel}
        </a>
        <button onClick={onReset} className="myo-reset-btn">/ Run another autopsy</button>
      </div>
    </div>
  );
}

function Asterisk({ size = 14, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden style={{ display: "block" }}>
      <line x1="16" y1="2" x2="16" y2="30" stroke={color} strokeWidth="1.6" />
      <line x1="2" y1="16" x2="30" y2="16" stroke={color} strokeWidth="1.6" />
      <line x1="6" y1="6" x2="26" y2="26" stroke={color} strokeWidth="1.6" />
      <line x1="26" y1="6" x2="6" y2="26" stroke={color} strokeWidth="1.6" />
    </svg>
  );
}

function WidgetStyles() {
  return (
    <style jsx global>{`
      :root {
        --myo-yellow: #ffff6a;
        --myo-black: #000000;
        --myo-white: #ffffff;
        --myo-blue: #6989fe;
        --myo-lime: #acfa52;
        --myo-red: #ff2a38;
        --font-mono-stack: var(--font-mono), "Courier New", monospace;
        --font-body-stack: var(--font-body), "IBM Plex Sans", Arial, sans-serif;
      }
      html, body { background: transparent; margin: 0; padding: 0; }
      .myo-root {
        height: 100vh; display: flex; flex-direction: column;
        background: var(--myo-black); color: var(--myo-white);
        font-family: var(--font-body-stack); overflow: hidden; position: relative;
      }
      .myo-root::before {
        content: ""; position: absolute; inset: 0;
        background-image:
          linear-gradient(to right, rgba(255,255,255,0.025) 1px, transparent 1px),
          linear-gradient(to bottom, rgba(255,255,255,0.025) 1px, transparent 1px);
        background-size: 56px 56px; pointer-events: none; z-index: 0;
      }
      .myo-header, .myo-body, .myo-footer { position: relative; z-index: 1; }
      .myo-header { padding: 14px 18px 0; }
      .myo-header-row { display: flex; align-items: center; justify-content: space-between; padding-bottom: 12px; }
      .myo-brand { display: flex; align-items: center; gap: 8px; }
      .myo-brand-name { font-family: var(--font-mono-stack); font-size: 11px; font-weight: 700; letter-spacing: 0.12em; color: var(--myo-yellow); }
      .myo-brand-slash { color: rgba(255,255,255,0.25); font-family: var(--font-mono-stack); font-size: 11px; }
      .myo-brand-product { font-family: var(--font-mono-stack); font-size: 11px; font-weight: 500; letter-spacing: 0.1em; }
      .myo-annotation { font-family: var(--font-mono-stack); font-size: 9.5px; letter-spacing: 0.12em; color: rgba(255,255,255,0.35); text-transform: uppercase; }
      .myo-hairline { height: 1px; background: rgba(255,255,255,0.18); width: 100%; }
      .myo-footer { padding: 0 18px 12px; }
      .myo-footer-row { display: flex; align-items: center; justify-content: space-between; padding-top: 10px; }
      .myo-body { flex: 1; overflow-y: auto; padding: 22px 20px 24px; scrollbar-width: thin; }
      .myo-body::-webkit-scrollbar { width: 6px; }
      .myo-body::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 6px; }
      .myo-kicker { font-family: var(--font-mono-stack); font-size: 10px; letter-spacing: 0.18em; color: rgba(255,255,255,0.45); text-transform: uppercase; margin-bottom: 14px; }
      .myo-display { font-family: var(--font-mono-stack); font-weight: 700; font-size: 32px; line-height: 0.95; letter-spacing: -0.01em; text-transform: uppercase; color: var(--myo-white); margin: 0; }
      .myo-display em { font-style: normal; color: var(--myo-yellow); }
      .myo-lead { font-family: var(--font-body-stack); font-size: 14px; line-height: 1.55; color: rgba(255,255,255,0.7); margin: 14px 0 22px; }
      .myo-label { font-family: var(--font-mono-stack); font-size: 10px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: rgba(255,255,255,0.55); margin-bottom: 8px; }
      .myo-samples-label { font-family: var(--font-mono-stack); font-size: 10px; letter-spacing: 0.14em; color: rgba(255,255,255,0.4); text-transform: uppercase; margin-right: 4px; }
      .myo-input { width: 100%; background: transparent; border: 0; border-bottom: 1px solid rgba(255,255,255,0.25); padding: 10px 0; color: var(--myo-white); font-size: 15px; font-family: var(--font-body-stack); transition: border-color 120ms ease; border-radius: 0; }
      .myo-input::placeholder { color: rgba(255,255,255,0.35); }
      .myo-input:focus { outline: none; border-bottom-color: var(--myo-yellow); }
      .myo-btn-primary { width: 100%; background: var(--myo-yellow); color: var(--myo-black); font-family: var(--font-mono-stack); font-weight: 700; font-size: 12px; letter-spacing: 0.14em; text-transform: uppercase; padding: 14px 20px; border: 0; border-radius: 999px; cursor: pointer; transition: background 120ms ease, transform 120ms ease; }
      .myo-btn-primary:hover { background: #fff; transform: translateY(-1px); }
      .myo-btn-ghost { width: 100%; background: transparent; color: var(--myo-white); border: 1px solid rgba(255,255,255,0.25); font-family: var(--font-mono-stack); font-weight: 500; font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; padding: 11px 16px; border-radius: 999px; cursor: pointer; transition: background 120ms ease, border-color 120ms ease; }
      .myo-btn-ghost:hover { border-color: var(--myo-yellow); color: var(--myo-yellow); }
      .myo-card { border: 1px solid rgba(255,255,255,0.14); border-radius: 16px; padding: 18px; background: rgba(255,255,255,0.015); position: relative; }
      .myo-card-label { font-family: var(--font-mono-stack); font-size: 10px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: rgba(255,255,255,0.5); }
      .myo-chip { display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: 999px; font-family: var(--font-mono-stack); font-size: 10px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; }
      .myo-error { font-family: var(--font-mono-stack); font-size: 11px; color: #ff2a38; padding: 8px 0; border-top: 1px solid rgba(255,42,56,0.4); border-bottom: 1px solid rgba(255,42,56,0.4); letter-spacing: 0.08em; text-transform: uppercase; }
      .myo-locked { filter: blur(7px); pointer-events: none; user-select: none; opacity: 0.55; }
      .myo-gate { position: absolute; inset: 0; display: flex; flex-direction: column; justify-content: center; padding: 22px; border-radius: 16px; background: linear-gradient(180deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.85) 100%); border: 1px solid rgba(255,255,106,0.4); }
      .myo-unlocked-banner { font-family: var(--font-mono-stack); font-size: 11px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: var(--myo-lime); border: 1px solid rgba(172,250,82,0.4); border-radius: 999px; padding: 8px 14px; text-align: center; }
      .myo-reset-btn { width: 100%; margin-top: 8px; padding: 11px 16px; background: transparent; border: 1px solid rgba(0,0,0,0.4); color: #000; font-family: var(--font-mono-stack); font-weight: 500; font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; cursor: pointer; border-radius: 999px; }
      .myo-pulse-dot { width: 7px; height: 7px; border-radius: 999px; background: #ffff6a; display: inline-block; animation: myoPulse 1.4s ease-in-out infinite; }
      .myo-shimmer-bar { height: 100%; width: 100%; background: linear-gradient(90deg, transparent, var(--myo-yellow), transparent); background-size: 200% 100%; animation: myoShimmer 1.2s linear infinite; }
      @keyframes myoShimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
      @keyframes myoPulse { 0%, 100% { opacity: 0.4; transform: scale(0.85); } 50% { opacity: 1; transform: scale(1); } }
    `}</style>
  );
}
