import { defineConfig, devices } from "@playwright/test";
import {
  BASE_URL,
  E2E_DATABASE_URL,
  E2E_JWT_SECRET,
  E2E_PORT,
  E2E_REMOTE,
  E2E_SERVER,
  E2E_STORAGE_PORT,
  E2E_STORAGE_URL,
  STORAGE_STATE,
} from "./e2e/support/env";

/**
 * Tests de bout en bout (04 §16.4) : `npm run test:layout` (invariants d'affichage, projet Desktop,
 * largeurs iPhone émulées) et `npm run test:e2e` (parcours, projet Mobile).
 *
 * AUCUN fichier `.env` n'est chargé : `.env` et `.env.local` pointent sur la production. L'app est
 * lancée sur la base e2e locale, avec un secret de test, et chaque variable qu'un `.env` pourrait
 * fournir à Next est posée explicitement (Next ne remplace jamais une variable déjà définie).
 *
 * Le port : un serveur déjà lancé n'est PAS réutilisé par défaut (`E2E_REUSE_SERVER=1` pour le
 * permettre) — une autre app sur le même port détournerait toute la suite en silence.
 */

/** Parcours qui écrivent la ligne `Setting` unique (réglages de E08) : exécutés seuls, voir les projets. */
const GLOBAL_SETTING_SPECS = /parcours[\\/]reglages\.spec\.ts$/;

/**
 * PC-12 « Première utilisation » : le seul parcours qui exige une base VIDE. Il a son harnais à lui
 * (base `nurea_test_e2e_vide`, ports 3102/3103, aucun seed), lancé par une commande séparée —
 * `npm run test:e2e:premiere`, qui pose `E2E_PREMIERE=1` (`e2e/support/env.ts`).
 */
const PREMIERE_SPEC = /parcours[\\/]premiere-utilisation\.spec\.ts$/;

/** Variables de l'app lancée pour les tests : base e2e, secret de test, aucun service réel. */
const serverEnv: Record<string, string> = {
  DATABASE_URL: E2E_DATABASE_URL,
  DIRECT_URL: E2E_DATABASE_URL,
  ADMIN_JWT_SECRET: E2E_JWT_SECRET,
  // Neutralisés : Supabase n'est jamais joint. Le stockage d'images est le faux serveur local
  // (`e2e/support/fake-storage-server.ts`) : le code de `storage.ts` s'exécute tel quel, vers la boucle locale.
  NEXT_PUBLIC_SUPABASE_URL: E2E_STORAGE_URL,
  SUPABASE_SERVICE_ROLE_KEY: "e2e-sans-cle",
  SUPABASE_STORAGE_BUCKET: "catalog",
  ADMIN_DASHBOARD_SECRET: "e2e-sans-secret",
  FRAGANTY_API_KEY: "e2e-sans-cle",
  RESEND_API_KEY: "e2e-sans-cle",
  NUREA_GESTION_MAINTENANCE: "0",
  NUREA_ENV: process.env.NUREA_ENV ?? "",
  NEXT_TELEMETRY_DISABLED: "1",
};

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  globalSetup: "./e2e/global-setup.ts",
  use: {
    baseURL: BASE_URL,
    storageState: STORAGE_STATE,
    locale: "fr-FR",
    timezoneId: "Europe/Paris",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    { name: "Mobile", use: { ...devices["iPhone 13"] }, testIgnore: [GLOBAL_SETTING_SPECS, PREMIERE_SPEC] },
    /**
     * Les parcours qui changent un réglage GLOBAL (la ligne `Setting` unique : poche proposée, taux par
     * défaut, 06 E08) ne peuvent pas courir en même temps qu'un parcours qui lit cette poche — la moitié
     * des CTA d'encaissement portent son nom. Projet à part, lancé par une SECONDE commande (`test:e2e`) :
     * rien d'autre ne tourne pendant qu'il change le réglage, et il rend l'état d'origine en partant.
     * (`dependencies` ferait entrer tout le projet « Mobile » dans l'exécution, filtre de fichiers ignoré.)
     */
    {
      name: "Mobile-reglages",
      use: { ...devices["iPhone 13"] },
      testMatch: GLOBAL_SETTING_SPECS,
      fullyParallel: false,
    },
    { name: "Desktop", use: { ...devices["Desktop Chrome"] }, testIgnore: [GLOBAL_SETTING_SPECS, PREMIERE_SPEC] },
    /**
     * PC-12 : base vide, donc harnais séparé et commande séparée. `fullyParallel: false` — le parcours
     * remplit la base au fil de ses étapes, chacune dépend de la précédente.
     */
    {
      name: "Mobile-premiere",
      use: { ...devices["iPhone 13"] },
      testMatch: PREMIERE_SPEC,
      fullyParallel: false,
    },
  ],
  webServer: E2E_REMOTE
    ? undefined
    : [
        {
          command: "node node_modules/tsx/dist/cli.mjs e2e/support/fake-storage-server.ts",
          url: `${E2E_STORAGE_URL}/health`,
          reuseExistingServer: process.env.E2E_REUSE_SERVER === "1",
          timeout: 30_000,
          stdout: "ignore",
          stderr: "pipe",
          env: { E2E_STORAGE_PORT },
        },
        {
          command:
            E2E_SERVER === "start"
              ? `node node_modules/next/dist/bin/next start --port ${E2E_PORT}`
              : `node node_modules/next/dist/bin/next dev --webpack --port ${E2E_PORT}`,
          url: `${BASE_URL}/admin/login`,
          reuseExistingServer: process.env.E2E_REUSE_SERVER === "1",
          timeout: 240_000,
          stdout: "ignore",
          stderr: "pipe",
          env: serverEnv,
        },
      ],
});
