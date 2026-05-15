"use client";

import { useEffect, useState } from "react";
import type { AutopsyInput, AutopsyReport, Category } from "@/lib/types";
import { ScoreRing } from "./ScoreRing";
import { Logo } from "./Logo";

const CATEGORIES: Category[] = ["DeFi", "AI infra", "consumer crypto", "devtool", "agency", "other"];

const PERSONA_META: Record<string, { name: string; color: string; emoji: string }> = {
  "gtm-architect": { name: "GTM Architect", color: "#22D3EE", emoji: "▰" },
  "genius-strategist": { name: "Genius Strategist", color: "#8B5CF6", emoji: "◆" },
  "ghostwriter": { name: "Ghostwriter", color: "#A3E635", emoji: "✎" },
};

const STEPS = [
  { label: "Pulling public signals" },
  { label: "Retrieving Hivemind frameworks" },
  { label: "Running GTM Architect diagnosis" },
  { label: "Finding strategic wedge" },
  { label: "Rewriting with Ghostwriter" },
  { label: "Generating report" },
];

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
    <div className="widget-root">
      <header className="widget-header">
        <div className="widget-brand">
          <Logo className="h-5 w-5" />
          <div>
            <div className="widget-title">GTM Autopsy</div>
            <div className="widget-sub">by Hivemind</div>
          </div>
        </div>
        <span className="widget-pill">60-sec teardown</span>
      </header>

      <div className="widget-body">
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

      <style jsx global>{`
        html, body {
          background: transparent;
          margin: 0;
          padding: 0;
        }
        .widget-root {
          height: 100vh;
          display: flex;
          flex-direction: column;
          background:
            radial-gradient(600px 400px at 80% -10%, rgba(139,92,246,0.22), transparent 60%),
            radial-gradient(500px 350px at -10% 110%, rgba(34,211,238,0.14), transparent 60%),
            #07070b;
          color: #eceef5;
          font-family: ui-sans-serif, system-ui, -apple-system, Inter, "Helvetica Neue", Arial;
          overflow: hidden;
        }
        .widget-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 18px;
          border-bottom: 1px solid rgba(255,255,255,0.06);
          background: rgba(7,7,11,0.6);
          backdrop-filter: blur(8px);
        }
        .widget-brand {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .widget-title {
          font-size: 14px;
          font-weight: 600;
          letter-spacing: -0.01em;
        }
        .widget-sub {
          font-size: 10px;
          color: rgba(255,255,255,0.45);
          letter-spacing: 0.06em;
          text-transform: uppercase;
        }
        .widget-pill {
          font-size: 10px;
          padding: 4px 8px;
          border-radius: 999px;
          background: rgba(139,92,246,0.14);
          border: 1px solid rgba(139,92,246,0.35);
          color: #d8d2ff;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          font-weight: 600;
        }
        .widget-body {
          flex: 1;
          overflow-y: auto;
          padding: 18px;
          scrollbar-width: thin;
        }
        .widget-body::-webkit-scrollbar {
          width: 6px;
        }
        .widget-body::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.1);
          border-radius: 6px;
        }
        .w-label {
          font-size: 10px;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: #8a8da0;
          margin-bottom: 6px;
        }
        .w-input,
        .w-select {
          width: 100%;
          background: rgba(7,7,11,0.65);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 10px;
          padding: 10px 12px;
          color: #eceef5;
          font-size: 13px;
          font-family: inherit;
          transition: border-color 120ms ease, box-shadow 120ms ease;
        }
        .w-input:focus,
        .w-select:focus {
          outline: none;
          border-color: rgba(139,92,246,0.6);
          box-shadow: 0 0 0 3px rgba(139,92,246,0.14);
        }
        .w-btn-primary {
          width: 100%;
          background: linear-gradient(135deg, #8b5cf6, #6d28d9);
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 10px;
          padding: 11px 16px;
          font-size: 14px;
          font-weight: 600;
          color: white;
          cursor: pointer;
          box-shadow: 0 0 0 1px rgba(139,92,246,0.3), 0 14px 30px -10px rgba(139,92,246,0.5);
          transition: transform 120ms ease;
        }
        .w-btn-primary:hover { transform: translateY(-1px); }
        .w-btn-primary:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
        .w-btn-ghost {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 10px;
          padding: 8px 12px;
          font-size: 12px;
          color: #d6d8e3;
          cursor: pointer;
        }
        .w-card {
          background: rgba(19,20,27,0.7);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 14px;
          padding: 14px;
        }
        .w-chip {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 3px 8px;
          border-radius: 999px;
          font-size: 10px;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          font-weight: 600;
        }
        @keyframes wShimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        @keyframes wPulse {
          0%, 100% { opacity: 0.35; transform: scale(0.9); }
          50% { opacity: 1; transform: scale(1.05); }
        }
      `}</style>
    </div>
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
      <h2 style={{ fontSize: 22, fontWeight: 600, lineHeight: 1.15, letterSpacing: "-0.015em", margin: 0 }}>
        Paste a URL.{" "}
        <span style={{ background: "linear-gradient(90deg,#8B5CF6,#22D3EE)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
          Get a GTM teardown
        </span>
        .
      </h2>
      <p style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", margin: "8px 0 16px", lineHeight: 1.5 }}>
        Three Hivemind personas diagnose your positioning, ICP, narrative, and distribution — in 60 seconds.
      </p>

      <form onSubmit={props.onSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div>
          <div className="w-label">Company</div>
          <input className="w-input" placeholder="Vaultline" value={props.companyName} onChange={e => props.setCompanyName(e.target.value)} maxLength={80} required />
        </div>
        <div>
          <div className="w-label">Website</div>
          <input className="w-input" placeholder="vaultline.xyz" value={props.websiteUrl} onChange={e => props.setWebsiteUrl(e.target.value)} maxLength={200} required />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <div className="w-label">X handle (optional)</div>
            <input className="w-input" placeholder="vaultline" value={props.twitterHandle} onChange={e => props.setTwitterHandle(e.target.value)} maxLength={40} />
          </div>
          <div>
            <div className="w-label">Category</div>
            <select className="w-select" value={props.category} onChange={e => props.setCategory(e.target.value as Category)}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        {props.error && (
          <div style={{ fontSize: 12, color: "#fda4af", padding: "8px 10px", background: "rgba(244,63,94,0.1)", border: "1px solid rgba(244,63,94,0.3)", borderRadius: 8 }}>
            {props.error === "missing_required_fields" ? "Please fill in all fields." : `Failed: ${props.error}`}
          </div>
        )}

        <button type="submit" className="w-btn-primary">Run GTM Autopsy →</button>
        <button type="button" onClick={props.onSample} className="w-btn-ghost" style={{ width: "100%" }}>
          Try a sample
        </button>
      </form>

      <div style={{ marginTop: 16, display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "center" }}>
        <span className="w-chip" style={{ background: "rgba(34,211,238,0.1)", border: "1px solid rgba(34,211,238,0.35)", color: "#a5edf6" }}>GTM Architect</span>
        <span className="w-chip" style={{ background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.35)", color: "#d8d2ff" }}>Genius Strategist</span>
        <span className="w-chip" style={{ background: "rgba(163,230,53,0.1)", border: "1px solid rgba(163,230,53,0.4)", color: "#d3f4a4" }}>Ghostwriter</span>
      </div>
    </div>
  );
}

function LoadingScreen({ idx }: { idx: number }) {
  return (
    <div style={{ paddingTop: 4 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ width: 8, height: 8, borderRadius: 999, background: "#8B5CF6", animation: "wPulse 1.4s ease-in-out infinite" }} />
        <div className="w-label" style={{ margin: 0 }}>Hivemind is on it</div>
      </div>
      <h3 style={{ margin: "8px 0 4px", fontSize: 18, fontWeight: 600 }}>
        Running the call chain…
      </h3>
      <p style={{ margin: 0, fontSize: 12, color: "rgba(255,255,255,0.55)" }}>
        Six steps · ~10 seconds.
      </p>

      <ol style={{ listStyle: "none", padding: 0, margin: "16px 0 0", display: "flex", flexDirection: "column", gap: 10 }}>
        {STEPS.map((s, i) => {
          const state = i < idx ? "done" : i === idx ? "active" : "pending";
          return (
            <li key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
              <span
                style={{
                  width: 20, height: 20, borderRadius: 999,
                  border: state === "done" ? "1px solid rgba(163,230,53,0.4)" : state === "active" ? "1px solid rgba(139,92,246,0.6)" : "1px solid rgba(255,255,255,0.1)",
                  background: state === "done" ? "rgba(163,230,53,0.2)" : state === "active" ? "rgba(139,92,246,0.2)" : "rgba(255,255,255,0.02)",
                  color: state === "done" ? "#A3E635" : "#ffffff",
                  fontSize: 10,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0, marginTop: 1,
                }}
              >
                {state === "done" ? "✓" : state === "active" ? <span style={{ width: 6, height: 6, borderRadius: 999, background: "#8B5CF6", animation: "wPulse 1.4s ease-in-out infinite" }} /> : i + 1}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, color: state === "pending" ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.95)", fontWeight: 500 }}>
                  {s.label}
                </div>
                {state === "active" && (
                  <div style={{ marginTop: 6, height: 3, width: 140, background: "rgba(255,255,255,0.05)", borderRadius: 999, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: "100%", background: "linear-gradient(90deg, transparent, #8B5CF6, transparent)", backgroundSize: "200% 100%", animation: "wShimmer 1.2s linear infinite" }} />
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function ReportScreen({ report, ctaUrl, ctaLabel, onReset }: { report: AutopsyReport; ctaUrl: string; ctaLabel: string; onReset: () => void }) {
  const score = report.overallScore;
  const scoreColor = score >= 70 ? "#A3E635" : score >= 50 ? "#22D3EE" : score >= 35 ? "#F59E0B" : "#F43F5E";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div className="w-card" style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <ScoreRing score={score} size={90} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <div className="w-label" style={{ margin: 0 }}>{report.input.category}</div>
          <div style={{ fontSize: 16, fontWeight: 600, marginTop: 2 }}>{report.input.companyName}</div>
          <div style={{ marginTop: 6, fontSize: 12, color: "rgba(255,255,255,0.7)", lineHeight: 1.4 }}>
            {report.verdict}
          </div>
        </div>
      </div>

      <div className="w-card">
        <div className="w-label">What's broken</div>
        <ul style={{ listStyle: "none", padding: 0, margin: "8px 0 0", display: "flex", flexDirection: "column", gap: 8 }}>
          {report.whatsBroken.slice(0, 3).map((b, i) => (
            <li key={i} style={{ display: "flex", gap: 8, fontSize: 12.5, color: "rgba(255,255,255,0.85)", lineHeight: 1.45 }}>
              <span style={{ width: 6, height: 6, borderRadius: 999, background: "rgba(244,63,94,0.85)", marginTop: 7, flexShrink: 0 }} />
              <span>{b}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="w-card" style={{ borderColor: "rgba(139,92,246,0.3)", background: "rgba(139,92,246,0.05)" }}>
        <div className="w-label">Rewritten hero (preview)</div>
        <p style={{ margin: "8px 0 0", fontSize: 13, color: "rgba(255,255,255,0.95)", lineHeight: 1.5 }}>
          {report.beforeAfter.homepageHeroAfter}
        </p>
      </div>

      <div className="w-card">
        <div className="w-label">Hivemind trace</div>
        <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 6 }}>
          {report.trace.personasUsed.map(p => {
            const m = PERSONA_META[p];
            if (!m) return null;
            return (
              <span key={p} className="w-chip" style={{ background: `${m.color}1f`, border: `1px solid ${m.color}66`, color: m.color }}>
                {m.emoji} {m.name}
              </span>
            );
          })}
        </div>
        <div style={{ marginTop: 10, fontSize: 11, color: "rgba(255,255,255,0.5)", lineHeight: 1.5 }}>
          Frameworks: {report.trace.frameworks.slice(0, 3).map(f => f.title).join(" · ")}
        </div>
        <div style={{ marginTop: 6 }}>
          <span
            className="w-chip"
            style={{
              background: report.trace.mode === "live" ? "rgba(163,230,53,0.12)" : "rgba(139,92,246,0.12)",
              border: report.trace.mode === "live" ? "1px solid rgba(163,230,53,0.4)" : "1px solid rgba(139,92,246,0.4)",
              color: report.trace.mode === "live" ? "#d3f4a4" : "#d8d2ff",
            }}
          >
            <span style={{ width: 5, height: 5, borderRadius: 999, background: "currentColor", animation: "wPulse 1.4s ease-in-out infinite" }} />
            {report.trace.mode === "live" ? "Live Hivemind API" : "Demo mode"}
          </span>
        </div>
      </div>

      <div className="w-card" style={{ textAlign: "center", background: "linear-gradient(180deg, rgba(139,92,246,0.12), rgba(34,211,238,0.06))", borderColor: "rgba(139,92,246,0.35)" }}>
        <div style={{ fontSize: 11, letterSpacing: "0.16em", textTransform: "uppercase", color: "#d8d2ff", marginBottom: 6 }}>
          This was the teaser
        </div>
        <div style={{ fontSize: 16, fontWeight: 600, lineHeight: 1.3 }}>
          The full plan includes 5 rewritten posts, 3 growth experiments, and a 30-day execution calendar.
        </div>
        <a
          href={ctaUrl}
          target="_top"
          rel="noopener"
          className="w-btn-primary"
          style={{ display: "block", marginTop: 12, textDecoration: "none", textAlign: "center" }}
        >
          {ctaLabel}
        </a>
        <button onClick={onReset} className="w-btn-ghost" style={{ width: "100%", marginTop: 8 }}>
          Run another autopsy
        </button>
      </div>
    </div>
  );
}
