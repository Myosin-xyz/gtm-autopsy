import "../globals.css";
import type { Metadata } from "next";
import { ibmPlexSans, ibmPlexMono } from "@/lib/fonts";

export const metadata: Metadata = {
  title: "GTM Autopsy — HiveMind",
  description: "60-second GTM teardown. By HiveMind.",
};

export default function WidgetLayout({ children }: { children: React.ReactNode }) {
  return <div className={`${ibmPlexSans.variable} ${ibmPlexMono.variable}`}>{children}</div>;
}
