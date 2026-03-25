import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

export default {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "1.25rem",
      screens: { "2xl": "1200px" },
    },
    extend: {
      colors: {
        nurea: {
          bg: "var(--nurea-bg)",
          surface: "var(--nurea-surface)",
          "surface-hover": "var(--nurea-surface-hover)",
          accent: "var(--nurea-accent)",
          "accent-hover": "var(--nurea-accent-hover)",
          "accent-subtle": "var(--nurea-accent-subtle)",
          text: "var(--nurea-text)",
          muted: "var(--nurea-text-muted)",
          subtle: "var(--nurea-text-subtle)",
          cuivre: "var(--nurea-cuivre)",
          border: "var(--nurea-border)",
          "border-hover": "var(--nurea-border-hover)",
          glow: "var(--nurea-glow)",
        },
      },
      fontFamily: {
        serif: ["var(--font-serif)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        lg: "0px",
        md: "2px",
        sm: "2px",
      },
      transitionTimingFunction: {
        "out-expo": "cubic-bezier(0.16, 1, 0.3, 1)",
      },
      letterSpacing: {
        "nurea-tight": "var(--nurea-tracking-tight)",
        "nurea-label": "var(--nurea-tracking-label)",
        "nurea-wide": "var(--nurea-tracking-wide)",
      },
    },
  },
  plugins: [tailwindcssAnimate],
} satisfies Config;
