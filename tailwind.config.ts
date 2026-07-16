import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "./components/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        bg: "#0B1220",
        "bg-alt": "#111A2E",
        "bg-raised": "#16223B",
        line: "#233152",
        fg: "#EDEFF3",
        muted: "#8B93A7",
        accent: "#D9A44A",
        "accent-soft": "#3A2F1B",
        good: "#5FAE8A",
      },
      fontFamily: {
        display: ["var(--font-display)", "serif"],
        body: ["var(--font-body)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      backgroundImage: {
        grain: "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.035) 1px, transparent 0)",
      },
    },
  },
  plugins: [],
};
export default config;
