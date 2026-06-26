"use client";

import { useEffect, useState } from "react";
import type { ReportV2, TeaserV2 } from "@/lib/types";
import { initAnalytics, track } from "@/lib/analytics";

const TEASER_STEPS = ["GTM Architect reading your site", "Diagnosing the narrative", "Scoring against your category"];
const FULL_STEPS = ["Strategist finding the wedge", "Ghostwriter rewriting in your voice", "The swarm compiling your plan"];

const EXAMPLE_URL = "stripe.com";

const HIVEMIND_APP_URL =
  process.env.NEXT_PUBLIC_HIVEMIND_APP_URL || "https://hivemind.myosin.xyz";

type Phase = "idle" | "loadingTeaser" | "teaser" | "scanFailed" | "loadingFull" | "full";

function errorCopy(err: string): string {
  switch (err) {
    case "rate_limited":
      return "/ ERROR: Too many tries. Slow down and retry shortly";
    case "invalid_url":
      return "/ ERROR: Enter a valid company URL";
    case "scan_failed":
      return "/ ERROR: Couldn't read that site. Check the URL and retry";
    case "invalid_email":
      return "/ ERROR: Enter a valid email";
    case "disposable_email":
      return "/ ERROR: Use a real work email";
    case "turnstile_failed":
      return "/ ERROR: Verification failed. Try again";
    default:
      return `/ ERROR: ${err}`;
  }
}

export function WidgetApp() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [stepIdx, setStepIdx] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const [url, setUrl] = useState("");
  const [email, setEmail] = useState("");
  const [teaser, setTeaser] = useState<TeaserV2 | null>(null);
  const [report, setReport] = useState<ReportV2 | null>(null);
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
        body: JSON.stringify({ url: url.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data.teaser) {
        const err = data.error ?? "scan_failed";
        setError(err);
        setPhase(err === "scan_failed" ? "scanFailed" : "idle");
        return;
      }
      const elapsed = Date.now() - t0;
      if (elapsed < 2200) await new Promise((r) => setTimeout(r, 2200 - elapsed));
      setTeaser(data.teaser as TeaserV2);
      setPhase("teaser");
      track("gtm_autopsy_teaser_viewed", { url: url.trim() });
    } catch (err) {
      setError(String(err));
      setPhase("scanFailed");
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
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          url: url.trim(),
          scan: teaser.scan ?? {},
          teaser,
          turnstileToken,
          referrer: typeof document !== "undefined" ? document.referrer || undefined : undefined,
          utm:
            typeof window !== "undefined"
              ? Object.fromEntries(new URLSearchParams(window.location.search))
              : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.report) {
        setError(data.error ?? "capture_failed");
        setPhase("teaser");
        return;
      }
      track("gtm_autopsy_email_captured", { url: url.trim() });
      const elapsed = Date.now() - t0;
      if (elapsed < 2400) await new Promise((r) => setTimeout(r, 2400 - elapsed));
      setReport(data.report as ReportV2);
      setPhase("full");
    } catch (err) {
      setError(String(err));
      setPhase("teaser");
    }
  }

  function reset() {
    setPhase("idle");
    setUrl("");
    setEmail("");
    setTeaser(null);
    setReport(null);
    setTurnstileToken(undefined);
    setStepIdx(0);
    setError(null);
  }

  return (
    <div className="myo-root">
      <div className="myo-body">
        {phase === "idle" && (
          <IdleScreen url={url} setUrl={setUrl} onSubmit={submitUrl} error={error} />
        )}
        {phase === "scanFailed" && (
          <ScanFailedScreen url={url} setUrl={setUrl} onRetry={submitUrl} error={error} />
        )}
        {phase === "loadingTeaser" && (
          <LoadingScreen steps={TEASER_STEPS} idx={stepIdx} title="Reading the room." />
        )}
        {phase === "loadingFull" && (
          <LoadingScreen steps={FULL_STEPS} idx={stepIdx} title="Writing the plan." />
        )}
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
        {phase === "full" && report && teaser && (
          <FullScreen report={report} teaser={teaser} email={email} onReset={reset} />
        )}
      </div>

      <WidgetStyles />
    </div>
  );
}

