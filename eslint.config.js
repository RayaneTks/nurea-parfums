import nextCoreWebVitals from "eslint-config-next/core-web-vitals";

/**
 * Règles d'architecture de la gestion (docs/refonte/04-ARCHITECTURE.md §3.7, §5.3), doublées par
 * les tests `tests/architecture/`. En configuration à plat, un second bloc qui redéfinit
 * `no-restricted-imports` remplace le premier : les chemins interdits sont donc recomposés par registre.
 */
const DECIMAL_IMPORTS = ["decimal.js", "decimal.js-light"].map((name) => ({
  name,
  message: "Argent : passe par src/domain/money.ts, seul importeur d'une bibliothèque décimale (04 §5).",
}));

const SEARCH_PARAMS_IMPORT = {
  name: "next/navigation",
  importNames: ["useSearchParams"],
  message: "État d'URL : passe par useUrlState (src/app-shell/hooks/useUrlState.ts), sous <Suspense> (04 §3.7).",
};

const ADMIN_REGISTRY = ["src/app-shell/**", "src/features/**", "src/ui/**", "app/admin/**"];

/** @type {import("eslint").Linter.Config[]} */
const config = [
  {
    ignores: [
      "dist/**",
      ".next/**",
      "node_modules/**",
      "playwright-report/**",
      "test-results/**",
      "eslint.config.js",
      "postcss.config.js",
    ],
  },
  ...nextCoreWebVitals,
  {
    rules: {
      /* Trop strict pour next-themes (mounted) et sync URL ↔ état local (App Router). */
      "react-hooks/set-state-in-effect": "off",
    },
  },
  {
    files: ["**/*.{js,jsx,mjs,cjs,ts,tsx,mts,cts}"],
    ignores: ["src/domain/money.ts"],
    rules: {
      "no-restricted-imports": ["error", { paths: DECIMAL_IMPORTS }],
    },
  },
  {
    files: ADMIN_REGISTRY,
    ignores: ["src/app-shell/hooks/useUrlState.ts"],
    rules: {
      "no-restricted-imports": ["error", { paths: [...DECIMAL_IMPORTS, SEARCH_PARAMS_IMPORT] }],
    },
  },
  {
    files: ["**/*.{ts,tsx,mts,cts}"],
    ignores: ["src/server/db/**"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "MemberExpression[object.name='Prisma'][property.name='Decimal']",
          message: "Prisma.Decimal ne sert qu'à la frontière base (src/server/db) : calcule avec src/domain/money.ts (04 §5.3).",
        },
        {
          selector: "TSQualifiedName[left.name='Prisma'][right.name='Decimal']",
          message: "Prisma.Decimal ne sert qu'à la frontière base (src/server/db) : type les montants avec src/domain/money.ts (04 §5.3).",
        },
      ],
    },
  },
];

export default config;
