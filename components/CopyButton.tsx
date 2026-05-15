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
      className="rounded-md border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-white/70 transition hover:bg-white/10"
    >
      {copied ? "Copied ✓" : label}
    </button>
  );
}
