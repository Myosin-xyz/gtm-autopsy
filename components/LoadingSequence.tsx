"use client";

import { useEffect, useState } from "react";

const STEPS = [
  { label: "Pulling public signals", detail: "Reading homepage, X bio, recent posts" },
  { label: "Retrieving Hivemind frameworks", detail: "Knowledge search · persona-targeted RAG" },
  { label: "Running GTM Architect diagnosis", detail: "Persona: gtm-architect" },
  { label: "Finding the strategic wedge", detail: "Persona: genius-strategist" },
  { label: "Rewriting with Ghostwriter", detail: "Persona: ghostwriter" },
  { label: "Generating shareable report", detail: "Composing scorecard, trace, CTA" },
];

export function LoadingSequence({ done }: { done: boolean }) {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (done) {
      setIdx(STEPS.length);
      return;
    }
    if (idx >= STEPS.length - 1) return;
    const t = setTimeout(() => setIdx(i => Math.min(STEPS.length - 1, i + 1)), 850 + idx * 250);
    return () => clearTimeout(t);
  }, [idx, done]);

  return (
    <div className="card mx-auto max-w-2xl p-7">
      <div className="flex items-center gap-2">
        <span className="h-2 w-2 animate-pulseDot rounded-full bg-accent-violet" />
        <div className="label">Running autopsy</div>
      </div>
      <h3 className="mt-1 text-xl font-semibold">Hivemind is on it.</h3>
      <p className="mt-1 text-sm text-white/55">
        Six steps, ~10–14 seconds. Watching the call chain assemble in real time.
      </p>

      <ol className="mt-5 space-y-3">
        {STEPS.map((s, i) => {
          const state = i < idx ? "done" : i === idx ? "active" : "pending";
          return (
            <li key={i} className="flex items-start gap-3">
              <div
                className={`mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border text-[10px] ${
                  state === "done"
                    ? "border-accent-lime/40 bg-accent-lime/20 text-accent-lime"
                    : state === "active"
                    ? "border-accent-violet/60 bg-accent-violet/20 text-white"
                    : "border-white/10 bg-white/[0.02] text-white/40"
                }`}
              >
                {state === "done" ? "✓" : state === "active" ? (
                  <span className="h-1.5 w-1.5 animate-pulseDot rounded-full bg-accent-violet" />
                ) : (
                  i + 1
                )}
              </div>
              <div className="min-w-0">
                <div
                  className={`text-sm font-medium ${
                    state === "pending" ? "text-white/40" : "text-white/95"
                  }`}
                >
                  {s.label}
                </div>
                <div
                  className={`text-xs ${
                    state === "pending" ? "text-white/25" : "text-white/55"
                  }`}
                >
                  {s.detail}
                </div>
                {state === "active" && (
                  <div className="mt-2 h-1 w-48 overflow-hidden rounded-full bg-white/5">
                    <div
                      className="h-full rounded-full"
                      style={{
                        background:
                          "linear-gradient(90deg, transparent, #8B5CF6, transparent)",
                        backgroundSize: "200% 100%",
                        animation: "shimmer 1.2s linear infinite",
                        width: "100%",
                      }}
                    />
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
