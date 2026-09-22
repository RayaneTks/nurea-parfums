/**
 * Environnement des tests de bout en bout (04 §16.4, 07 J4). Aucun fichier `.env` n'est lu : ils
 * pointent sur la PRODUCTION. Tout est explicite, avec des valeurs locales par défaut.
 *
 * Trois modes :
 * - local (défaut) : base `nurea_test_e2e` recréée sur un PostgreSQL LOCAL, migrée, remplie par
 *   `e2e/fixtures/seed.ts` ; l'app est lancée par Playwright sur cette base, avec un secret de test ;
 * - `E2E_PREMIERE=1` (parcours PC-12, `e2e/support/lancer-premiere.mjs`) : même chose, mais la base
 *   `nurea_test_e2e_vide` n'est PAS remplie — le seul enregistrement est le compte du gérant. C'est le
 *   seul moyen d'éprouver le « vide de départ » de l'Accueil (05 §5.1, 06 PC-12) : le jeu e2e est
 *   partagé et porte documents, parfums et poches. Ports à lui, pour ne jamais se mêler du harnais
 *   nominal ;
 * - `E2E_REMOTE=1` (préproduction, production en lecture) : ni migration ni seed ni serveur ;
 *   `PLAYWRIGHT_BASE_URL`, `E2E_ADMIN_USERNAME` et `E2E_ADMIN_PASSWORD` sont exigés.
 */

export const E2E_REMOTE = process.env.E2E_REMOTE === "1";

/**
 * Harnais « première utilisation » (PC-12) : base vide, ports et base à lui. Posé par le lanceur
 * `e2e/support/lancer-premiere.mjs`, il est hérité par les processus ouvriers de Playwright.
 */
export const E2E_PREMIERE = process.env.E2E_PREMIERE === "1";

/** Faux : `global-setup` ne remplit pas la base (le compte du gérant, lui, est toujours créé). */
export const E2E_SEED = !E2E_PREMIERE;

export const E2E_PORT = process.env.PLAYWRIGHT_PORT ?? (E2E_PREMIERE ? "3102" : "3100");
export const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? `http://localhost:${E2E_PORT}`;

/**
 * Faux stockage d'images (`e2e/support/fake-storage-server.ts`) : l'app lancée pour les tests y envoie ses
 * visuels à la place de Supabase (`NEXT_PUBLIC_SUPABASE_URL`), sur la boucle locale uniquement.
 */
export const E2E_STORAGE_PORT = process.env.E2E_STORAGE_PORT ?? (E2E_PREMIERE ? "3103" : "3101");
export const E2E_STORAGE_URL = `http://127.0.0.1:${E2E_STORAGE_PORT}`;

/** Base locale des e2e : PostgreSQL 15 de `docs/refonte/00-README.md`, base dédiée. */
export const E2E_DATABASE_URL =
  process.env.E2E_DATABASE_URL ??
  `postgresql://nurea:nurea@localhost:54329/nurea_test_e2e${E2E_PREMIERE ? "_vide" : ""}`;

/** Secret de signature des sessions de l'app lancée pour les tests — jamais celui de la production. */
export const E2E_JWT_SECRET = "e2e-secret-local-uniquement-pour-les-tests-de-bout-en-bout";

/** `dev` (défaut) : `next dev` ; `start` : `next start` sur un build existant (CI). */
export const E2E_SERVER = process.env.E2E_SERVER === "start" ? "start" : "dev";

export type Credentials = { username: string; password: string };

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`E2E_REMOTE=1 : la variable ${name} est obligatoire.`);
  return value;
}

/** Le compte avec lequel `global-setup` se connecte par l'écran. */
export const ADMIN: Credentials = E2E_REMOTE
  ? { username: required("E2E_ADMIN_USERNAME"), password: required("E2E_ADMIN_PASSWORD") }
  : { username: "gerant-e2e", password: "mot-de-passe-local-e2e" };

/**
 * Comptes dédiés au blocage après 5 échecs, un par projet Playwright : le compte principal ne se
 * verrouille jamais. En distant, seulement si `E2E_VERROU_USERNAME` est fourni (jamais le compte réel).
 */
export function lockAccount(project: string): Credentials | null {
  if (E2E_REMOTE) {
    const username = process.env.E2E_VERROU_USERNAME;
    return username ? { username, password: "jamais-le-bon-mot-de-passe" } : null;
  }
  return { username: `verrou-e2e-${project.toLowerCase()}`, password: "mot-de-passe-verrou-e2e" };
}

export const LOCK_PROJECTS = ["Mobile", "Desktop"] as const;

/** Session enregistrée par `global-setup` (sous `test-results/`, ignoré par Git, vidé à chaque exécution). */
export const STORAGE_STATE = "test-results/.auth/gerant.json";

/** Noms des cookies, recopiés du code (le test ne doit pas importer le serveur). */
export const SESSION_COOKIE = "nurea_admin";
