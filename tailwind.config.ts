import type { Config } from "tailwindcss";
import plugin from "tailwindcss/plugin";
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
        /*
         * Gestion : AUCUNE valeur ici. Les composants de `src/ui` consomment les
         * variables `--admin-*` par des valeurs arbitraires
         * (`bg-[var(--admin-accent)]`), déclarées par `globals.admin.css` depuis
         * `src/design/tokens.ts`. Un espace de noms `admin` et des hex en dur
         * ici faisaient une troisième source de vérité, sans lecteur
         * (docs/refonte/05-DESIGN-SYSTEM.md §2).
         */
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
  plugins: [
    tailwindcssAnimate,
    /*
     * Gestion — survol réservé à la souris (05 §4.1). Le `hover:` de Tailwind
     * s'applique aussi au tactile, où l'état reste collé après le tap : sur
     * iPhone, un bouton gardait sa teinte de survol jusqu'au tap suivant.
     * `mouse-hover:` ne s'active que sous `(hover: hover) and (pointer: fine)`.
     */
    plugin(({ addVariant }) => {
      addVariant("mouse-hover", "@media (hover: hover) and (pointer: fine) { &:hover }");
      addVariant("group-mouse-hover", "@media (hover: hover) and (pointer: fine) { :merge(.group):hover & }");
    }),
  ],
} satisfies Config;
