import "./globals.css";
import type { Metadata } from "next";
import { inter, abcMaxi } from "@/lib/fonts";

export const metadata: Metadata = {
  title: "GTM Teardown · HiveMind",
  description:
    "Paste a URL. Get a brutally honest go-to-market teardown (positioning, ICP, narrative, channels, and rewrites) powered by HiveMind personas.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${abcMaxi.variable}`}>
      <body>{children}</body>
    </html>
  );
}
