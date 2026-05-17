export function ScoreRing({ score, size = 180 }: { score: number; size?: number }) {
  const p = Math.max(0, Math.min(100, score));
  const color = p >= 60 ? "#FFFF6A" : p >= 35 ? "#FFA22F" : "#FF2A38";
  return (
    <div
      style={{
        width: size,
        height: size,
        position: "relative",
        flexShrink: 0,
      }}
      aria-label={`GTM health score ${p} out of 100`}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: "9999px",
          background: `conic-gradient(${color} ${p}%, rgba(255,255,255,0.06) 0)`,
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 12,
          borderRadius: "9999px",
          background: "#000",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-mono-stack)",
            fontSize: Math.round(size * 0.34),
            fontWeight: 700,
            color,
            letterSpacing: "-0.02em",
            lineHeight: 1,
          }}
        >
          {p}
        </div>
        <div
          style={{
            fontFamily: "var(--font-mono-stack)",
            fontSize: 9.5,
            letterSpacing: "0.16em",
            color: "rgba(255,255,255,0.5)",
            textTransform: "uppercase",
            marginTop: 6,
          }}
        >
          / 100
        </div>
      </div>
    </div>
  );
}

export function ScoreBar({ label, value }: { label: string; value: number }) {
  const v = Math.max(0, Math.min(100, value));
  const color = v >= 60 ? "#FFFF6A" : v >= 35 ? "#FFA22F" : "#FF2A38";
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div
          style={{
            fontFamily: "var(--font-mono-stack)",
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "rgba(255,255,255,0.78)",
          }}
        >
          {label}
        </div>
        <div
          style={{
            fontFamily: "var(--font-mono-stack)",
            fontSize: 14,
            fontWeight: 700,
            color,
            letterSpacing: "-0.01em",
          }}
        >
          {v}
        </div>
      </div>
      <div style={{ height: 3, width: "100%", overflow: "hidden", background: "rgba(255,255,255,0.08)" }}>
        <div
          style={{
            height: "100%",
            width: `${v}%`,
            background: color,
            transition: "width 700ms cubic-bezier(0.2,0.8,0.2,1)",
          }}
        />
      </div>
    </div>
  );
}
