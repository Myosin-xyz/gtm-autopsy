"use client";

import { useState } from "react";
import { Logo, Asterisk } from "@/components/Logo";

const FULL_SNIPPET = `<script
  src="https://gtm-autopsy.vercel.app/embed.js"
  data-label="Run a free GTM Autopsy"
  data-position="bottom-right"
  data-accent="#FFFF6A"
  defer
></script>`;

const MIN_SNIPPET = `<script src="https://gtm-autopsy.vercel.app/embed.js" defer></script>`;

const DEVTOOLS_SNIPPET = `var s=document.createElement('script');
s.src='https://gtm-autopsy.vercel.app/embed.js';
s.defer=true;
document.body.appendChild(s);`;

const CONFIG_ROWS = [
  { attr: "data-label", default: "Run a free GTM Autopsy", desc: "Text on the launcher pill." },
  { attr: "data-position", default: "bottom-right", desc: "bottom-right · bottom-left · top-right · top-left" },
  { attr: "data-accent", default: "#FFFF6A", desc: "Launcher background. Any valid CSS color." },
  { attr: "data-auto", default: "false", desc: "If true, auto-opens 800ms after load." },
];

export default function InstallPage() {
  return (
    <>
      <div className="myo-grid" />
      <TopBar />

      <main className="relative z-10 mx-auto max-w-4xl px-6 py-12 md:px-10 md:py-20">
        <section className="mb-14 md:mb-20">
          <div className="annotation mb-5">/ FOR THE HIVEMIND TEAM · 60-SECOND READ</div>
          <h1 className="display text-4xl leading-[0.95] md:text-6xl md:leading-[0.92]">
            Install the GTM Autopsy
            <br />
            <em>widget.</em>
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-white/70">
            One line of HTML. The yellow launcher appears on every page it loads on. Click → the full diagnostic opens in a modal. Sandboxed, idempotent, ~5KB, no dependencies.
          </p>
        </section>

        <Section label="/ 01 · Paste this" title="One line. Anywhere before </body>.">
          <CodeBlock code={MIN_SNIPPET} />
          <p className="mt-5 text-sm leading-relaxed text-white/65">
            That's the minimum. Done. The launcher uses Hivemind-yellow by default, the report CTA defaults to <span className="kbd">Hire HiveMind →</span> linking to <span className="kbd">{`{current-page}#contact`}</span>, and the modal closes on overlay click, <span className="kbd">Esc</span>, or the × button.
          </p>
        </Section>

        <Divider />

        <Section label="/ 02 · Configure (optional)" title="Every knob is a data-* attribute.">
          <CodeBlock code={FULL_SNIPPET} />
          <div className="mt-6 overflow-hidden border border-white/14" style={{ borderRadius: 10 }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "rgba(255,255,255,0.04)" }}>
                  <Th>Attribute</Th>
                  <Th>Default</Th>
                  <Th>What it does</Th>
                </tr>
              </thead>
              <tbody>
                {CONFIG_ROWS.map((row, i) => (
                  <tr key={row.attr} style={{ borderTop: i === 0 ? "1px solid rgba(255,255,255,0.14)" : "1px solid rgba(255,255,255,0.08)" }}>
                    <Td mono yellow>{row.attr}</Td>
                    <Td mono>{row.default}</Td>
                    <Td>{row.desc}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        <Divider />

        <Section label="/ 03 · Open from your own code" title="Three globals.">
          <CodeBlock
            code={`window.GTMAutopsy.open();
window.GTMAutopsy.close();
window.GTMAutopsy.isOpen();   // → boolean`}
          />
          <p className="mt-5 text-sm leading-relaxed text-white/65">
            Use these to trigger the modal from any CTA on the page, on exit-intent, on scroll-depth, or after a delay. The launcher pill itself stays where it is — these just let you open programmatically from anywhere.
          </p>
        </Section>

        <Divider />

        <Section label="/ 04 · Where it goes" title="Pick whichever fits your stack.">
          <div className="grid gap-4 md:grid-cols-2">
            <InstallCard
              num="01"
              title="Plain HTML / static site"
              body={`Paste the <script> tag right before </body> in your template.`}
            />
            <InstallCard
              num="02"
              title="Next.js"
              body={`Drop a <Script src="..." strategy="afterInteractive" /> into your root layout.`}
            />
            <InstallCard
              num="03"
              title="Webflow / Framer / WordPress"
              body={`Site settings → Custom Code → "Before </body>". Paste the snippet there.`}
            />
            <InstallCard
              num="04"
              title="Google Tag Manager"
              body={`New tag → Custom HTML → paste the snippet → trigger on All Pages → publish.`}
            />
          </div>
        </Section>

        <Divider />

        <Section
          label="/ 05 · Test on the real site first"
          title="Two ways to preview before you deploy."
        >
          <p className="text-sm leading-relaxed text-white/65" style={{ marginTop: -4 }}>
            Don't push anything to production until you've seen the launcher render on the actual page you'll embed it on. Both methods take under 30 seconds.
          </p>

          <div className="mt-7">
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginBottom: 12,
              }}
            >
              <span
                style={{
                  fontFamily: "var(--font-mono-stack)",
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: "0.14em",
                  color: "#000",
                  background: "#FFFF6A",
                  padding: "3px 8px",
                  borderRadius: 4,
                  textTransform: "uppercase",
                }}
              >
                METHOD A · RECOMMENDED
              </span>
              <span className="annotation">REAL PAGE · ZERO CODE CHANGES</span>
            </div>
            <div style={{ fontSize: 16, fontWeight: 600, color: "#fff", marginBottom: 6 }}>
              Inject the widget into myosin.xyz/hivemind via browser DevTools
            </div>
            <p className="text-sm leading-relaxed text-white/65" style={{ marginBottom: 16 }}>
              This is the most accurate preview possible — it loads the real widget onto the real Hivemind page in your browser only. Nothing changes for any other visitor. Refreshing the page removes it.
            </p>

            <Steps
              steps={[
                {
                  label: "Open the host page",
                  body: (
                    <>
                      Navigate to <span className="kbd">https://myosin.xyz/hivemind</span> in Chrome, Safari, Firefox, or Edge. Any modern browser works.
                    </>
                  ),
                },
                {
                  label: "Open DevTools",
                  body: (
                    <>
                      Press <span className="kbd">⌘ + Option + I</span> on Mac, or <span className="kbd">F12</span> on Windows / Linux. The DevTools panel appears on the right side or bottom of the window.
                    </>
                  ),
                },
                {
                  label: "Click the Console tab",
                  body: (
                    <>
                      In the DevTools header, click <span className="kbd">Console</span>. You'll see a blinking cursor at the prompt — that's where you'll paste.
                    </>
                  ),
                },
                {
                  label: "Paste this and press Enter",
                  body: (
                    <>
                      <div style={{ marginTop: 10 }}>
                        <CodeBlock code={DEVTOOLS_SNIPPET} />
                      </div>
                    </>
                  ),
                },
                {
                  label: "Look in the bottom-right corner",
                  body: (
                    <>
                      Within ~1 second, a <strong style={{ color: "#FFFF6A" }}>yellow pill button</strong> appears in the bottom-right corner of the page. It reads <span className="kbd">★ NEW · Run a free GTM Autopsy →</span>. This is the launcher.
                    </>
                  ),
                },
                {
                  label: "Click the launcher",
                  body: (
                    <>
                      The modal opens over the page. Try the full flow: fill in a sample company (or click <em style={{ color: "#FFFF6A", fontStyle: "normal" }}>/ Try a sample</em>) → press <span className="kbd">RUN AUTOPSY</span> → watch the six-step loading sequence → read the teaser report.
                    </>
                  ),
                },
                {
                  label: "Reload the page to remove the widget",
                  body: (
                    <>
                      DevTools injections are session-only. Hit refresh (<span className="kbd">⌘ + R</span> / <span className="kbd">F5</span>) and the launcher is gone. Nothing was persisted on Hivemind's site or to other visitors.
                    </>
                  ),
                },
              ]}
            />

            <div
              style={{
                marginTop: 22,
                padding: 16,
                borderLeft: "3px solid #FFFF6A",
                background: "rgba(255,255,106,0.05)",
              }}
            >
              <div
                style={{
                  fontFamily: "var(--font-mono-stack)",
                  fontSize: 10.5,
                  fontWeight: 700,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: "#FFFF6A",
                  marginBottom: 8,
                }}
              >
                / What "passing the test" looks like
              </div>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, fontSize: 13.5, color: "rgba(255,255,255,0.85)", lineHeight: 1.65 }}>
                <li>✓ The launcher button sits in the bottom-right and doesn't overlap any existing UI (nav, chat widget, etc.)</li>
                <li>✓ Clicking it opens a modal — no layout shift, no broken styles on the host page</li>
                <li>✓ The form is readable; the loading sequence animates; the report renders within ~10 seconds</li>
                <li>✓ Closing with × / Esc / overlay-click restores the host page exactly as it was</li>
                <li>✓ The browser console shows no red errors related to <span className="kbd">gtma-*</span> or <span className="kbd">embed.js</span></li>
              </ul>
            </div>
          </div>

          <div className="my-9 hairline-dim" />

          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginBottom: 12,
              }}
            >
              <span
                style={{
                  fontFamily: "var(--font-mono-stack)",
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: "0.14em",
                  color: "#fff",
                  border: "1px solid rgba(255,255,255,0.25)",
                  padding: "3px 8px",
                  borderRadius: 4,
                  textTransform: "uppercase",
                }}
              >
                METHOD B · FASTER
              </span>
              <span className="annotation">MOCK PAGE WE ALREADY HOST</span>
            </div>
            <div style={{ fontSize: 16, fontWeight: 600, color: "#fff", marginBottom: 6 }}>
              Visit the demo page we ship with the widget
            </div>
            <p className="text-sm leading-relaxed text-white/65" style={{ marginBottom: 16 }}>
              We host a styled-as-Hivemind mock marketing page with the widget already installed. Useful for sharing the experience over chat without asking anyone to open DevTools. It's a faithful preview — the launcher, modal, fonts, and colors are exactly what'll ship on myosin.xyz.
            </p>
            <div className="flex flex-wrap gap-3">
              <a
                href="/embed-demo"
                className="btn-primary inline-flex items-center"
                style={{ textDecoration: "none" }}
              >
                Open the demo →
              </a>
              <a
                href="/widget?cta=https%3A%2F%2Fmyosin.xyz%2Fhivemind%23contact"
                className="btn-ghost inline-flex items-center"
                style={{ textDecoration: "none" }}
              >
                / Open the widget alone
              </a>
            </div>
            <p className="text-sm leading-relaxed text-white/55 mt-5">
              Difference between the two: <span className="kbd">/embed-demo</span> shows the launcher on a backdrop and is what you'd send to a non-technical reviewer. <span className="kbd">/widget</span> renders the modal contents only — useful for screenshots or embedding directly in a pitch deck.
            </p>
          </div>
        </Section>

        <Divider />

        <Section label="/ 06 · CSP" title="If you run a Content Security Policy.">
          <CodeBlock
            code={`script-src 'self' https://gtm-autopsy.vercel.app;
frame-src  https://gtm-autopsy.vercel.app;
style-src  'self' 'unsafe-inline' https://fonts.googleapis.com;
font-src   https://fonts.gstatic.com;`}
          />
          <p className="mt-5 text-sm leading-relaxed text-white/65">
            The widget uses one inline style tag, so <span className="kbd">'unsafe-inline'</span> is required in <span className="kbd">style-src</span>. If your policy can't accept that, ping Alice and we'll ship a nonce-aware build.
          </p>
        </Section>

        <Divider />

        <section
          style={{
            background: "var(--myo-yellow)",
            color: "#000",
            borderRadius: 18,
            padding: "36px 32px",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div style={{ position: "absolute", top: 18, right: 18, opacity: 0.4 }}>
            <Asterisk size={28} color="#000" />
          </div>
          <div
            style={{
              fontFamily: "var(--font-mono-stack)",
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: "rgba(0,0,0,0.55)",
            }}
          >
            / Next step
          </div>
          <h2
            style={{
              fontFamily: "var(--font-mono-stack)",
              fontSize: "clamp(28px, 5vw, 44px)",
              fontWeight: 700,
              lineHeight: 0.98,
              letterSpacing: "-0.02em",
              textTransform: "uppercase",
              marginTop: 14,
              color: "#000",
              maxWidth: 560,
            }}
          >
            Ship the snippet.
            <br />
            We'll measure together.
          </h2>
          <p style={{ marginTop: 14, fontSize: 15, lineHeight: 1.55, color: "rgba(0,0,0,0.75)", maxWidth: 540 }}>
            Once the script is live on <span style={{ fontFamily: "var(--font-mono-stack)" }}>myosin.xyz/hivemind</span>, we'll instrument launcher-visible, opened, submitted, report-viewed, and CTA-clicked. Ready to plug into Hivemind's funnel attribution.
          </p>
          <div style={{ marginTop: 22, display: "flex", flexWrap: "wrap", gap: 10 }}>
            <a
              href="mailto:hello@myosin.xyz?subject=GTM%20Autopsy%20widget%20%E2%80%94%20ready%20to%20install"
              style={{
                padding: "13px 22px",
                borderRadius: 999,
                background: "#000",
                color: "#FFFF6A",
                textDecoration: "none",
                fontFamily: "var(--font-mono-stack)",
                fontWeight: 700,
                fontSize: 12,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
              }}
            >
              Send to engineering →
            </a>
            <a
              href="/embed-demo"
              style={{
                padding: "13px 22px",
                borderRadius: 999,
                background: "transparent",
                border: "1px solid rgba(0,0,0,0.45)",
                color: "#000",
                textDecoration: "none",
                fontFamily: "var(--font-mono-stack)",
                fontWeight: 500,
                fontSize: 12,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
              }}
            >
              / See the demo
            </a>
          </div>
        </section>
      </main>

      <BottomBar />
    </>
  );
}

