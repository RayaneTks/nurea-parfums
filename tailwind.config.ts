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
    extend: {
      colors: {
        /**
         * Vitrine — jetons sémantiques de `app/globals.css` (DESIGN.md). Écrits en
         * `oklch()` : pas de modificateur d'opacité Tailwind, on mélange en CSS
         * (`color-mix`) quand il le faut.
         */
        bg: "var(--bg)",
        "surface-1": "var(--surface-1)",
        "surface-2": "var(--surface-2)",
        line: "var(--line)",
        "fg-1": "var(--text-1)",
        accent: "var(--accent)",
        frost: "var(--frost)",
        "accent-hover": "var(--accent-hover)",
        "accent-wash": "var(--accent-wash)",
        "on-accent": "var(--on-accent)",
        "fg-2": "var(--text-2)",
        "fg-3": "var(--text-3)",
        error: "var(--error)",
        focus: "var(--focus)",
        ambient: "var(--ambient)",
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
      /* Vitrine — `rounded-sm|md|lg` (la gestion n'en emploie aucun), `rounded-sheet` pour la feuille. */
      borderRadius: {
        sm: "var(--r-sm)",
        md: "var(--r-md)",
        lg: "var(--r-lg)",
        sheet: "var(--r-xl)",
      },
      boxShadow: {
        float: "var(--shadow-float)",
      },
      zIndex: {
        sticky: "var(--z-sticky)",
        scrim: "var(--z-scrim)",
        sheet: "var(--z-sheet)",
        toast: "var(--z-toast)",
      },
      /* Noms propres : `ease-out` et les durées par défaut restent ceux de Tailwind (la gestion s'en sert). */
      transitionDuration: {
        "dur-1": "var(--dur-1)",
        "dur-2": "var(--dur-2)",
        "dur-3": "var(--dur-3)",
        "dur-4": "var(--dur-4)",
      },
      transitionTimingFunction: {
        soft: "var(--ease-out)",
        sheet: "var(--ease-sheet)",
        move: "var(--ease-move)",
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
