import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#07070b",
          900: "#0c0d12",
          850: "#13141b",
          800: "#181a23",
          700: "#22242f",
          600: "#2d3040",
        },
        accent: {
          violet: "#8B5CF6",
          cyan: "#22D3EE",
          lime: "#A3E635",
          amber: "#F59E0B",
          rose: "#F43F5E",
        },
      },
      fontFamily: {
        sans: ["ui-sans-serif", "system-ui", "-apple-system", "Inter", "Helvetica Neue", "Arial"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "Monaco", "Consolas", "monospace"],
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(139,92,246,0.25), 0 12px 40px -10px rgba(139,92,246,0.45)",
      },
      keyframes: {
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        pulseDot: {
          "0%, 100%": { opacity: "0.35", transform: "scale(0.9)" },
          "50%": { opacity: "1", transform: "scale(1.05)" },
        },
      },
      animation: {
        shimmer: "shimmer 3s linear infinite",
        pulseDot: "pulseDot 1.4s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
