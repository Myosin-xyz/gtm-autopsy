"use client";

import Script from "next/script";

export default function EmbedDemoPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#000",
        color: "#fff",
        fontFamily:
          '"IBM Plex Sans", ui-sans-serif, system-ui, -apple-system, Inter, "Helvetica Neue", Arial',
        letterSpacing: "-0.005em",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@300;400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600;700&display=swap"
      />

      <div
        style={{
          position: "fixed",
          inset: 0,
          backgroundImage:
            "linear-gradient(to right, rgba(255,255,255,0.03) 1px, transparent 1px),linear-gradient(to bottom, rgba(255,255,255,0.03) 1px, transparent 1px)",
          backgroundSize: "80px 80px",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      <nav
        style={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          background: "rgba(0,0,0,0.85)",
          backdropFilter: "blur(8px)",
          borderBottom: "1px solid rgba(255,255,255,0.18)",
        }}
      >
        <div
          style={{
            maxWidth: 1200,
            margin: "0 auto",
            padding: "16px 28px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Asterisk size={16} color="#FFFF6A" />
            <span
              style={{
                fontFamily: '"IBM Plex Mono", "Courier New", monospace',
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.14em",
                color: "#FFFF6A",
              }}
            >
              MYOSIN
            </span>
            <span
              style={{
                color: "rgba(255,255,255,0.25)",
                fontFamily: '"IBM Plex Mono", "Courier New", monospace',
                fontSize: 11,
              }}
            >
              /
            </span>
            <span
              style={{
                fontFamily: '"IBM Plex Mono", "Courier New", monospace',
                fontSize: 11,
                fontWeight: 500,
                letterSpacing: "0.12em",
                color: "#fff",
              }}
            >
              HIVEMIND
            </span>
          </div>
          <div
            style={{
              display: "flex",
              gap: 22,
              fontFamily: '"IBM Plex Mono", "Courier New", monospace',
              fontSize: 11,
              fontWeight: 500,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "rgba(255,255,255,0.7)",
            }}
          >
            <span>Product</span>
            <span>Frameworks</span>
            <span>Pricing</span>
            <span>Contact</span>
          </div>
        </div>
      </nav>

      <section
        style={{
          position: "relative",
          zIndex: 1,
          maxWidth: 1200,
          margin: "0 auto",
          padding: "96px 28px 80px",
        }}
      >
        <div
          style={{
            fontFamily: '"IBM Plex Mono", "Courier New", monospace',
            fontSize: 11,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "rgba(255,255,255,0.5)",
            marginBottom: 28,
          }}
        >
          / DEMO · SIMULATING MYOSIN.XYZ/HIVEMIND
        </div>
        <h1
          style={{
            fontFamily: '"IBM Plex Mono", "Courier New", monospace',
            fontSize: "clamp(48px, 9vw, 112px)",
            lineHeight: 0.93,
            letterSpacing: "-0.02em",
            margin: 0,
            fontWeight: 700,
            textTransform: "uppercase",
            maxWidth: 1100,
          }}
        >
          Elite strategic
          <br />
          thinking,{" "}
          <span style={{ color: "#FFFF6A" }}>on demand.</span>
        </h1>
        <p
          style={{
            fontSize: 19,
            lineHeight: 1.55,
            color: "rgba(255,255,255,0.7)",
            maxWidth: 660,
            marginTop: 32,
          }}
        >
          Strategic firepower from Myosin's top marketing minds — compressed into
          one AI. HiveMind diagnoses, sharpens, and rewrites the go-to-market of
          the most ambitious Web3 and AI teams.
        </p>

        <div style={{ display: "flex", gap: 12, marginTop: 36, flexWrap: "wrap" }}>
          <button
            onClick={() => {
              const w = window as unknown as { GTMAutopsy?: { open: () => void } };
              if (w.GTMAutopsy) w.GTMAutopsy.open();
            }}
            style={{
              padding: "14px 26px",
              borderRadius: 999,
              background: "#FFFF6A",
              color: "#000",
              fontFamily: '"IBM Plex Mono", "Courier New", monospace',
              fontWeight: 700,
              border: 0,
              fontSize: 12,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              cursor: "pointer",
            }}
          >
            Run a free teardown →
          </button>
          <a
            href="#how"
            style={{
              padding: "14px 22px",
              borderRadius: 999,
              background: "transparent",
              color: "#fff",
              textDecoration: "none",
              border: "1px solid rgba(255,255,255,0.25)",
              fontFamily: '"IBM Plex Mono", "Courier New", monospace',
              fontSize: 11,
              fontWeight: 500,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
            }}
          >
            / How Hivemind works
          </a>
        </div>

        <div style={{ marginTop: 32, display: "flex", flexWrap: "wrap", gap: 8 }}>
          <Chip color="#6989FE" mark="▰">GTM Architect</Chip>
          <Chip color="#FF29E8" mark="✦">Genius Strategist</Chip>
          <Chip color="#ACFA52" mark="✎">Ghostwriter</Chip>
        </div>

        <div style={{ marginTop: 80, height: 1, background: "rgba(255,255,255,0.18)" }} />

        <div
          id="how"
          style={{
            marginTop: 64,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))",
            gap: 1,
            background: "rgba(255,255,255,0.1)",
            border: "1px solid rgba(255,255,255,0.1)",
            overflow: "hidden",
          }}
        >
          {[
            { num: "01", label: "GTM Architect", desc: "Structural diagnosis of positioning, ICP, narrative, distribution." },
            { num: "02", label: "Genius Strategist", desc: "Identifies the wedge phrase the category does not own." },
            { num: "03", label: "Ghostwriter", desc: "Voice-matched rewrites of hero, X posts, founder LinkedIn, cold DM." },
          ].map(p => (
            <div
              key={p.num}
              style={{
                background: "#000",
                padding: "28px 24px",
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              <div
                style={{
                  fontFamily: '"IBM Plex Mono", "Courier New", monospace',
                  fontSize: 11,
                  fontWeight: 700,
                  color: "#FFFF6A",
                  letterSpacing: "0.14em",
                }}
              >
                {p.num}
              </div>
              <div style={{ fontSize: 17, fontWeight: 600, color: "#fff", marginTop: 6 }}>
                {p.label}
              </div>
              <div style={{ fontSize: 13.5, color: "rgba(255,255,255,0.65)", lineHeight: 1.55 }}>
                {p.desc}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section
        id="snippet"
        style={{
          position: "relative",
          zIndex: 1,
          maxWidth: 1200,
          margin: "0 auto",
          padding: "40px 28px 120px",
        }}
      >
        <div
          style={{
            padding: 36,
            borderRadius: 18,
            background: "rgba(255,255,255,0.015)",
            border: "1px solid rgba(255,255,255,0.14)",
          }}
        >
          <div
            style={{
              fontFamily: '"IBM Plex Mono", "Courier New", monospace',
              fontSize: 11,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "rgba(255,255,255,0.55)",
            }}
          >
            / Drop-in snippet
          </div>
          <h2
            style={{
              fontFamily: '"IBM Plex Mono", "Courier New", monospace',
              marginTop: 12,
              fontSize: 32,
              fontWeight: 700,
              letterSpacing: "-0.015em",
              textTransform: "uppercase",
              lineHeight: 1.05,
            }}
          >
            One <span style={{ color: "#FFFF6A" }}>{`<script>`}</span>{" "}
            tag adds the popup
            <br />
            to any page.
          </h2>
          <pre
            style={{
              marginTop: 22,
              padding: 20,
              background: "#000",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 10,
              overflow: "auto",
              fontSize: 13,
              color: "#bbb",
              lineHeight: 1.6,
              fontFamily: '"IBM Plex Mono", "Courier New", monospace',
            }}
          >
{`<script
  src="https://gtm-autopsy.vercel.app/embed.js"
  data-label="Run a free teardown"
  data-position="bottom-right"
  data-accent="#FFFF6A"
  defer
></script>`}
          </pre>
          <p
            style={{
              marginTop: 18,
              fontSize: 14.5,
              color: "rgba(255,255,255,0.7)",
              lineHeight: 1.6,
              maxWidth: 760,
            }}
          >
            The widget is fully isolated inside an iframe. The launcher button is
            the only thing injected into the host page. Configurable via{" "}
            <code
              style={{
                color: "#FFFF6A",
                fontFamily: '"IBM Plex Mono", monospace',
              }}
            >
              data-*
            </code>{" "}
            attributes. Call{" "}
            <code
              style={{
                color: "#FFFF6A",
                fontFamily: '"IBM Plex Mono", monospace',
              }}
            >
              window.GTMAutopsy.open()
            </code>{" "}
            from any other CTA on the page to trigger the popup.
          </p>
        </div>
      </section>

      <footer
        style={{
          position: "relative",
          zIndex: 1,
          borderTop: "1px solid rgba(255,255,255,0.18)",
        }}
      >
        <div
          style={{
            maxWidth: 1200,
            margin: "0 auto",
            padding: "20px 28px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span
            style={{
              fontFamily: '"IBM Plex Mono", "Courier New", monospace',
              fontSize: 10,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "rgba(255,255,255,0.35)",
            }}
          >
            2025 / MYOSIN · HIVEMIND
          </span>
          <span
            style={{
              fontFamily: '"IBM Plex Mono", "Courier New", monospace',
              fontSize: 10,
              letterSpacing: "0.14em",
              color: "rgba(255,255,255,0.35)",
            }}
          >
            0 01 00 0
          </span>
        </div>
      </footer>

      <Script
        src="/embed.js"
        strategy="afterInteractive"
        data-label="Run a free teardown"
        data-position="bottom-right"
        data-accent="#FFFF6A"
      />
    </div>
  );
}

function Asterisk({ size = 16, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden style={{ display: "block" }}>
      <line x1="16" y1="2" x2="16" y2="30" stroke={color} strokeWidth="1.8" />
      <line x1="2" y1="16" x2="30" y2="16" stroke={color} strokeWidth="1.8" />
      <line x1="6" y1="6" x2="26" y2="26" stroke={color} strokeWidth="1.8" />
      <line x1="26" y1="6" x2="6" y2="26" stroke={color} strokeWidth="1.8" />
    </svg>
  );
}

function Chip({
  color,
  mark,
  children,
}: {
  color: string;
  mark: string;
  children: React.ReactNode;
}) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "5px 11px",
        borderRadius: 999,
        border: `1px solid ${color}66`,
        color,
        fontFamily: '"IBM Plex Mono", "Courier New", monospace',
        fontSize: 10.5,
        fontWeight: 700,
        letterSpacing: "0.1em",
        textTransform: "uppercase",
      }}
    >
      {mark} {children}
    </span>
  );
}
