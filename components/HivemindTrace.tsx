import type { AutopsyReport } from "@/lib/types";

const PERSONA_META: Record<string, { name: string; color: string; emoji: string }> = {
  "gtm-architect": { name: "GTM Architect", color: "#22D3EE", emoji: "▰" },
  "genius-strategist": { name: "Genius Strategist", color: "#8B5CF6", emoji: "◆" },
  "ghostwriter": { name: "Ghostwriter", color: "#A3E635", emoji: "✎" },
  "general-assistant": { name: "General Assistant", color: "#F59E0B", emoji: "●" },
};

export function HivemindTrace({ report }: { report: AutopsyReport }) {
  const t = report.trace;
  return (
    <section className="card p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="label">Hivemind Trace</div>
          <h3 className="mt-1 text-xl font-semibold">
            This isn't generic AI output.
          </h3>
          <p className="mt-1 text-sm text-white/60">
            Below is the exact persona + framework chain Hivemind ran to produce this report.
          </p>
        </div>
        <div
          className="chip"
          style={{
            background:
              t.mode === "live" ? "rgba(163,230,53,0.12)" : "rgba(139,92,246,0.12)",
            borderColor:
              t.mode === "live" ? "rgba(163,230,53,0.45)" : "rgba(139,92,246,0.45)",
            color: t.mode === "live" ? "#d3f4a4" : "#d8d2ff",
          }}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulseDot" />
          {t.mode === "live" ? "Live Hivemind API" : "Mock mode — set HIVEMIND_API_KEY for live"}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <div className="label mb-2">Personas invoked</div>
          <div className="flex flex-wrap gap-2">
            {t.personasUsed.map(p => {
              const meta = PERSONA_META[p] ?? { name: p, color: "#888", emoji: "•" };
              return (
                <span
                  key={p}
                  className="chip"
                  style={{
                    background: `${meta.color}1f`,
                    borderColor: `${meta.color}66`,
                    color: meta.color,
                  }}
                >
                  <span>{meta.emoji}</span>
                  {meta.name}
                </span>
              );
            })}
          </div>

          <div className="label mb-2 mt-6">Frameworks retrieved</div>
          <ul className="space-y-2">
            {t.frameworks.map(f => (
              <li
                key={f.title}
                className="flex items-center justify-between rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2 text-sm"
              >
                <span className="text-white/85">{f.title}</span>
                <span className="font-mono text-xs text-white/40">
                  {f.doc_type ?? "playbook"} · {f.score.toFixed(2)}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <div className="label mb-2">Call chain</div>
          <ol className="relative space-y-3 border-l border-white/10 pl-5">
            {t.steps.map((s, i) => {
              const meta = s.persona ? PERSONA_META[s.persona] : undefined;
              const dot = meta?.color ?? "#22D3EE";
              return (
                <li key={i} className="relative">
                  <span
                    className="absolute -left-[27px] top-1 h-3 w-3 rounded-full ring-4"
                    style={{
                      background: dot,
                      boxShadow: `0 0 12px ${dot}aa`,
                    }}
                  />
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-medium text-white/90">
                      {i + 1}. {s.label}
                    </div>
                    <div className="font-mono text-[11px] text-white/40">
                      {s.ms}ms
                    </div>
                  </div>
                  <div className="mt-1 text-xs text-white/55">{s.output}</div>
                  {s.sources && s.sources.length ? (
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {s.sources.slice(0, 4).map(src => (
                        <span
                          key={src.title}
                          className="rounded-md border border-white/10 bg-white/[0.03] px-2 py-0.5 text-[10px] uppercase tracking-wider text-white/45"
                        >
                          {src.title}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </section>
  );
}
