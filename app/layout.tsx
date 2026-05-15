import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "GTM Autopsy — by Hivemind",
  description:
    "Paste a URL. Get a brutally honest go-to-market teardown — positioning, ICP, narrative, channels, and rewrites — powered by Hivemind personas.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="grain">{children}</body>
    </html>
  );
}
