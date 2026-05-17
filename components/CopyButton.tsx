"use client";

import { useState } from "react";

export function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1200);
        } catch {}
      }}
      style={{
        fontFamily: "var(--font-mono-stack)",
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        padding: "5px 10px",
        borderRadius: 999,
        border: copied ? "1px solid #FFFF6A" : "1px solid rgba(255,255,255,0.2)",
        background: copied ? "rgba(255,255,106,0.1)" : "transparent",
        color: copied ? "#FFFF6A" : "rgba(255,255,255,0.7)",
        cursor: "pointer",
        transition: "border-color 120ms ease, color 120ms ease, background 120ms ease",
      }}
    >
      {copied ? "✓ Copied" : label}
    </button>
  );
}
