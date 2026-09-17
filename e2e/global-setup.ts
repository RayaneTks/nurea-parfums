import { spawnSync } from "node:child_process";
import { mkdirSync, rmSync } from "node:fs";
import path from "node:path";
import { chromium, type FullConfig } from "@playwright/test";
import { assertNotProduction, HostRefusedError } from "../scripts/lib/garde-hote";
import { runPrisma } from "../scripts/migration/lib/prisma-cli";
import { seedE2e } from "./fixtures/seed";
import { waitForHydration } from "./helpers/hydration";
import { SCREENS, SHEETS } from "./routes";
import {
  ADMIN,
  BASE_URL,
  E2E_DATABASE_URL,
  E2E_REMOTE,
  E2E_SERVER,
  LOCK_PROJECTS,
  STORAGE_STATE,
  lockAccount,
  type Credentials,
} from "./support/env";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

/**
 * Préparation des tests de bout en bout (04 §16.4, 07 J4). Playwright a déjà lancé l'app (le serveur
 * web démarre avant ce fichier) ; Prisma n'ouvre ses connexions qu'à la première requête, la base
 * peut donc être recréée ici.
 *
 * Local : base `nurea_test_e2e` détruite et recréée en UTF-8 (hôte local et nom de test exigés, même
 * garde que `tests/db/global-setup.ts`), migrations, seed, comptes créés par `scripts/create-admin.ts`.
 * Puis, dans les deux modes : connexion PAR L'ÉCRAN et `storageState` réutilisé par tous les tests.
 */
export default async function globalSetup(config: FullConfig): Promise<void> {
  // Racine du dépôt : le dossier de playwright.config.ts.
  const root = path.dirname(config.configFile ?? path.join(process.cwd(), "playwright.config.ts"));
  if (!E2E_REMOTE) {
    purgeDataCache(root);
    await recreateDatabase();
    createAccount(root, ADMIN);
    for (const project of LOCK_PROJECTS) {
      const account = lockAccount(project);
      if (account) createAccount(root, account);
    }
  }
  await loginThroughTheScreen(root, config);
}

/**
 * Le cache de données de Next (`unstable_cache` : instantané admin du catalogue, sélecteur…) survit au
 * redémarrage du serveur, sur disque. La base, elle, est recréée à chaque exécution : sans purge, l'app
 * servirait l'état de l'exécution précédente (un parfum masqué par un test d'hier), et une écriture sans
 * effet n'invaliderait rien. Purgé avant toute lecture de l'app (le serveur n'a servi que `/admin/login`).
 */
function purgeDataCache(root: string): void {
  for (const dir of [path.join(root, ".next", "dev", "cache", "fetch-cache"), path.join(root, ".next", "cache", "fetch-cache")]) {
    rmSync(dir, { recursive: true, force: true });
  }
}

