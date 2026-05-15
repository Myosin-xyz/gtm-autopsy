"use client";

import Script from "next/script";

export default function EmbedDemoPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(900px 600px at 50% -10%, rgba(139,92,246,0.18), transparent 60%), #0a0a10",
        color: "#eceef5",
        fontFamily:
          'ui-sans-serif, system-ui, -apple-system, Inter, "Helvetica Neue", Arial',
      }}
    >
      <div
        style={{
          maxWidth: 960,
          margin: "0 auto",
          padding: "80px 24px 160px",
        }}
      >
        <div
          style={{
            fontSize: 11,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "rgba(255,255,255,0.5)",
          }}
        >
          Demo · simulating myosin.xyz/hivemind
        </div>
        <h1
          style={{
            fontSize: 56,
            lineHeight: 1.05,
            letterSpacing: "-0.02em",
            margin: "16px 0 18px",
            fontWeight: 600,
          }}
        >
          Hivemind makes go-to-market{" "}
          <span
            style={{
              background: "linear-gradient(90deg,#8B5CF6,#22D3EE)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            legible
          </span>
          .
        </h1>
        <p
          style={{
            fontSize: 18,
            lineHeight: 1.5,
            color: "rgba(255,255,255,0.7)",
            maxWidth: 640,
          }}
        >
          We diagnose, sharpen, and rewrite the GTM systems of the most ambitious
          Web3 and AI companies. Look in the corner — that floating button is the
          GTM Autopsy widget you can paste on any site.
        </p>

        <div
          style={{
            display: "flex",
            gap: 12,
            marginTop: 28,
            flexWrap: "wrap",
          }}
        >
          <a
            href="#"
            onClick={e => {
              e.preventDefault();
              if (typeof window !== "undefined" && (window as unknown as { GTMAutopsy?: { open: () => void } }).GTMAutopsy) {
                (window as unknown as { GTMAutopsy: { open: () => void } }).GTMAutopsy.open();
              }
            }}
            style={{
              padding: "12px 18px",
              borderRadius: 10,
              background: "linear-gradient(135deg,#8B5CF6,#6d28d9)",
              color: "white",
              textDecoration: "none",
              fontWeight: 600,
              border: "1px solid rgba(255,255,255,0.12)",
            }}
          >
            Run a free GTM autopsy →
          </a>
          <a
            href="#how"
            style={{
              padding: "12px 18px",
              borderRadius: 10,
              background: "rgba(255,255,255,0.04)",
              color: "white",
              textDecoration: "none",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            How Hivemind works
          </a>
        </div>

        <div
          id="how"
          style={{
            marginTop: 80,
            padding: 28,
            borderRadius: 18,
            background: "rgba(19,20,27,0.7)",
            border: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <div
            style={{
              fontSize: 11,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "rgba(255,255,255,0.5)",
            }}
          >
            Drop-in snippet
          </div>
          <h2 style={{ marginTop: 8, fontSize: 22, fontWeight: 600 }}>
            One script tag adds the popup to any page
          </h2>
          <pre
            style={{
              marginTop: 14,
              padding: 14,
              background: "#07070b",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 10,
              overflow: "auto",
              fontSize: 13,
              color: "#c9ccdc",
              lineHeight: 1.55,
            }}
          >
{`<script
  src="https://your-deploy.vercel.app/embed.js"
  data-label="Get a free GTM teardown"
  data-cta="https://myosin.xyz/hivemind#contact"
  data-cta-label="Hire Hivemind →"
  data-position="bottom-right"
  data-accent="#8B5CF6"
  defer
></script>`}
          </pre>
          <p
            style={{
              marginTop: 12,
              fontSize: 13.5,
              color: "rgba(255,255,255,0.65)",
              lineHeight: 1.55,
            }}
          >
            The widget is fully isolated inside an iframe. The launcher button is
            the only thing injected into the host page. Configurable via{" "}
            <code style={{ color: "#d8d2ff" }}>data-*</code> attributes:{" "}
            <code style={{ color: "#d8d2ff" }}>data-label</code>,{" "}
            <code style={{ color: "#d8d2ff" }}>data-cta</code>,{" "}
            <code style={{ color: "#d8d2ff" }}>data-cta-label</code>,{" "}
            <code style={{ color: "#d8d2ff" }}>data-position</code>{" "}
            (<em>bottom-right · bottom-left · top-right · top-left</em>),{" "}
            <code style={{ color: "#d8d2ff" }}>data-accent</code>,{" "}
            <code style={{ color: "#d8d2ff" }}>data-auto="true"</code> to open on
            page load.
          </p>
        </div>
      </div>

      <Script src="/embed.js"
        strategy="afterInteractive"
        data-label="Get a free GTM teardown"
        data-cta="https://myosin.xyz/hivemind#contact"
        data-cta-label="Hire Hivemind →"
        data-position="bottom-right"
        data-accent="#8B5CF6"
      />
    </div>
  );
}