function TopBar() {
  return (
    <header className="sticky top-0 z-20 bg-black/85 backdrop-blur">
      <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4 md:px-10">
        <a href="/" className="flex items-center gap-3" style={{ textDecoration: "none" }}>
          <Logo className="h-4 w-4" color="#FFFF6A" />
          <span style={{ fontFamily: "var(--font-mono-stack)", fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", color: "#FFFF6A" }}>
            HIVEMIND
          </span>
          <span style={{ color: "rgba(255,255,255,0.25)", fontFamily: "var(--font-mono-stack)", fontSize: 11 }}>/</span>
          <span style={{ fontFamily: "var(--font-mono-stack)", fontSize: 11, fontWeight: 500, letterSpacing: "0.12em", color: "#fff" }}>
            GTM AUTOPSY · INSTALL
          </span>
        </a>
        <div className="hidden items-center gap-4 md:flex">
          <a href="/" className="annotation" style={{ textDecoration: "none" }}>
            / TRY THE APP
          </a>
          <a href="/embed-demo" className="annotation" style={{ textDecoration: "none" }}>
            / DEMO
          </a>
        </div>
      </div>
      <div className="hairline" />
    </header>
  );
}

function BottomBar() {
  return (
    <footer className="relative z-10 mt-24">
      <div className="hairline" />
      <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-5 md:px-10">
        <span className="annotation">2025 / MYOSIN · HIVEMIND</span>
        <span className="annotation">0 01 00 0</span>
      </div>
    </footer>
  );
}

function Section({
  label,
  title,
  children,
}: {
  label: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="card p-7 md:p-9">
      <div className="label">{label}</div>
      <h2 className="display mt-2 text-2xl leading-tight md:text-3xl">{title}</h2>
      <div className="mt-6">{children}</div>
    </section>
  );
}

function Divider() {
  return <div className="my-6 md:my-7" />;
}

function CodeBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div style={{ position: "relative" }}>
      <pre
        style={{
          margin: 0,
          padding: "18px 22px",
          paddingRight: 80,
          background: "#000",
          border: "1px solid rgba(255,255,255,0.14)",
          borderRadius: 10,
          overflow: "auto",
          fontFamily: "var(--font-mono-stack)",
          fontSize: 13,
          lineHeight: 1.6,
          color: "rgba(255,255,255,0.9)",
        }}
      >
        {code}
      </pre>
      <button
        type="button"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(code);
            setCopied(true);
            setTimeout(() => setCopied(false), 1400);
          } catch {}
        }}
        style={{
          position: "absolute",
          top: 12,
          right: 12,
          padding: "6px 12px",
          borderRadius: 999,
          border: copied ? "1px solid #FFFF6A" : "1px solid rgba(255,255,255,0.2)",
          background: copied ? "rgba(255,255,106,0.1)" : "transparent",
          color: copied ? "#FFFF6A" : "rgba(255,255,255,0.7)",
          fontFamily: "var(--font-mono-stack)",
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          cursor: "pointer",
          transition: "border-color 120ms, color 120ms, background 120ms",
        }}
      >
        {copied ? "✓ Copied" : "Copy"}
      </button>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th
      style={{
        textAlign: "left",
        fontFamily: "var(--font-mono-stack)",
        fontSize: 10.5,
        fontWeight: 700,
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        color: "rgba(255,255,255,0.6)",
        padding: "12px 16px",
      }}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  mono = false,
  yellow = false,
}: {
  children: React.ReactNode;
  mono?: boolean;
  yellow?: boolean;
}) {
  return (
    <td
      style={{
        padding: "13px 16px",
        fontFamily: mono ? "var(--font-mono-stack)" : "var(--font-body-stack)",
        fontSize: mono ? 12.5 : 13.5,
        color: yellow ? "#FFFF6A" : mono ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.75)",
        lineHeight: 1.5,
        verticalAlign: "top",
      }}
    >
      {children}
    </td>
  );
}

