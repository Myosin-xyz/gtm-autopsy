import type { AutopsyReport } from "@/lib/types";

const PERSONA_META: Record<string, { name: string; color: string; mark: string }> = {
  "gtm-architect": { name: "GTM ARCHITECT", color: "#6989FE", mark: "▰" },
  "genius-strategist": { name: "GENIUS STRATEGIST", color: "#FF29E8", mark: "✦" },
  "ghostwriter": { name: "GHOSTWRITER", color: "#ACFA52", mark: "✎" },
  "general-assistant": { name: "GENERAL ASSISTANT", color: "#FFA22F", mark: "●" },
};

export function HivemindTrace({ report }: { report: AutopsyReport }) {
  const t = report.trace;
  return (
    <section className="card p-7 md:p-9">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="card-label">/ HiveMind trace</div>
          <h3 className="display mt-2 text-2xl md:text-3xl">
            Not generic <em>AI output.</em>
          </h3>
          <p className="mt-3 max-w-lg text-sm leading-relaxed text-white/65">
            The exact persona and framework chain HiveMind ran to produce this report.
          </p>
        </div>
        <span
          className="chip"
          style={{
            border: t.mode === "live" ? "1px solid rgba(255,255,106,0.6)" : "1px solid rgba(255,255,255,0.25)",
            color: t.mode === "live" ? "#FFFF6A" : "rgba(255,255,255,0.7)",
          }}
        >
          <span style={{ width: 5, height: 5, borderRadius: 999, background: "currentColor", animation: "pulseDot 1.4s ease-in-out infinite" }} />
          {t.mode === "live" ? "Live HiveMind API" : "Mock mode"}
        </span>
      </div>

      <div className="hairline-dim my-6" />

      <div className="grid gap-8 md:grid-cols-2">
        <div>
          <div className="card-label mb-3">/ Personas invoked</div>
          <div className="flex flex-wrap gap-2">
            {t.personasUsed.map(p => {
              const m = PERSONA_META[p] ?? { name: p, color: "#fff", mark: "•" };
              return (
                <span key={p} className="chip" style={{ border: `1px solid ${m.color}66`, color: m.color }}>
                  {m.mark} {m.name}
                </span>
              );
            })}
          </div>

          <div className="card-label mb-3 mt-7">/ Frameworks retrieved</div>
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {t.frameworks.map((f, i) => (
              <li
                key={f.title}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "11px 0",
                  borderTop: i === 0 ? "1px solid rgba(255,255,255,0.1)" : "0",
                  borderBottom: "1px solid rgba(255,255,255,0.1)",
                }}
              >
                <span style={{ fontSize: 13.5, color: "rgba(255,255,255,0.9)" }}>{f.title}</span>
                <span
                  style={{
                    fontFamily: "var(--font-mono-stack)",
                    fontSize: 10.5,
                    color: "rgba(255,255,255,0.4)",
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                  }}
                >
                  {f.doc_type ?? "playbook"} · {f.score.toFixed(2)}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <div className="card-label mb-3">/ Call chain</div>
          <ol style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {t.steps.map((s, i) => {
              const meta = s.persona ? PERSONA_META[s.persona] : undefined;
              const dot = meta?.color ?? "#FFFF6A";
              const isLast = i === t.steps.length - 1;
              return (
                <li
                  key={i}
                  style={{
                    display: "flex",
                    gap: 14,
                    padding: "14px 0",
                    borderTop: i === 0 ? "1px solid rgba(255,255,255,0.1)" : "0",
                    borderBottom: isLast ? "0" : "1px solid rgba(255,255,255,0.06)",
                  }}
                >
                  <span style={{ flexShrink: 0, paddingTop: 4 }}>
                    <span style={{ display: "block", width: 8, height: 8, background: dot, boxShadow: `0 0 10px ${dot}aa` }} />
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                      <div
                        style={{
                          fontFamily: "var(--font-mono-stack)",
                          fontSize: 12,
                          fontWeight: 700,
                          letterSpacing: "0.08em",
                          textTransform: "uppercase",
                          color: "#fff",
                        }}
                      >
                        {String(i + 1).padStart(2, "0")} · {s.label}
                      </div>
                      <span
                        style={{
                          fontFamily: "var(--font-mono-stack)",
                          fontSize: 10,
                          letterSpacing: "0.06em",
                          color: "rgba(255,255,255,0.4)",
                        }}
                      >
                        {s.ms}ms
                      </span>
                    </div>
                    <div style={{ marginTop: 5, fontSize: 12.5, color: "rgba(255,255,255,0.6)", lineHeight: 1.55 }}>{s.output}</div>
                    {s.sources && s.sources.length > 0 && (
                      <div style={{ marginTop: 7, display: "flex", flexWrap: "wrap", gap: 5 }}>
                        {s.sources.slice(0, 4).map(src => (
                          <span
                            key={src.title}
                            style={{
                              fontFamily: "var(--font-mono-stack)",
                              fontSize: 9.5,
                              padding: "3px 7px",
                              border: "1px solid rgba(255,255,255,0.12)",
                              color: "rgba(255,255,255,0.5)",
                              letterSpacing: "0.08em",
                              textTransform: "uppercase",
                            }}
                          >
                            {src.title}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </section>
  );
}
