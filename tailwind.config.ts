import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        paper: "var(--paper)",
        ink: "var(--ink)",
        "ink-soft": "var(--ink-soft)",
        coral: "var(--coral)",
        "coral-soft": "var(--coral-soft)",
        river: "var(--river)",
        "river-soft": "var(--river-soft)",
        mint: "var(--mint)",
        "mint-soft": "var(--mint-soft)",
        gold: "var(--gold)",
        line: "var(--line)",
      },
      fontFamily: {
        heading: ["var(--font-kanit)", "sans-serif"],
        body: ["var(--font-plex-thai)", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
