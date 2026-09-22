import { mkdirSync } from "node:fs";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { routes } from "../../src/app-shell/routes";
import { SEED, seedPerfumeId } from "../fixtures/seed";
import { waitForHydration } from "../helpers/hydration";
import { simulateKeyboard } from "../helpers/layoutInvariants";

/**
 * Captures de revue du jalon J11 (390 × 844, iPhone 12-16) : liste des parfums, fiche avec galerie story,
 * formulaire parfum clavier ouvert, onglet Marques. Hors des suites : ne s'exécute qu'avec
 * `NUREA_CAPTURES=1 npx playwright test captures/j11 --project=Desktop`.
 */

const OUT = path.join(process.cwd(), "migration-artifacts", "captures-j11");

test.skip(!process.env.NUREA_CAPTURES, "Captures de revue : NUREA_CAPTURES=1 pour les produire.");
test.use({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });

async function shot(page: Page, url: string, name: string, prepare?: (page: Page) => Promise<void>) {
  await page.goto(url);
  await waitForHydration(page.locator("[data-tabbar] a").first());
  await page.waitForTimeout(600);
  await prepare?.(page);
  mkdirSync(OUT, { recursive: true });
  await page.screenshot({ path: path.join(OUT, name) });
}

test("liste des parfums", async ({ page }) => {
  await shot(page, routes.catalogue(), "01-catalogue-parfums.png");
});

test("fiche parfum avec galerie story", async ({ page }) => {
  await shot(page, routes.parfum(seedPerfumeId(SEED.storyVisuals.perfume)), "02-fiche-parfum-visuels-story.png", async (p) => {
    // En bas de la fiche : la galerie entière, au-dessus du CTA « Vendre ».
    await p.evaluate(() => {
      const root = document.getElementById("admin-scroll-root");
      if (root) root.scrollTop = root.scrollHeight;
    });
    await p.waitForTimeout(600);
  });
});

test("formulaire parfum, clavier ouvert", async ({ page }) => {
  await shot(page, routes.modifierParfum(seedPerfumeId("Sauvage")), "03-formulaire-parfum-clavier.png", async (p) => {
    await simulateKeyboard(p, 336);
    const price = p.getByLabel("Prix du 80 ml", { exact: true });
    await price.focus();
    await expect(price).toBeFocused();
    await p.waitForTimeout(900);
  });
});

test("onglet Marques", async ({ page }) => {
  await shot(page, routes.catalogue({ tab: "marques" }), "04-catalogue-marques.png");
});