async function recreateDatabase(): Promise<void> {
  const url = new URL(assertNotProduction(E2E_DATABASE_URL, "Tests de bout en bout"));
  const databaseName = decodeURIComponent(url.pathname.replace(/^\//, ""));
  if (!LOCAL_HOSTS.has(url.hostname)) {
    throw new HostRefusedError(`Tests de bout en bout : ${url.hostname} n'est pas un serveur local, la base n'y est jamais recréée.`);
  }
  if (!/^nurea_test[a-z0-9_]*$/.test(databaseName)) {
    throw new HostRefusedError(`Tests de bout en bout : « ${databaseName} » ne porte pas un nom de base de test (nurea_test…).`);
  }

  // Import dynamique APRÈS lecture de l'URL : @prisma/client charge `.env` (la production) à l'import.
  const { PrismaClient } = await import("@prisma/client");
  const maintenanceUrl = new URL(url);
  maintenanceUrl.pathname = "/postgres";
  const admin = new PrismaClient({ datasourceUrl: maintenanceUrl.toString() });
  try {
    await admin.$executeRawUnsafe(`DROP DATABASE IF EXISTS "${databaseName}" WITH (FORCE)`);
    await admin.$executeRawUnsafe(
      `CREATE DATABASE "${databaseName}" TEMPLATE template0 ENCODING 'UTF8' LC_COLLATE 'C' LC_CTYPE 'C'`,
    );
  } finally {
    await admin.$disconnect();
  }

  const exitCode = runPrisma(["migrate", "deploy"], url.toString());
  if (exitCode !== 0) throw new Error(`Tests de bout en bout : les migrations ont échoué (code ${exitCode}).`);

  const db = new PrismaClient({ datasourceUrl: url.toString() });
  try {
    await seedE2e(db);
  } finally {
    await db.$disconnect();
  }
}

/** Le compte est créé par le vrai script, avec l'URL de la base e2e explicite (jamais `.env`). */
function createAccount(root: string, account: Credentials): void {
  const tsxCli = path.join(root, "node_modules", "tsx", "dist", "cli.mjs");
  const result = spawnSync(
    process.execPath,
    [tsxCli, "--conditions=react-server", "scripts/create-admin.ts", account.username, account.password],
    {
      cwd: root,
      encoding: "utf8",
      env: { ...process.env, DATABASE_URL: E2E_DATABASE_URL, DIRECT_URL: E2E_DATABASE_URL },
    },
  );
  if (result.status !== 0) {
    throw new Error(`create-admin a échoué pour ${account.username} :\n${result.stdout}\n${result.stderr}`);
  }
}

/** Connexion par l'écran E18, comme le gérant : c'est aussi le premier test de l'écran. */
async function loginThroughTheScreen(root: string, config: FullConfig): Promise<void> {
  const baseURL = config.projects[0]?.use.baseURL ?? BASE_URL;
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({ baseURL });
    const page = await context.newPage();
    // Premier rendu en `next dev` : compilation de la page, d'où le délai généreux.
    await page.goto("/admin/login", { waitUntil: "domcontentloaded", timeout: 180_000 });
    await waitForHydration(page.getByRole("button", { name: "Se connecter" }), 180_000);
    await page.getByLabel("Identifiant").fill(ADMIN.username);
    await page.getByLabel("Mot de passe", { exact: true }).fill(ADMIN.password);
    await page.getByRole("button", { name: "Se connecter" }).click();
    await page.waitForURL((url) => url.pathname === "/admin", { timeout: 180_000 });
    await page.locator("[data-tabbar] a").first().waitFor({ timeout: 180_000 });
    // Le shell pose le témoin de session dès son affichage : attendre qu'il soit dans le contexte.
    await expectCookie(context, "nurea_admin_vu");
    if (!E2E_REMOTE && E2E_SERVER === "dev") await warmUp(page);
    mkdirSync(path.dirname(path.join(root, STORAGE_STATE)), { recursive: true });
    await context.storageState({ path: path.join(root, STORAGE_STATE) });
  } finally {
    await browser.close();
  }
}

/**
 * `next dev` compile chaque écran à sa première visite, et une compilation en cours peut recharger
 * les pages déjà ouvertes par d'autres tests : tout ce que la suite ouvre est compilé ici, d'avance.
 */
async function warmUp(page: import("@playwright/test").Page): Promise<void> {
  const urls = new Set([...SCREENS.map((c) => c.url), ...SHEETS.map((c) => c.url)]);
  for (const url of urls) {
    await page.goto(url, { waitUntil: "load", timeout: 180_000 });
  }
  await page.request.get("/api/pwa/admin", { timeout: 180_000 });
  // Routes de lecture appelées à la frappe (07 J8) : compilées d'avance, sinon la première recherche attend la compilation.
  await page.request.get("/api/admin/search?scope=all&q=pr", { timeout: 180_000 });
  await page.request.get("/api/admin/picker", { timeout: 180_000 });
}

async function expectCookie(context: import("@playwright/test").BrowserContext, name: string): Promise<void> {
  for (let i = 0; i < 50; i += 1) {
    if ((await context.cookies()).some((cookie) => cookie.name === name)) return;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Le cookie ${name} n'a pas été posé après la connexion.`);
}