function Steps({
  steps,
}: {
  steps: { label: string; body: React.ReactNode }[];
}) {
  return (
    <ol style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 0 }}>
      {steps.map((s, i) => (
        <li
          key={i}
          style={{
            display: "flex",
            gap: 18,
            padding: "16px 0",
            borderTop: i === 0 ? "1px solid rgba(255,255,255,0.12)" : "0",
            borderBottom: "1px solid rgba(255,255,255,0.08)",
            alignItems: "flex-start",
          }}
        >
          <span
            style={{
              fontFamily: "var(--font-mono-stack)",
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.12em",
              color: "#FFFF6A",
              flexShrink: 0,
              paddingTop: 2,
              width: 28,
            }}
          >
            {String(i + 1).padStart(2, "0")}
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: "#fff", marginBottom: 4 }}>
              {s.label}
            </div>
            <div style={{ fontSize: 13.5, color: "rgba(255,255,255,0.7)", lineHeight: 1.6 }}>
              {s.body}
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}

function InstallCard({ num, title, body }: { num: string; title: string; body: string }) {
  return (
    <div
      style={{
        border: "1px solid rgba(255,255,255,0.14)",
        padding: 20,
        background: "rgba(255,255,255,0.015)",
        borderRadius: 10,
      }}
    >
      <div style={{ fontFamily: "var(--font-mono-stack)", fontSize: 11, fontWeight: 700, color: "#FFFF6A", letterSpacing: "0.14em" }}>
        {num}
      </div>
      <div style={{ marginTop: 8, fontSize: 15, fontWeight: 600, color: "#fff" }}>{title}</div>
      <div style={{ marginTop: 6, fontSize: 13, color: "rgba(255,255,255,0.65)", lineHeight: 1.55 }}>{body}</div>
    </div>
  );
}
