import { mkdirSync } from "node:fs";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { routes } from "../../src/app-shell/routes";
import { STOCK_BOTTLE_ID } from "../fixtures/documents";
import { waitForHydration } from "../helpers/hydration";

/**
 * Captures de revue de la phase 3 « vendre depuis le stock » (26/10/2026, 390 × 844, docs/admin/desistements.md) :
 * rangée « En stock » de l'Accueil, feuille d'un flacon avec « Vendre ce flacon », Vendre préremplie, bande « Déjà en
 * stock ». Rien n'est validé : la base e2e reste intacte.
 * Hors des suites : `NUREA_CAPTURES=1 npx playwright test captures/phase3-revente --project=Desktop`.
 */

const OUT = process.env.NUREA_CAPTURES_DIR ?? path.join(process.cwd(), "migration-artifacts", "captures-phase3");

test.skip(!process.env.NUREA_CAPTURES, "Captures de revue : NUREA_CAPTURES=1 pour les produire.");
test.use({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });

async function open(page: Page, url: string) {
  await page.goto(url);
  await waitForHydration(page.locator("[data-tabbar] a").first());
  await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" });
}

async function shot(page: Page, name: string) {
  await page.waitForTimeout(700);
  mkdirSync(OUT, { recursive: true });
  await page.screenshot({ path: path.join(OUT, name) });
}

test("captures de la phase 3", async ({ page }) => {
  test.setTimeout(180_000);

  await open(page, routes.accueil());
  const row = page.getByRole("link", { name: /En stock/ });
  await row.scrollIntoViewIfNeeded();
  await shot(page, "01-accueil-rangee-en-stock.png");

  await open(page, routes.stock());
  await page.getByText("Sauvage · 80 ml").click();
  await expect(page.getByRole("button", { name: "Vendre ce flacon" })).toBeVisible();
  await shot(page, "02-flacon-vendre.png");

  await open(page, routes.vendre({ flacon: STOCK_BOTTLE_ID }));
  await expect(page.locator("[data-composer-cta]")).toBeVisible();
  await shot(page, "03-vendre-flacon-au-ticket.png");

  await page.evaluate(() => window.localStorage.clear());
  await open(page, routes.vendre());
  await expect(page.locator("[data-stock-strip]")).toBeVisible();
  await shot(page, "04-vendre-deja-en-stock.png");
});
