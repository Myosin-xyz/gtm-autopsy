import { Inter } from "next/font/google";
import localFont from "next/font/local";

// Body / regular text → Inter.
export const inter = Inter({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

// Headers + technical labels → ABC Maxi Round Mono (Hivemind brand display
// face). Files copied from the hive-mind repo's public/fonts.
export const abcMaxi = localFont({
  src: [
    { path: "../public/fonts/ABCMaxiRoundMono-Light.woff2", weight: "300", style: "normal" },
    { path: "../public/fonts/ABCMaxiRoundMono-Regular.woff2", weight: "400", style: "normal" },
    { path: "../public/fonts/ABCMaxiRoundMono-Bold.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-mono",
  display: "swap",
});
