"use client";

import { useEffect, useState } from "react";
import type { AutopsyInput, AutopsyReport, Category } from "@/lib/types";

const CATEGORIES: Category[] = ["DeFi", "AI infra", "consumer crypto", "devtool", "agency", "other"];

const PERSONA_META: Record<string, { name: string; color: string; mark: string }> = {
  "gtm-architect": { name: "GTM ARCHITECT", color: "#6989FE", mark: "▰" },
  "genius-strategist": { name: "GENIUS STRATEGIST", color: "#FF29E8", mark: "✦" },
  "ghostwriter": { name: "GHOSTWRITER", color: "#ACFA52", mark: "✎" },
};

const STEPS = [
  "Reading the homepage",
  "Pulling Hivemind frameworks",
  "Running GTM Architect diagnosis",
  "Finding the strategic wedge",
  "Rewriting with Ghostwriter",
  "Compiling the autopsy",
];

const BINARY_NOISE = ["00 0 01", "0 10 01", "0 01 00 0", "1 00 10 1", "00 1 010"];

type Phase = "idle" | "loading" | "done";

export function WidgetApp({
  ctaUrl,
  ctaLabel,
}: {
  ctaUrl: string;
  ctaLabel: string;
}) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [report, setReport] = useState<AutopsyReport | null>(null);
  const [stepIdx, setStepIdx] = useState(0);
  const [apiDone, setApiDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [companyName, setCompanyName] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [twitterHandle, setTwitterHandle] = useState("");
  const [category, setCategory] = useState<Category>("AI infra");

  useEffect(() => {
    if (phase !== "loading") return;
    if (apiDone) {
      setStepIdx(STEPS.length);
      return;
    }
    if (stepIdx >= STEPS.length - 1) return;
    const t = setTimeout(() => setStepIdx(i => Math.min(STEPS.length - 1, i + 1)), 700 + stepIdx * 200);
    return () => clearTimeout(t);
  }, [phase, stepIdx, apiDone]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!companyName || !websiteUrl) return;
    const input: AutopsyInput = {
      companyName: companyName.trim(),
      websiteUrl: websiteUrl.trim(),
      twitterHandle: twitterHandle.trim().replace(/^@/, "") || undefined,
      category,
    };
    setError(null);
    setPhase("loading");
    setStepIdx(0);
    setApiDone(false);
    const t0 = Date.now();
    let result: AutopsyReport | null = null;
    let err: string | null = null;
    try {
      const res = await fetch("/api/autopsy", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(input),
      });
      const data = await res.json();
      if (!res.ok || !data.report) {
        err = data.error ?? "autopsy_failed";
      } else {
        result = data.report as AutopsyReport;
      }
    } catch (e) {
      err = String(e);
    }
    const elapsed = Date.now() - t0;
    if (elapsed < 4200) await new Promise(r => setTimeout(r, 4200 - elapsed));
    setApiDone(true);
    if (err) {
      setError(err);
      setPhase("idle");
      return;
    }
    setReport(result);
    setTimeout(() => setPhase("done"), 250);
  }

  function fillSample() {
    setCompanyName("Vaultline");
    setWebsiteUrl("vaultline.xyz");
    setTwitterHandle("vaultline");
    setCategory("DeFi");
  }

  function reset() {
    setReport(null);
    setPhase("idle");
    setStepIdx(0);
    setApiDone(false);
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
            companyName={companyName}
            setCompanyName={setCompanyName}
            websiteUrl={websiteUrl}
            setWebsiteUrl={setWebsiteUrl}
            twitterHandle={twitterHandle}
            setTwitterHandle={setTwitterHandle}
            category={category}
            setCategory={setCategory}
            onSubmit={submit}
            onSample={fillSample}
            error={error}
          />
        )}

        {phase === "loading" && <LoadingScreen idx={stepIdx} />}

        {phase === "done" && report && (
          <ReportScreen report={report} ctaUrl={ctaUrl} ctaLabel={ctaLabel} onReset={reset} />
        )}
      </div>

      <footer className="myo-footer">
        <div className="myo-hairline" />
        <div className="myo-footer-row">
          <span className="myo-annotation">2025 / MYOSIN</span>
          <span className="myo-annotation">{BINARY_NOISE[2]}</span>
        </div>
      </footer>

      <style jsx global>{`
        :root {
          --myo-yellow: #FFFF6A;
          --myo-warm: #D7D6C8;
          --myo-mid: #B1B1B1;
          --myo-black: #000000;
          --myo-white: #FFFFFF;
          --myo-bg: #E9E8E8;
          --myo-blue: #6989FE;
          --myo-lime: #ACFA52;
          --myo-orange: #FFA22F;
          --myo-magenta: #FF29E8;
          --myo-red: #FF2A38;
          --font-display: var(--font-mono), "Courier New", monospace;
          --font-mono-stack: var(--font-mono), "Courier New", monospace;
          --font-body-stack: var(--font-body), "IBM Plex Sans", Arial, sans-serif;
        }
        html, body {
          background: transparent;
          margin: 0;
          padding: 0;
        }
        .myo-root {
          height: 100vh;
          display: flex;
          flex-direction: column;
          background: var(--myo-black);
          color: var(--myo-white);
          font-family: var(--font-body-stack);
          overflow: hidden;
          position: relative;
        }
        .myo-root::before {
          content: "";
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(to right, rgba(255,255,255,0.025) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255,255,255,0.025) 1px, transparent 1px);
          background-size: 56px 56px;
          pointer-events: none;
          z-index: 0;
        }
        .myo-header, .myo-body, .myo-footer { position: relative; z-index: 1; }
        .myo-header { padding: 14px 18px 0; }
        .myo-header-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-bottom: 12px;
        }
        .myo-brand { display: flex; align-items: center; gap: 8px; }
        .myo-brand-name {
          font-family: var(--font-mono-stack);
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.12em;
          color: var(--myo-yellow);
        }
        .myo-brand-slash { color: rgba(255,255,255,0.25); font-family: var(--font-mono-stack); font-size: 11px; }
        .myo-brand-product {
          font-family: var(--font-mono-stack);
          font-size: 11px;
          font-weight: 500;
          letter-spacing: 0.1em;
          color: var(--myo-white);
        }
        .myo-annotation {
          font-family: var(--font-mono-stack);
          font-size: 9.5px;
          letter-spacing: 0.12em;
          color: rgba(255,255,255,0.35);
          text-transform: uppercase;
        }
        .myo-hairline { height: 1px; background: rgba(255,255,255,0.18); width: 100%; }
        .myo-footer { padding: 0 18px 12px; }
        .myo-footer-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-top: 10px;
        }
        .myo-body {
          flex: 1;
          overflow-y: auto;
          padding: 22px 20px 24px;
          scrollbar-width: thin;
        }
        .myo-body::-webkit-scrollbar { width: 6px; }
        .myo-body::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 6px; }

        .myo-display {
          font-family: var(--font-mono-stack);
          font-weight: 700;
          font-size: 32px;
          line-height: 0.95;
          letter-spacing: -0.01em;
          text-transform: uppercase;
          color: var(--myo-white);
          margin: 0;
        }
        .myo-display em {
          font-style: normal;
          color: var(--myo-yellow);
        }
        .myo-lead {
          font-family: var(--font-body-stack);
          font-size: 14px;
          line-height: 1.55;
          color: rgba(255,255,255,0.7);
          margin: 14px 0 22px;
        }
        .myo-label {
          font-family: var(--font-mono-stack);
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: rgba(255,255,255,0.55);
          margin-bottom: 8px;
        }
        .myo-input,
        .myo-select {
          width: 100%;
          background: transparent;
          border: 0;
          border-bottom: 1px solid rgba(255,255,255,0.25);
          padding: 10px 0;
          color: var(--myo-white);
          font-size: 15px;
          font-family: var(--font-body-stack);
          transition: border-color 120ms ease;
          appearance: none;
          border-radius: 0;
        }
        .myo-input::placeholder { color: rgba(255,255,255,0.35); }
        .myo-input:focus,
        .myo-select:focus {
          outline: none;
          border-bottom-color: var(--myo-yellow);
        }
        .myo-select {
          background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'><path d='M1 1l5 5 5-5' stroke='white' stroke-width='1.2' fill='none'/></svg>");
          background-repeat: no-repeat;
          background-position: right 4px center;
          padding-right: 22px;
        }
        .myo-select option { background: #000; color: #fff; }
        .myo-btn-primary {
          width: 100%;
          background: var(--myo-yellow);
          color: var(--myo-black);
          font-family: var(--font-mono-stack);
          font-weight: 700;
          font-size: 12px;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          padding: 14px 20px;
          border: 0;
          border-radius: 999px;
          cursor: pointer;
          transition: background 120ms ease, transform 120ms ease;
        }
        .myo-btn-primary:hover {
          background: #fff;
          transform: translateY(-1px);
        }
        .myo-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
        .myo-btn-ghost {
          width: 100%;
          background: transparent;
          color: var(--myo-white);
          border: 1px solid rgba(255,255,255,0.25);
          font-family: var(--font-mono-stack);
          font-weight: 500;
          font-size: 11px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          padding: 11px 16px;
          border-radius: 999px;
          cursor: pointer;
          transition: background 120ms ease, border-color 120ms ease;
        }
        .myo-btn-ghost:hover { border-color: var(--myo-yellow); color: var(--myo-yellow); }
        .myo-card {
          border: 1px solid rgba(255,255,255,0.14);
          border-radius: 16px;
          padding: 18px;
          background: rgba(255,255,255,0.015);
          position: relative;
        }
        .myo-card-label {
          font-family: var(--font-mono-stack);
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: rgba(255,255,255,0.5);
        }
        .myo-chip {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px;
          border-radius: 999px;
          font-family: var(--font-mono-stack);
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
        }
        @keyframes myoShimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        @keyframes myoPulse {
          0%, 100% { opacity: 0.4; transform: scale(0.85); }
          50% { opacity: 1; transform: scale(1); }
        }
      `}</style>
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

