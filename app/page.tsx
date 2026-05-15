"use client";

import { useEffect, useState } from "react";
import { Form } from "@/components/Form";
import { LoadingSequence } from "@/components/LoadingSequence";
import { Report } from "@/components/Report";
import { Logo } from "@/components/Logo";
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
    return <Report report={report} onReset={reset} />;
  }

  return (
    <main className="relative mx-auto max-w-4xl px-5 py-10 md:py-16">
      <nav className="mb-10 flex items-center justify-between">
        <a href="/" className="flex items-center gap-2">
          <Logo />
          <span className="font-semibold tracking-tight">GTM Autopsy</span>
          <span className="ml-2 text-xs text-white/40">by Hivemind</span>
        </a>
        <div className="flex items-center gap-2">
          {mode && (
            <span
              className="chip"
              style={{
                background:
                  mode === "live" ? "rgba(163,230,53,0.12)" : "rgba(139,92,246,0.12)",
                borderColor:
                  mode === "live" ? "rgba(163,230,53,0.4)" : "rgba(139,92,246,0.4)",
                color: mode === "live" ? "#d3f4a4" : "#d8d2ff",
              }}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulseDot" />
              {mode === "live" ? "Live Hivemind" : "Demo mode"}
            </span>
          )}
        </div>
      </nav>

      {phase === "idle" && (
        <>
          <section className="mb-9 text-center md:mb-12">
            <span className="chip">A Hivemind product surface</span>
            <h1 className="mx-auto mt-4 max-w-3xl text-4xl font-semibold leading-[1.05] tracking-tight md:text-6xl">
              Paste a URL.
              <br />
              Get a brutally honest{" "}
              <span
                style={{
                  background: "linear-gradient(90deg,#8B5CF6,#22D3EE)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                GTM teardown
              </span>
              .
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-lg text-white/65">
              Positioning, ICP, narrative health, distribution leverage, missing proof — diagnosed in 60 seconds by three Hivemind personas working off the same frameworks library used by leading Web3 and AI teams.
            </p>
            <div className="mx-auto mt-6 flex max-w-md flex-wrap items-center justify-center gap-2 text-xs text-white/50">
              <span className="chip" style={{ background: "rgba(34,211,238,0.1)", borderColor: "rgba(34,211,238,0.35)", color: "#a5edf6" }}>GTM Architect</span>
              <span className="chip" style={{ background: "rgba(139,92,246,0.1)", borderColor: "rgba(139,92,246,0.35)", color: "#d8d2ff" }}>Genius Strategist</span>
              <span className="chip" style={{ background: "rgba(163,230,53,0.1)", borderColor: "rgba(163,230,53,0.4)", color: "#d3f4a4" }}>Ghostwriter</span>
            </div>
          </section>

          {error && (
            <div className="mb-4 rounded-xl border border-accent-rose/30 bg-accent-rose/10 px-4 py-3 text-sm text-accent-rose/90">
              {error === "missing_required_fields"
                ? "Please fill in company name, website, and category."
                : `Autopsy failed: ${error}`}
            </div>
          )}

          <Form onSubmit={handleSubmit} submitting={false} />

          <section className="mt-10 grid gap-4 md:grid-cols-3">
            <Feature
              title="Hivemind personas, not generic AI"
              body="The GTM Architect diagnoses. The Genius Strategist finds the wedge. The Ghostwriter rewrites. Each persona ships with its own knowledge layer."
            />
            <Feature
              title="Framework-backed, not vibes-based"
              body="Every recommendation cites the underlying Hivemind framework — Narrative Health Audit, Category Design Sprint, Founder-Led Distribution, and more."
            />
            <Feature
              title="Shareable in 90 seconds"
              body="A polished, link-shareable teardown that lands in a founder's DMs and makes them want the full plan."
            />
          </section>
        </>
      )}

      {phase === "loading" && <LoadingSequence done={apiDone} />}
    </main>
  );
}

function Feature({ title, body }: { title: string; body: string }) {
  return (
    <div className="card p-5">
      <h3 className="text-sm font-semibold text-white/95">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-white/60">{body}</p>
    </div>
  );
}
