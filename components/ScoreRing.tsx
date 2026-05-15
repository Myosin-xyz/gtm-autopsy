export function ScoreRing({ score, size = 160 }: { score: number; size?: number }) {
  const p = Math.max(0, Math.min(100, score));
  const color =
    p >= 70 ? "#A3E635" : p >= 50 ? "#22D3EE" : p >= 35 ? "#F59E0B" : "#F43F5E";
  const ringStyle: React.CSSProperties = {
    width: size,
    height: size,
    background: `conic-gradient(${color} ${p}%, rgba(255,255,255,0.06) 0)`,
    borderRadius: "9999px",
    position: "relative",
  };
  const inner: React.CSSProperties = {
    position: "absolute",
    inset: 10,
    background: "#0c0d12",
    borderRadius: "9999px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "column",
  };
  return (
    <div style={ringStyle} aria-label={`GTM health score ${p} out of 100`}>
      <div style={inner}>
        <div style={{ fontSize: Math.round(size * 0.32), fontWeight: 700, color }}>
          {p}
        </div>
        <div className="label" style={{ marginTop: 2 }}>
          GTM Health
        </div>
      </div>
    </div>
  );
}

export function ScoreBar({ label, value }: { label: string; value: number }) {
  const v = Math.max(0, Math.min(100, value));
  const color =
    v >= 70 ? "#A3E635" : v >= 50 ? "#22D3EE" : v >= 35 ? "#F59E0B" : "#F43F5E";
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="text-sm text-white/80">{label}</div>
        <div className="font-mono text-sm" style={{ color }}>
          {v}
        </div>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-white/5">
        <div
          className="h-full rounded-full"
          style={{
            width: `${v}%`,
            background: `linear-gradient(90deg, ${color}, ${color}aa)`,
            transition: "width 600ms ease",
          }}
        />
      </div>
    </div>
  );
}
