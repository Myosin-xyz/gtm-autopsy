"use client";

import { useEffect, useState } from "react";
import { Form } from "@/components/Form";
import { LoadingSequence } from "@/components/LoadingSequence";
import { Report } from "@/components/Report";
import { Logo, Asterisk } from "@/components/Logo";
import type { AutopsyInput, AutopsyReport } from "@/lib/types";

type Phase = "idle" | "loading" | "done";

export default function HomePage() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [report, setReport] = useState<AutopsyReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"live" | "mock" | null>(null);
  const [apiDone, setApiDone] = useState(false);

  useEffect(() => {
    fetch("/api/autopsy")
      .then(r => r.json())
      .then(d => setMode(d.mode))
      .catch(() => {});
  }, []);

  async function handleSubmit(input: AutopsyInput) {
    setPhase("loading");
    setReport(null);
    setError(null);
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
    const minDuration = 5200;
    if (elapsed < minDuration) {
      await new Promise(r => setTimeout(r, minDuration - elapsed));
    }
    setApiDone(true);
    if (err) {
      setError(err);
      setPhase("idle");
      return;
    }
    setReport(result);
    setTimeout(() => setPhase("done"), 350);
  }

  function reset() {
    setPhase("idle");
    setReport(null);
    setError(null);
    setApiDone(false);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (phase === "done" && report) {
    return (
      <>
        <div className="myo-grid" />
        <TopBar mode={mode} />
        <Report report={report} onReset={reset} />
        <BottomBar />
      </>
    );
  }

  return (
    <>
      <div className="myo-grid" />
      <TopBar mode={mode} />

      <main className="relative mx-auto max-w-6xl px-6 py-12 md:px-10 md:py-20">
        {phase === "idle" && (
          <>
            <section className="mb-16 md:mb-20">
              <div className="annotation mb-6">/ FREE DIAGNOSTIC · 60 SECONDS · BY HIVEMIND</div>
              <h1 className="display text-[44px] leading-[0.95] md:text-[88px] md:leading-[0.92]">
                Stop sounding<br />
                like the <em>category.</em>
              </h1>
              <p className="mt-7 max-w-2xl text-lg leading-relaxed text-white/70 md:text-xl">
                Three HiveMind personas read your homepage, X, and category. They diagnose what's broken, find your wedge, and rewrite your hero. Brutally honest. Free.
              </p>

              <div className="mt-7 flex flex-wrap items-center gap-2">
                <span className="chip" style={{ border: "1px solid rgba(105,137,254,0.5)", color: "#6989FE" }}>▰ GTM Architect</span>
                <span className="chip" style={{ border: "1px solid rgba(255,41,232,0.5)", color: "#FF29E8" }}>✦ Genius Strategist</span>
                <span className="chip" style={{ border: "1px solid rgba(172,250,82,0.5)", color: "#ACFA52" }}>✎ Ghostwriter</span>
              </div>
            </section>

            {error && (
              <div
                style={{
                  fontFamily: "var(--font-mono-stack)",
                  fontSize: 12,
                  color: "#FF2A38",
                  padding: "12px 16px",
                  borderTop: "1px solid rgba(255,42,56,0.45)",
                  borderBottom: "1px solid rgba(255,42,56,0.45)",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  marginBottom: 16,
                }}
              >
                {error === "missing_required_fields"
                  ? "/ ERROR: Company name, website, and category required"
                  : `/ ERROR: ${error}`}
              </div>
            )}

            <Form onSubmit={handleSubmit} submitting={false} />

            <section className="mt-20">
              <div className="hairline mb-10" />
              <div className="annotation mb-6">/ WHY THIS ISN'T GENERIC AI</div>
              <div className="grid gap-px bg-white/10 overflow-hidden md:grid-cols-3">
                <Feature
                  num="01"
                  title="HiveMind personas, not a chatbot"
                  body="GTM Architect diagnoses. Genius Strategist finds the wedge. Ghostwriter rewrites. Each persona ships with its own knowledge layer."
                />
                <Feature
                  num="02"
                  title="Framework-backed, not vibes"
                  body="Every recommendation cites a HiveMind framework — Narrative Health Audit, Category Design Sprint, Founder-Led Distribution, more."
                />
                <Feature
                  num="03"
                  title="Shareable in 90 seconds"
                  body="A polished, link-shareable teardown that lands in a founder's DMs and makes them want the full plan."
                />
              </div>
            </section>
          </>
        )}

        {phase === "loading" && (
          <div className="py-10 md:py-16">
            <LoadingSequence done={apiDone} />
          </div>
        )}
      </main>

      <BottomBar />
    </>
  );
}

function TopBar({ mode }: { mode: "live" | "mock" | null }) {
  return (
    <header className="sticky top-0 z-20 bg-black/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4 md:px-10">
        <a href="/" className="flex items-center gap-3">
          <Logo className="h-4 w-4" color="#FFFF6A" />
          <span className="font-mono-myo" style={{ fontFamily: "var(--font-mono-stack)", fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", color: "#FFFF6A" }}>
            HIVEMIND
          </span>
          <span style={{ color: "rgba(255,255,255,0.25)", fontFamily: "var(--font-mono-stack)", fontSize: 11 }}>/</span>
          <span style={{ fontFamily: "var(--font-mono-stack)", fontSize: 11, fontWeight: 500, letterSpacing: "0.12em", color: "#fff" }}>
            GTM AUTOPSY
          </span>
        </a>
        <div className="flex items-center gap-4">
          {mode && (
            <span
              className="chip"
              style={{
                border: mode === "live" ? "1px solid rgba(255,255,106,0.6)" : "1px solid rgba(255,255,255,0.25)",
                color: mode === "live" ? "#FFFF6A" : "rgba(255,255,255,0.65)",
              }}
            >
              <span style={{ width: 5, height: 5, borderRadius: 999, background: "currentColor", animation: "pulseDot 1.4s ease-in-out infinite" }} />
              {mode === "live" ? "Live API" : "Demo mode"}
            </span>
          )}
          <span className="annotation hidden md:inline">2025 · 00 0 01</span>
        </div>
      </div>
      <div className="hairline" />
    </header>
  );
}

function BottomBar() {
  return (
    <footer className="relative z-10 mt-24">
      <div className="hairline" />
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5 md:px-10">
        <span className="annotation">2025 / MYOSIN · HIVEMIND</span>
        <span className="annotation">0 01 00 0</span>
      </div>
    </footer>
  );
}

function Feature({ num, title, body }: { num: string; title: string; body: string }) {
  return (
    <div className="bg-black p-6 md:p-7">
      <div style={{ fontFamily: "var(--font-mono-stack)", fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", color: "#FFFF6A" }}>{num}</div>
      <h3 className="mt-3 text-base font-semibold text-white">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-white/65">{body}</p>
    </div>
  );
}
