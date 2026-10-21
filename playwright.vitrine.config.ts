import { defineConfig, devices } from "@playwright/test";

/**
 * Parcours de la vitrine publique (`e2e/vitrine/`), lancés par `npm run test:e2e:vitrine` (et en fin de
 * `npm run test:e2e`) : accueil → fiche → Snapchat, filtres, recherche, Ma sélection.
 *
 * SANS BASE : la vitrine montre alors l'instantané public `src/lib/catalog/demo-catalogue.json` (111
 * parfums, Creed Aventus, Dior…), sur lequel ces specs sont écrites. Les variables de base sont posées
 * VIDES, jamais absentes : Next ne remplace pas une variable déjà définie, une valeur vide empêche donc
 * un `.env` (la production) de fournir la sienne. Aucun service réel n'est joint.
 *
 * Serveur : `next dev` par défaut ; `E2E_SERVER=start` sert un build existant — à préférer en local,
 * le serveur de dev sous charge rend les gestes instables. Les cookies de la gestion ne jouent pas ici :
 * WebKit (iPhone, le téléphone de la plupart des clients venus de Snapchat) tourne aussi sur un build.
 */

const PORT = process.env.VITRINE_PORT ?? "3104";
const BASE_URL = `http://localhost:${PORT}`;

/**
 * Le cache de données de Next survit sur disque : sans purge, la vitrine servirait le catalogue du
 * dernier passage (le seed des parcours de gestion, ou le catalogue vide d'un build fait avec une base
 * factice) au lieu de l'instantané. Purgé AVANT le démarrage : la sonde du serveur lit déjà l'accueil.
 */
const PURGE =
  "node -e \"for (const d of ['.next/dev/cache/fetch-cache', '.next/cache/fetch-cache']) require('fs').rmSync(d, { recursive: true, force: true })\"";

const serverEnv: Record<string, string> = {
  DATABASE_URL: "",
  DIRECT_URL: "",
  ADMIN_JWT_SECRET: "",
  NEXT_PUBLIC_SUPABASE_URL: "",
  SUPABASE_SERVICE_ROLE_KEY: "",
  FRAGANTY_API_KEY: "",
  RESEND_API_KEY: "",
  NEXT_TELEMETRY_DISABLED: "1",
};

export default defineConfig({
  testDir: "./e2e/vitrine",
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report-vitrine" }]],
  use: {
    baseURL: BASE_URL,
    locale: "fr-FR",
    timezoneId: "Europe/Paris",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "Vitrine-iPhone", use: { ...devices["iPhone 13"] } },
    { name: "Vitrine-Android", use: { ...devices["Pixel 7"] } },
    { name: "Vitrine-Bureau", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: {
    command:
      `${PURGE} && ` +
      (process.env.E2E_SERVER === "start"
        ? `node node_modules/next/dist/bin/next start --port ${PORT}`
        : `node node_modules/next/dist/bin/next dev --webpack --port ${PORT}`),
    url: BASE_URL,
    reuseExistingServer: process.env.E2E_REUSE_SERVER === "1",
    timeout: 240_000,
    stdout: "ignore",
    stderr: "pipe",
    env: serverEnv,
  },
});
