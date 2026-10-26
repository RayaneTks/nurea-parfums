import { mkdirSync } from "node:fs";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { routes, withSheet } from "../../src/app-shell/routes";
import { DOCS } from "../fixtures/documents";
import { waitForHydration } from "../helpers/hydration";

/**
 * Captures de revue de la phase 2 « désistement » (26/10/2026, 390 × 844, docs/admin/desistements.md) : menu de la
 * fiche commande, feuille « Le client se désiste » (acompte gardé, rendu en partie), commande désistée, rangée
 * « En stock » du Catalogue, écran En stock et feuille d'un flacon. Rien n'est validé : la base e2e reste intacte.
 * Hors des suites : `NUREA_CAPTURES=1 npx playwright test captures/phase2-desistement --project=Desktop`.
 */

const OUT = process.env.NUREA_CAPTURES_DIR ?? path.join(process.cwd(), "migration-artifacts", "captures-phase2");

test.skip(!process.env.NUREA_CAPTURES, "Captures de revue : NUREA_CAPTURES=1 pour les produire.");
test.use({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });

async function open(page: Page, url: string) {
  await page.goto(url);
  await waitForHydration(page.locator("[data-tabbar] a").first());
  // L'indicateur des outils de `next dev` n'existe pas en production : il ne figure pas sur une capture.
  await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" });
}

async function shot(page: Page, name: string) {
  await page.waitForTimeout(700);
  mkdirSync(OUT, { recursive: true });
  await page.screenshot({ path: path.join(OUT, name) });
}

test("captures de la phase 2", async ({ page }) => {
  test.setTimeout(180_000);

  await open(page, withSheet(routes.commandes(), { doc: DOCS.unknownCost }));
  await expect(page.locator(`[data-document-sheet="${DOCS.unknownCost}"]`)).toBeVisible();
  await page.getByRole("button", { name: "Plus d'actions" }).click();
  await expect(page.getByText("Le client se désiste")).toBeVisible();
  await shot(page, "01-menu-commande.png");

  await page.getByText("Le client se désiste").click();
  await expect(page.locator('[data-withdraw-choice="keep"]')).toBeVisible();
  await shot(page, "02-desistement-garder.png");

  await page.locator('[data-withdraw-choice="part"]').click();
  await page.getByLabel("Montant rendu").fill("10");
  await shot(page, "03-desistement-rendre-une-partie.png");

  await open(page, withSheet(routes.commandes({ vue: "annulees" }), { doc: DOCS.withdrawn }));
  await expect(page.locator(`[data-document-sheet="${DOCS.withdrawn}"]`)).toBeVisible();
  await shot(page, "04-commande-desistee.png");

  await open(page, routes.catalogue());
  await expect(page.getByText("En stock", { exact: true })).toBeVisible();
  await shot(page, "05-catalogue-rangee-en-stock.png");

  await open(page, routes.stock());
  await shot(page, "06-en-stock.png");
  await page.getByText("Sauvage · 80 ml").click();
  await expect(page.getByRole("button", { name: "Retirer du stock" })).toBeVisible();
  await shot(page, "07-flacon.png");
});
