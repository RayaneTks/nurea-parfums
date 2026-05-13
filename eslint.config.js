import nextCoreWebVitals from "eslint-config-next/core-web-vitals";

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
];

export default config;
