export function Logo({ className = "h-4 w-4", color = "#FFFF6A" }: { className?: string; color?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} fill="none" aria-hidden>
      <line x1="16" y1="2" x2="16" y2="30" stroke={color} strokeWidth="1.8" />
      <line x1="2" y1="16" x2="30" y2="16" stroke={color} strokeWidth="1.8" />
      <line x1="6" y1="6" x2="26" y2="26" stroke={color} strokeWidth="1.8" />
      <line x1="26" y1="6" x2="6" y2="26" stroke={color} strokeWidth="1.8" />
    </svg>
  );
}

export function Asterisk({ size = 16, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden style={{ display: "block" }}>
      <line x1="16" y1="2" x2="16" y2="30" stroke={color} strokeWidth="1.6" />
      <line x1="2" y1="16" x2="30" y2="16" stroke={color} strokeWidth="1.6" />
      <line x1="6" y1="6" x2="26" y2="26" stroke={color} strokeWidth="1.6" />
      <line x1="26" y1="6" x2="6" y2="26" stroke={color} strokeWidth="1.6" />
    </svg>
  );
}