function IdleScreen(props: {
  url: string;
  setUrl: (s: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  error: string | null;
}) {
  return (
    <div>
      <div className="myo-kicker">/ FREE GTM DIAGNOSTIC · 60 SECONDS</div>
      <h2 className="myo-display" style={{ fontSize: 26 }}>
        Stop sounding like <em>the category.</em>
      </h2>
      <p className="myo-lead" style={{ margin: "10px 0 18px" }}>
        Paste your URL. The Hivemind swarm reads your site the way your market does, names what&apos;s
        broken, and rewrites it. No flattery. The teardown is free.
      </p>

      <form onSubmit={props.onSubmit} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div className="myo-label">/ Company URL</div>
        <input
          className="myo-input"
          placeholder="yourcompany.com"
          value={props.url}
          onChange={(e) => props.setUrl(e.target.value)}
          maxLength={200}
          autoFocus
          required
        />

        {/* Inline error slot, directly below the input. */}
        {props.error && <div className="myo-error">{errorCopy(props.error)}</div>}

        <button type="submit" className="myo-btn-primary" style={{ marginTop: 6 }}>
          RUN AUTOPSY →
        </button>

        <button
          type="button"
          className="myo-text-link"
          onClick={() => props.setUrl(EXAMPLE_URL)}
        >
          try an example → {EXAMPLE_URL}
        </button>
      </form>

      <div style={{ marginTop: 22, paddingTop: 16, borderTop: "1px solid rgba(255,255,255,0.1)" }}>
        <div className="myo-label" style={{ marginBottom: 10 }}>/ Powered by Hivemind</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          <span className="myo-chip myo-chip-accent">▰ GTM Architect</span>
          <span className="myo-chip myo-chip-muted">✦ Strategist</span>
          <span className="myo-chip myo-chip-muted">✎ Ghostwriter</span>
        </div>
      </div>
    </div>
  );
}

function ScanFailedScreen(props: {
  url: string;
  setUrl: (s: string) => void;
  onRetry: (e: React.FormEvent) => void;
  error: string | null;
}) {
  return (
    <div>
      <div className="myo-kicker" style={{ color: "var(--myo-red)" }}>/ COULDN&apos;T READ YOUR SITE</div>
      <h3 className="myo-display" style={{ fontSize: 22 }}>Give it another shot.</h3>
      <p className="myo-lead" style={{ margin: "10px 0 18px" }}>
        We couldn&apos;t scrape that URL. It might be down, blocking bots, or just mistyped. Check it
        and run it again.
      </p>
      <form onSubmit={props.onRetry} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div className="myo-label">/ Company URL</div>
        <input
          className="myo-input"
          placeholder="yourcompany.com"
          value={props.url}
          onChange={(e) => props.setUrl(e.target.value)}
          maxLength={200}
          autoFocus
          required
        />
        {props.error && <div className="myo-error">{errorCopy(props.error)}</div>}
        <button type="submit" className="myo-btn-primary" style={{ marginTop: 6 }}>
          RETRY AUTOPSY →
        </button>
      </form>
    </div>
  );
}

function LoadingScreen({ steps, idx, title }: { steps: string[]; idx: number; title: string }) {
  return (
    <div>
      <div
        className="myo-kicker"
        style={{ color: "var(--myo-yellow)", display: "flex", alignItems: "center", gap: 8 }}
      >
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

function ScoreHeader({ teaser }: { teaser: TeaserV2 }) {
  const score = teaser.overallScore;
  const scoreColor = score >= 60 ? "#FFFF6A" : score >= 35 ? "#FFA22F" : "#FF2A38";
  const scoreLabel = score >= 60 ? "PASSING" : score >= 35 ? "WORK TO DO" : "CRITICAL";
  const company = teaser.scan?.projectName || "Your company";
  const category = teaser.scan?.category?.[0] || "GTM";
  return (
    <div style={{ display: "flex", alignItems: "stretch", border: "1px solid rgba(255,255,255,0.14)", borderRadius: 16, overflow: "hidden" }}>
      <div style={{ width: 132, padding: 18, background: "linear-gradient(180deg, #303030 0%, #1f1f1f 100%)", borderRight: "1px solid rgba(255,255,255,0.14)", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
        <div className="myo-card-label">/ Score</div>
        <div>
          <div style={{ fontFamily: "var(--font-mono-stack)", fontSize: 52, fontWeight: 700, lineHeight: 1, color: scoreColor }}>{score}</div>
          <div style={{ fontFamily: "var(--font-mono-stack)", fontSize: 9, color: "rgba(255,255,255,0.5)", marginTop: 4 }}>/ 100</div>
        </div>
        <div style={{ fontFamily: "var(--font-mono-stack)", fontSize: 9.5, fontWeight: 700, letterSpacing: "0.14em", color: scoreColor }}>{scoreLabel}</div>
      </div>
      <div style={{ flex: 1, padding: 18, display: "flex", flexDirection: "column", justifyContent: "space-between", minWidth: 0 }}>
        <div>
          <div className="myo-card-label">/ {category}</div>
          <div style={{ fontFamily: "var(--font-mono-stack)", fontSize: 18, fontWeight: 700, marginTop: 6, textTransform: "uppercase" }}>{company}</div>
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

function TeaserScreen(props: {
  teaser: TeaserV2;
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

      {/* Locked full report: blurred preview + email gate overlay. */}
      <div style={{ position: "relative" }}>
        <div className="myo-locked" aria-hidden>
          <div className="myo-card">
            <div className="myo-card-label">/ Positioning + hero · before → after</div>
            <p style={{ margin: "10px 0 0", fontSize: 14, color: "#fff", lineHeight: 1.5 }}>
              Your positioning and homepage hero, rewritten in your founder voice. Sharper,
              category-defining, built around the wedge the strategist found.
            </p>
          </div>
          <div className="myo-card" style={{ marginTop: 12 }}>
            <div className="myo-card-label">/ 5 X posts · LinkedIn · cold DM · 3 growth experiments</div>
            <p style={{ margin: "10px 0 0", fontSize: 13, color: "rgba(255,255,255,0.8)", lineHeight: 1.6 }}>
              Five ready-to-post launch tweets, a LinkedIn post, a cold DM that doesn&apos;t pitch, and
              three growth experiments. All grounded in your real site.
            </p>
          </div>
        </div>

        <div className="myo-gate">
          <div style={{ fontFamily: "var(--font-mono-stack)", fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--myo-yellow)", marginBottom: 8 }}>
            / Unlock the full teardown
          </div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.85)", lineHeight: 1.5, marginBottom: 14 }}>
            Rewritten positioning and homepage hero, 5 X posts, a LinkedIn post, a cold DM, and 3
            growth experiments, all grounded in your real site. Free. Enter your email to unlock.
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
            {props.error && <div className="myo-error">{errorCopy(props.error)}</div>}
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

function FullScreen({
  report,
  teaser,
  email,
  onReset,
}: {
  report: ReportV2;
  teaser: TeaserV2;
  email: string;
  onReset: () => void;
}) {
  const signupHref = `${HIVEMIND_APP_URL}/auth/signup?email=${encodeURIComponent(email)}&utm_source=gtm_autopsy`;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div className="myo-unlocked-banner">✓ Full teardown unlocked</div>
      <ScoreHeader teaser={teaser} />
      <WhatsBroken items={teaser.whatsBroken} max={5} />
      <BeforeAfter label="Homepage hero · before → after" before={report.homepageHeroBefore} after={report.homepageHeroAfter} />
      <BeforeAfter label="Positioning · before → after" before={report.positioningBefore} after={report.positioningAfter} />

      <div className="myo-card">
        <div className="myo-card-label">/ 5 X posts</div>
        <ul style={{ listStyle: "none", padding: 0, margin: "10px 0 0", display: "flex", flexDirection: "column", gap: 10 }}>
          {report.xPosts.map((p, i) => (
            <li key={i} style={{ fontSize: 13, color: "#fff", lineHeight: 1.5, paddingBottom: 10, borderBottom: i < report.xPosts.length - 1 ? "1px solid rgba(255,255,255,0.08)" : "0" }}>{p}</li>
          ))}
        </ul>
      </div>

      <div className="myo-card">
        <div className="myo-card-label">/ LinkedIn post</div>
        <p style={{ margin: "10px 0 0", fontSize: 13, color: "#fff", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{report.linkedinPost}</p>
      </div>
      <div className="myo-card">
        <div className="myo-card-label">/ Cold DM</div>
        <p style={{ margin: "10px 0 0", fontSize: 13, color: "#fff", lineHeight: 1.6 }}>{report.coldDm}</p>
      </div>

      <div className="myo-card">
        <div className="myo-card-label">/ 3 growth experiments</div>
        <ul style={{ listStyle: "none", padding: 0, margin: "10px 0 0", display: "flex", flexDirection: "column", gap: 12 }}>
          {report.growthExperiments.map((g, i) => (
            <li key={i} style={{ display: "flex", gap: 14, paddingBottom: 12, borderBottom: i < report.growthExperiments.length - 1 ? "1px solid rgba(255,255,255,0.08)" : "0", fontSize: 12.5, color: "rgba(255,255,255,0.85)", lineHeight: 1.5 }}>
              <span style={{ fontFamily: "var(--font-mono-stack)", fontSize: 11, fontWeight: 700, color: "var(--myo-lime)", flexShrink: 0, paddingTop: 1 }}>0{i + 1}</span>
              <span>{g}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Primary unlock CTA → Hivemind signup with email prefilled. */}
      <div style={{ background: "var(--myo-yellow)", color: "#000", borderRadius: 16, padding: 22, position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: 14, right: 14, opacity: 0.4 }}>
          <Asterisk size={20} color="#000" />
        </div>
        <div style={{ fontFamily: "var(--font-mono-stack)", fontSize: 20, fontWeight: 700, lineHeight: 1.15, textTransform: "uppercase", color: "#000" }}>
          Knowing what&apos;s broken<br />is the easy part.
        </div>
        <div style={{ fontSize: 12.5, color: "rgba(0,0,0,0.75)", lineHeight: 1.55, marginTop: 10 }}>
          Your autopsy is already in your Hivemind workspace. Bring in the swarm and turn it into the
          full plan.
        </div>
        <a
          href={signupHref}
          target="_top"
          rel="noopener"
          style={{ display: "block", marginTop: 14, padding: "13px 18px", background: "#000", color: "var(--myo-yellow)", textDecoration: "none", textAlign: "center", fontFamily: "var(--font-mono-stack)", fontWeight: 700, fontSize: 12, letterSpacing: "0.14em", textTransform: "uppercase", borderRadius: 999 }}
        >
          CREATE A FREE ACCOUNT →
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
        /* Brand-matched to the Hivemind app tokens (app/globals.css):
           --primary #FFFF6A, --background #262626, --text-primary #F6F6F6,
           --status-pink #FF29E8. */
        --myo-yellow: #ffff6a;
        --myo-black: #262626;
        --myo-white: #f6f6f6;
        --myo-blue: #6989fe;
        --myo-lime: #acfa52;
        --myo-pink: #ff29e8;
        --myo-red: #ff2a38;
        --font-mono-stack: var(--font-mono), "Courier New", monospace;
        --font-body-stack: var(--font-body), Inter, Arial, sans-serif;
      }
      /* Transparent throughout so the embedding page supplies the background. */
      html, body { background: transparent; margin: 0; padding: 0; }
      .myo-root {
        min-height: 100vh; display: flex; flex-direction: column;
        background: transparent; color: var(--myo-white);
        font-family: var(--font-body-stack); position: relative;
      }
      .myo-body { flex: 1; overflow-y: auto; padding: 22px 20px 24px; scrollbar-width: thin; }
      .myo-body::-webkit-scrollbar { width: 6px; }
      .myo-body::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 6px; }
      .myo-kicker { font-family: var(--font-mono-stack); font-size: 10px; letter-spacing: 0.18em; color: rgba(255,255,255,0.45); text-transform: uppercase; margin-bottom: 14px; }
      .myo-display { font-family: var(--font-mono-stack); font-weight: 700; font-size: 26px; line-height: 1.0; letter-spacing: -0.01em; text-transform: uppercase; color: var(--myo-white); margin: 0; }
      .myo-display em { font-style: normal; color: var(--myo-yellow); }
      .myo-lead { font-family: var(--font-body-stack); font-size: 13.5px; line-height: 1.55; color: rgba(255,255,255,0.7); margin: 14px 0 22px; }
      .myo-label { font-family: var(--font-mono-stack); font-size: 10px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: rgba(255,255,255,0.55); margin-bottom: 8px; }
      .myo-input { width: 100%; background: transparent; border: 0; border-bottom: 1px solid rgba(255,255,255,0.25); padding: 10px 0; color: var(--myo-white); font-size: 15px; font-family: var(--font-body-stack); transition: border-color 120ms ease; border-radius: 0; }
      .myo-input::placeholder { color: rgba(255,255,255,0.35); }
      .myo-input:focus { outline: none; border-bottom-color: var(--myo-yellow); }
      .myo-btn-primary { width: 100%; background: var(--myo-yellow); color: var(--myo-black); font-family: var(--font-mono-stack); font-weight: 700; font-size: 12px; letter-spacing: 0.14em; text-transform: uppercase; padding: 14px 20px; border: 0; border-radius: 999px; cursor: pointer; transition: background 120ms ease, transform 120ms ease; }
      .myo-btn-primary:hover { background: #fff; transform: translateY(-1px); }
      .myo-text-link { background: transparent; border: 0; color: rgba(255,255,255,0.5); font-family: var(--font-mono-stack); font-size: 10.5px; letter-spacing: 0.1em; text-transform: uppercase; cursor: pointer; padding: 4px 0; text-align: center; transition: color 120ms ease; }
      .myo-text-link:hover { color: var(--myo-yellow); }
      .myo-card { border: 1px solid rgba(255,255,255,0.14); border-radius: 16px; padding: 18px; background: rgba(255,255,255,0.015); position: relative; }
      .myo-card-label { font-family: var(--font-mono-stack); font-size: 10px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: rgba(255,255,255,0.5); }
      .myo-chip { display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: 999px; font-family: var(--font-mono-stack); font-size: 10px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; }
      .myo-chip-accent { border: 1px solid rgba(255,255,106,0.5); color: var(--myo-yellow); }
      .myo-chip-muted { border: 1px solid rgba(255,255,255,0.25); color: rgba(255,255,255,0.6); }
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
