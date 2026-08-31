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
        /**
         * Vitrine — charte graphique v3.
         * Valeurs dans `app/globals.css`, documentées dans `src/design/brand.ts`.
         */
        nurea: {
          bg: "rgb(var(--nurea-bg-rgb) / <alpha-value>)",
          surface: "rgb(var(--nurea-surface-rgb) / <alpha-value>)",
          "surface-hover": "rgb(var(--nurea-surface-hover-rgb) / <alpha-value>)",
          text: "rgb(var(--nurea-text-rgb) / <alpha-value>)",
          muted: "rgb(var(--nurea-text-muted-rgb) / <alpha-value>)",
          subtle: "rgb(var(--nurea-text-subtle-rgb) / <alpha-value>)",
          disabled: "rgb(var(--nurea-text-disabled-rgb) / <alpha-value>)",
          accent: "rgb(var(--nurea-accent-rgb) / <alpha-value>)",
          "accent-hover": "rgb(var(--nurea-accent-hover-rgb) / <alpha-value>)",
          "on-accent": "rgb(var(--nurea-on-accent-rgb) / <alpha-value>)",
          alert: "rgb(var(--nurea-alert-rgb) / <alpha-value>)",
          /* Déjà translucides : pas de modificateur d'opacité. */
          "accent-subtle": "var(--nurea-accent-subtle)",
          border: "var(--nurea-border)",
          "border-strong": "var(--nurea-border-strong)",
        },
        /* Admin — app nuréa-admin (Vite) */
        "nurea-bordeaux": "#7b0b1d",
        "nurea-bordeaux-light": "#9d1c2e",
        "ios-bg": "#f2f2f7",
        "ios-card": "#ffffff",
        admin: {
          bg: "var(--admin-bg)",
          surface: "var(--admin-surface)",
          "surface-muted": "var(--admin-surface-muted)",
          "surface-hover": "var(--admin-surface-hover)",
          text: "var(--admin-text)",
          muted: "var(--admin-text-muted)",
          subtle: "var(--admin-text-subtle)",
          border: "var(--admin-border)",
          "border-hover": "var(--admin-border-hover)",
          accent: "var(--admin-accent)",
          "accent-hover": "var(--admin-accent-hover)",
          "accent-subtle": "var(--admin-accent-subtle)",
          "accent-ring": "var(--admin-accent-ring)",
          cuivre: "var(--admin-cuivre)",
          "cuivre-subtle": "var(--admin-cuivre-subtle)",
          success: "var(--admin-success)",
          "success-subtle": "var(--admin-success-subtle)",
          "success-border": "var(--admin-success-border)",
          warning: "var(--admin-warning)",
          "warning-subtle": "var(--admin-warning-subtle)",
          "warning-border": "var(--admin-warning-border)",
          danger: "var(--admin-danger)",
          "danger-subtle": "var(--admin-danger-subtle)",
          "danger-border": "var(--admin-danger-border)",
          info: "var(--admin-info)",
          "info-subtle": "var(--admin-info-subtle)",
          "info-border": "var(--admin-info-border)",
        },
      },
      boxShadow: {
        "admin-sm": "var(--admin-shadow-sm)",
        "admin-md": "var(--admin-shadow-md)",
        "admin-lg": "var(--admin-shadow-lg)",
        "admin-xl": "var(--admin-shadow-xl)",
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
      spacing: {
        /** Charte § 04 — marge de page et intervalle entre sections. */
        18: "4.5rem",
      },
      transitionDuration: {
        /** Charte § 05 — la seule durée d'interaction de la vitrine. */
        nurea: "160ms",
      },
    },
  },
  plugins: [tailwindcssAnimate],
} satisfies Config;
