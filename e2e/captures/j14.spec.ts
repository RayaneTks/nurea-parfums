import { mkdirSync } from "node:fs";
import path from "node:path";
import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { routes } from "../../src/app-shell/routes";
import { NEWS_SEEN_KEY } from "../../src/contracts/stats";
import { BANC_ACCUEIL } from "../fixtures/accueil-contrat";
import { COMPTA_MONTH } from "../fixtures/compta";
import { mountAccueil } from "../helpers/banc";
import { waitForHydration } from "../helpers/hydration";

/**
 * Captures de revue du jalon J14 (390 × 844, iPhone 12-16) : l'Accueil nominal, l'Accueil de première
 * utilisation, la carte « Nouveautés », le Récap du jour et les Statistiques. Hors des suites :
 * `NUREA_CAPTURES=1 npx playwright test captures/j14 --project=Desktop`.
 */

const OUT = path.join(process.cwd(), "migration-artifacts", "captures-j14");

test.skip(!process.env.NUREA_CAPTURES, "Captures de revue : NUREA_CAPTURES=1 pour les produire.");
test.use({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });

async function shot(page: Page, url: string, name: string, prepare?: (page: Page) => Promise<void>) {
  await page.goto(url);
  await waitForHydration(page.locator("[data-tabbar] a").first());
  // L'indicateur des outils de `next dev` n'existe pas en production : il ne figure pas sur une capture.
  await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" });
  await page.waitForTimeout(900);
  await prepare?.(page);
  mkdirSync(OUT, { recursive: true });
  await page.screenshot({ path: path.join(OUT, name) });
}

/** La carte « Nouveautés » déjà fermée : l'Accueil nominal se montre tel que le gérant le verra ensuite. */
async function newsSeen(page: Page): Promise<void> {
  await page.addInitScript((key) => localStorage.setItem(key, "1"), NEWS_SEEN_KEY);
}

test("Accueil, cas nominal", async ({ page }) => {
  await newsSeen(page);
  await shot(page, routes.accueil(), "01-accueil-nominal.png", async (p) => {
    await expect(p.locator("[data-money-block]")).toBeVisible();
    await expect(p.locator("[data-alerts]")).toBeVisible();
    await p.waitForTimeout(600);
  });
});

test("Accueil, carte « Nouveautés » au premier lancement", async ({ page }) => {
  await shot(page, routes.accueil(), "02-accueil-nouveautes.png", async (p) => {
    await expect(p.locator('[data-card="nouveautes"]')).toBeVisible();
    await p.waitForTimeout(400);
  });
});

test("Accueil, vide de première utilisation", async ({ page }, testInfo: TestInfo) => {
  await newsSeen(page);
  await shot(page, routes.accueil(), "03-accueil-premiere-utilisation.png", async (p) => {
    // Inatteignable depuis le jeu e2e (il porte des documents) : le banc monte les vrais composants.
    await mountAccueil(p, testInfo, "vide-de-depart", BANC_ACCUEIL);
    await expect(p.locator('[data-banc-accueil="vide-de-depart"]')).toBeVisible();
    await p.waitForTimeout(500);
  });
});

test("Récap du jour", async ({ page }) => {
  await shot(page, routes.journee({ jour: COMPTA_MONTH.busyDay() }), "04-recap-du-jour.png", async (p) => {
    await expect(p.locator("[data-day-figures]")).toBeVisible();
    await p.waitForTimeout(500);
  });
});

test("Statistiques, classement d'un mois", async ({ page }) => {
  await shot(page, routes.statistiques({ ref: COMPTA_MONTH.ref() }), "05-statistiques.png", async (p) => {
    await expect(p.locator("[data-classement]")).toBeVisible();
    await p.waitForTimeout(500);
  });
});