function IdleScreen(props: {
  companyName: string;
  setCompanyName: (s: string) => void;
  websiteUrl: string;
  setWebsiteUrl: (s: string) => void;
  twitterHandle: string;
  setTwitterHandle: (s: string) => void;
  category: Category;
  setCategory: (c: Category) => void;
  onSubmit: (e: React.FormEvent) => void;
  onSample: () => void;
  error: string | null;
}) {
  return (
    <div>
      <div style={{ fontFamily: "var(--font-mono-stack)", fontSize: 10, letterSpacing: "0.18em", color: "rgba(255,255,255,0.45)", textTransform: "uppercase", marginBottom: 14 }}>
        / FREE DIAGNOSTIC · 60 SECONDS
      </div>
      <h2 className="myo-display">
        Stop sounding<br />
        like the <em>category.</em>
      </h2>
      <p className="myo-lead">
        Three HiveMind personas read your homepage, X, and category. They diagnose what's broken, find your wedge, and rewrite your hero. Brutally honest. Free.
      </p>

      <form onSubmit={props.onSubmit} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <div>
          <div className="myo-label">/ Company</div>
          <input className="myo-input" placeholder="Vaultline" value={props.companyName} onChange={e => props.setCompanyName(e.target.value)} maxLength={80} required />
        </div>
        <div>
          <div className="myo-label">/ Website</div>
          <input className="myo-input" placeholder="vaultline.xyz" value={props.websiteUrl} onChange={e => props.setWebsiteUrl(e.target.value)} maxLength={200} required />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
          <div>
            <div className="myo-label">/ X handle (opt)</div>
            <input className="myo-input" placeholder="vaultline" value={props.twitterHandle} onChange={e => props.setTwitterHandle(e.target.value)} maxLength={40} />
          </div>
          <div>
            <div className="myo-label">/ Category</div>
            <select className="myo-select" value={props.category} onChange={e => props.setCategory(e.target.value as Category)}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        {props.error && (
          <div style={{ fontFamily: "var(--font-mono-stack)", fontSize: 11, color: "#FF2A38", padding: "8px 0", borderTop: "1px solid rgba(255,42,56,0.4)", borderBottom: "1px solid rgba(255,42,56,0.4)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
            {props.error === "missing_required_fields" ? "/ ERROR: Company and website required" : `/ ERROR: ${props.error}`}
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 4 }}>
          <button type="submit" className="myo-btn-primary">RUN AUTOPSY →</button>
          <button type="button" onClick={props.onSample} className="myo-btn-ghost">/ Try a sample</button>
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

function LoadingScreen({ idx }: { idx: number }) {
  return (
    <div>
      <div style={{ fontFamily: "var(--font-mono-stack)", fontSize: 10, letterSpacing: "0.18em", color: "var(--myo-yellow)", textTransform: "uppercase", marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ width: 7, height: 7, borderRadius: 999, background: "#FFFF6A", animation: "myoPulse 1.4s ease-in-out infinite" }} />
        / RUNNING
      </div>
      <h3 className="myo-display" style={{ fontSize: 24 }}>
        Hivemind is<br />
        <em>on it.</em>
      </h3>
      <p className="myo-lead" style={{ margin: "12px 0 22px" }}>
        Six steps. About 10 seconds. Stay.
      </p>

      <ol style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 0 }}>
        {STEPS.map((label, i) => {
          const state = i < idx ? "done" : i === idx ? "active" : "pending";
          return (
            <li
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                padding: "12px 0",
                borderBottom: i < STEPS.length - 1 ? "1px solid rgba(255,255,255,0.1)" : "0",
              }}
            >
              <span
                style={{
                  fontFamily: "var(--font-mono-stack)",
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: "0.1em",
                  color: state === "done" ? "var(--myo-yellow)" : state === "active" ? "#fff" : "rgba(255,255,255,0.3)",
                  width: 28,
                  flexShrink: 0,
                }}
              >
                {String(i + 1).padStart(2, "0")}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontFamily: "var(--font-body-stack)",
                    fontSize: 13.5,
                    color: state === "pending" ? "rgba(255,255,255,0.35)" : "#fff",
                    fontWeight: 500,
                  }}
                >
                  {label}
                </div>
                {state === "active" && (
                  <div style={{ marginTop: 8, height: 2, width: "100%", background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
                    <div style={{ height: "100%", width: "100%", background: "linear-gradient(90deg, transparent, var(--myo-yellow), transparent)", backgroundSize: "200% 100%", animation: "myoShimmer 1.2s linear infinite" }} />
                  </div>
                )}
              </div>
              <span
                style={{
                  fontFamily: "var(--font-mono-stack)",
                  fontSize: 9.5,
                  letterSpacing: "0.08em",
                  color: state === "done" ? "var(--myo-yellow)" : "rgba(255,255,255,0.35)",
                }}
              >
                {state === "done" ? "✓ OK" : state === "active" ? "..." : ""}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function ReportScreen({ report, ctaUrl, ctaLabel, onReset }: { report: AutopsyReport; ctaUrl: string; ctaLabel: string; onReset: () => void }) {
  const score = report.overallScore;
  const scoreColor = score >= 60 ? "#FFFF6A" : score >= 35 ? "#FFA22F" : "#FF2A38";
  const scoreLabel = score >= 60 ? "PASSING" : score >= 35 ? "WORK TO DO" : "CRITICAL";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div className="myo-card" style={{ padding: 0, overflow: "hidden", border: 0 }}>
        <div style={{ display: "flex", alignItems: "stretch", gap: 0, border: "1px solid rgba(255,255,255,0.14)", borderRadius: 16, overflow: "hidden" }}>
          <div
            style={{
              width: 132,
              padding: 18,
              background: "linear-gradient(180deg, #1a1a1a 0%, #000 100%)",
              borderRight: "1px solid rgba(255,255,255,0.14)",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
          >
            <div className="myo-card-label">/ Score</div>
            <div>
              <div style={{ fontFamily: "var(--font-mono-stack)", fontSize: 52, fontWeight: 700, lineHeight: 1, color: scoreColor, letterSpacing: "-0.02em" }}>
                {score}
              </div>
              <div style={{ fontFamily: "var(--font-mono-stack)", fontSize: 9, letterSpacing: "0.12em", color: "rgba(255,255,255,0.5)", marginTop: 4 }}>
                / 100
              </div>
            </div>
            <div style={{ fontFamily: "var(--font-mono-stack)", fontSize: 9.5, fontWeight: 700, letterSpacing: "0.14em", color: scoreColor }}>
              {scoreLabel}
            </div>
          </div>
          <div style={{ flex: 1, padding: 18, display: "flex", flexDirection: "column", justifyContent: "space-between", minWidth: 0 }}>
            <div>
              <div className="myo-card-label">/ {report.input.category}</div>
              <div style={{ fontFamily: "var(--font-mono-stack)", fontSize: 18, fontWeight: 700, marginTop: 6, letterSpacing: "-0.01em", textTransform: "uppercase" }}>
                {report.input.companyName}
              </div>
            </div>
            <div style={{ fontSize: 12.5, color: "rgba(255,255,255,0.78)", lineHeight: 1.5, marginTop: 10 }}>
              {report.verdict}
            </div>
          </div>
        </div>
      </div>

      <div className="myo-card">
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <span style={{ width: 8, height: 8, background: "#FF2A38" }} />
          <div className="myo-card-label">/ What's broken</div>
        </div>
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 0 }}>
          {report.whatsBroken.slice(0, 3).map((b, i) => (
            <li key={i} style={{ display: "flex", gap: 14, padding: "11px 0", borderTop: i === 0 ? "0" : "1px solid rgba(255,255,255,0.08)", fontSize: 13, color: "#fff", lineHeight: 1.5 }}>
              <span style={{ fontFamily: "var(--font-mono-stack)", fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", color: "#FF2A38", flexShrink: 0, paddingTop: 2 }}>
                0{i + 1}
              </span>
              <span>{b}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="myo-card" style={{ border: "1px solid rgba(255,255,106,0.45)", background: "rgba(255,255,106,0.04)" }}>
        <div className="myo-card-label" style={{ color: "var(--myo-yellow)" }}>/ Rewritten hero · preview</div>
        <p style={{ margin: "12px 0 0", fontSize: 14, color: "#fff", lineHeight: 1.55, fontWeight: 500 }}>
          {report.beforeAfter.homepageHeroAfter}
        </p>
      </div>

      <div className="myo-card">
        <div className="myo-card-label">/ Hivemind trace</div>
        <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 6 }}>
          {report.trace.personasUsed.map(p => {
            const m = PERSONA_META[p];
            if (!m) return null;
            return (
              <span key={p} className="myo-chip" style={{ border: `1px solid ${m.color}66`, color: m.color }}>
                {m.mark} {m.name}
              </span>
            );
          })}
        </div>
        <div style={{ marginTop: 14, fontFamily: "var(--font-mono-stack)", fontSize: 10.5, color: "rgba(255,255,255,0.55)", lineHeight: 1.7, letterSpacing: "0.04em" }}>
          /// {report.trace.frameworks.slice(0, 3).map(f => f.title).join("  /  ")}
        </div>
        <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: 999,
              background: report.trace.mode === "live" ? "#FFFF6A" : "#B1B1B1",
              animation: "myoPulse 1.4s ease-in-out infinite",
            }}
          />
          <span style={{ fontFamily: "var(--font-mono-stack)", fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: report.trace.mode === "live" ? "#FFFF6A" : "rgba(255,255,255,0.55)" }}>
            {report.trace.mode === "live" ? "Live Hivemind API" : "Demo mode"}
          </span>
        </div>
      </div>

      <div
        style={{
          background: "var(--myo-yellow)",
          color: "#000",
          borderRadius: 16,
          padding: 22,
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div style={{ position: "absolute", top: 14, right: 14, opacity: 0.4 }}>
          <Asterisk size={20} color="#000" />
        </div>
        <div style={{ fontFamily: "var(--font-mono-stack)", fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(0,0,0,0.55)", marginBottom: 8 }}>
          / That was the teaser
        </div>
        <div style={{ fontFamily: "var(--font-mono-stack)", fontSize: 22, fontWeight: 700, lineHeight: 1.15, textTransform: "uppercase", letterSpacing: "-0.01em", color: "#000" }}>
          Hire the<br />
          full plan.
        </div>
        <div style={{ fontSize: 12.5, color: "rgba(0,0,0,0.75)", lineHeight: 1.55, marginTop: 10 }}>
          5 rewritten posts. 3 growth experiments. A 30-day execution calendar. Real humans behind the personas.
        </div>
        <a
          href={ctaUrl}
          target="_top"
          rel="noopener"
          style={{
            display: "block",
            marginTop: 14,
            padding: "13px 18px",
            background: "#000",
            color: "var(--myo-yellow)",
            textDecoration: "none",
            textAlign: "center",
            fontFamily: "var(--font-mono-stack)",
            fontWeight: 700,
            fontSize: 12,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            borderRadius: 999,
            border: "1px solid #000",
          }}
        >
          {ctaLabel}
        </a>
        <button
          onClick={onReset}
          style={{
            width: "100%",
            marginTop: 8,
            padding: "11px 16px",
            background: "transparent",
            border: "1px solid rgba(0,0,0,0.4)",
            color: "#000",
            fontFamily: "var(--font-mono-stack)",
            fontWeight: 500,
            fontSize: 11,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            cursor: "pointer",
            borderRadius: 999,
          }}
        >
          / Run another autopsy
        </button>
      </div>
    </div>
  );
}
