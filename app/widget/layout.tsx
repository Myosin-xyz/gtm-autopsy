import "../globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "GTM Autopsy — Hivemind",
  description: "60-second GTM teardown powered by Hivemind personas.",
};

export default function WidgetLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
