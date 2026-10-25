import { mkdirSync } from "node:fs";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { routes } from "../../src/app-shell/routes";
import { SEED } from "../fixtures/seed";
import { SUPPLIER } from "../fixtures/supplier";
import { waitForHydration } from "../helpers/hydration";

/**
 * Captures de revue de la phase 1 « intuitif » (25/10/2026, 390 × 844) : les écrans touchés — Accueil sans
 * la carte « Nouveautés », carnet fournisseur et « Marquer remboursée », Catalogue (œil sur les masqués
 * seulement), À encaisser, fiche client et lot (« Ventes et commandes »). Hors des suites :
 * `NUREA_CAPTURES=1 npx playwright test captures/phase1-intuitif --project=Desktop`.
 */

const OUT = process.env.NUREA_CAPTURES_DIR ?? path.join(process.cwd(), "migration-artifacts", "captures-phase1");

test.skip(!process.env.NUREA_CAPTURES, "Captures de revue : NUREA_CAPTURES=1 pour les produire.");
test.use({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });

async function shot(page: Page, url: string, name: string, ready?: (page: Page) => Promise<void>) {
  await page.goto(url);
  await waitForHydration(page.locator("[data-tabbar] a").first());
  // L'indicateur des outils de `next dev` n'existe pas en production : il ne figure pas sur une capture.
  await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" });
  await ready?.(page);
  await page.waitForTimeout(900);
  mkdirSync(OUT, { recursive: true });
  await page.screenshot({ path: path.join(OUT, name) });
}

const fares = SEED.customers[0].id;

test("captures de la phase 1", async ({ page }) => {
  test.setTimeout(180_000);
  await shot(page, routes.accueil(), "01-accueil.png");
  await shot(page, routes.fournisseur(), "02-fournisseur-carnet.png");
  await shot(page, routes.fournisseur({ ligne: SUPPLIER.debtManual.id }), "03-dette-a-rembourser.png", (p) =>
    expect(p.locator("[data-supplier-settle]")).toBeVisible(),
  );
  await shot(page, routes.fournisseur({ ligne: SUPPLIER.debtSettled.id }), "04-dette-remboursee.png", (p) =>
    expect(p.locator("[data-supplier-settled]")).toBeVisible(),
  );
  await shot(page, routes.fournisseur({ ligne: SUPPLIER.settlement.id }), "05-remboursement.png");
  await shot(page, routes.catalogue(), "06-catalogue.png");
  await shot(page, routes.catalogue({ visibilite: "masques" }), "06b-catalogue-masques.png");
  await shot(page, routes.encaisser(), "07-a-encaisser.png");
  await shot(page, routes.client(fares), "08-fiche-client.png");
  await shot(page, routes.lot(SEED.batch.id), "09-lot.png");
});
