"use client";

import { useEffect, useState } from "react";

const STEPS = [
  { label: "Reading the homepage", detail: "Public signals, X bio, recent posts" },
  { label: "Pulling HiveMind frameworks", detail: "Knowledge search · persona-targeted RAG" },
  { label: "Running GTM Architect diagnosis", detail: "Persona: gtm-architect" },
  { label: "Finding the strategic wedge", detail: "Persona: genius-strategist" },
  { label: "Rewriting with Ghostwriter", detail: "Persona: ghostwriter" },
  { label: "Compiling the autopsy", detail: "Scorecard · trace · CTA" },
];

export function LoadingSequence({ done }: { done: boolean }) {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (done) {
      setIdx(STEPS.length);
      return;
    }
    if (idx >= STEPS.length - 1) return;
    const t = setTimeout(() => setIdx(i => Math.min(STEPS.length - 1, i + 1)), 900 + idx * 250);
    return () => clearTimeout(t);
  }, [idx, done]);

  return (
    <div className="mx-auto max-w-2xl card p-8 md:p-10">
      <div
        style={{
          fontFamily: "var(--font-mono-stack)",
          fontSize: 11,
          letterSpacing: "0.18em",
          color: "#FFFF6A",
          textTransform: "uppercase",
          marginBottom: 14,
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <span style={{ width: 7, height: 7, borderRadius: 999, background: "#FFFF6A", animation: "pulseDot 1.4s ease-in-out infinite" }} />
        / Running autopsy
      </div>
      <h3 className="display text-3xl md:text-4xl">
        Hivemind is<br />
        <em>on it.</em>
      </h3>
      <p style={{ margin: "16px 0 24px", fontSize: 14, color: "rgba(255,255,255,0.65)", lineHeight: 1.55 }}>
        Six steps · about 10 seconds. Watching the call chain assemble in real time.
      </p>

      <ol style={{ listStyle: "none", padding: 0, margin: 0 }}>
        {STEPS.map((s, i) => {
          const state = i < idx ? "done" : i === idx ? "active" : "pending";
          const isLast = i === STEPS.length - 1;
          return (
            <li
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 16,
                padding: "14px 0",
                borderBottom: isLast ? "0" : "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <span
                style={{
                  fontFamily: "var(--font-mono-stack)",
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.1em",
                  color: state === "done" ? "#FFFF6A" : state === "active" ? "#fff" : "rgba(255,255,255,0.3)",
                  width: 32,
                  flexShrink: 0,
                }}
              >
                {String(i + 1).padStart(2, "0")}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 500,
                    color: state === "pending" ? "rgba(255,255,255,0.35)" : "#fff",
                  }}
                >
                  {s.label}
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-mono-stack)",
                    fontSize: 10.5,
                    color: state === "pending" ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.45)",
                    letterSpacing: "0.04em",
                    marginTop: 3,
                  }}
                >
                  {s.detail}
                </div>
                {state === "active" && (
                  <div style={{ marginTop: 9, height: 2, width: "100%", background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                    <div style={{ height: "100%", width: "100%", background: "linear-gradient(90deg, transparent, #FFFF6A, transparent)", backgroundSize: "200% 100%", animation: "shimmer 1.2s linear infinite" }} />
                  </div>
                )}
              </div>
              <span
                style={{
                  fontFamily: "var(--font-mono-stack)",
                  fontSize: 10,
                  letterSpacing: "0.1em",
                  color: state === "done" ? "#FFFF6A" : "rgba(255,255,255,0.35)",
                  textTransform: "uppercase",
                  width: 50,
                  textAlign: "right",
                  flexShrink: 0,
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
