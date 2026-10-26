import { mkdirSync } from "node:fs";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { routes, withSheet } from "../../src/app-shell/routes";
import { DOCS } from "../fixtures/documents";
import { withE2eDb } from "../helpers/db";
import { waitForHydration } from "../helpers/hydration";

/**
 * Captures de revue de la phase 4 (26/10/2026, 390 × 844, docs/admin/desistements.md) : la commande désistée du jeu
 * est rattachée à une fiche « Faycal Amri » (base e2e locale, remise à zéro au prochain lancement), puis fiche client
 * avec l'acompte laissé, Vendre avec le rappel et la remise, fiche de la désistée, « à relancer » de l'Accueil.
 * Hors des suites : `NUREA_CAPTURES=1 npx playwright test captures/phase4-acompte --project=Desktop`.
 */

const OUT = process.env.NUREA_CAPTURES_DIR ?? path.join(process.cwd(), "migration-artifacts", "captures-phase4");

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

test("captures de la phase 4", async ({ page }) => {
  test.setTimeout(180_000);
  const customerId = await withE2eDb(async (db) => {
    const customer =
      (await db.customer.findFirst({ where: { fullName: "Faycal Amri" } })) ?? (await db.customer.create({ data: { fullName: "Faycal Amri" } }));
    await db.saleDocument.update({ where: { id: DOCS.withdrawn }, data: { customerId: customer.id } });
    return customer.id;
  });

  await open(page, routes.client(customerId));
  await expect(page.locator("[data-kept-deposits]")).toBeVisible();
  await shot(page, "01-fiche-client-acompte-laisse.png");

  // Le cache des chiffres sert d'abord une valeur d'avant le rattachement (direct en base, sans invalidation) puis se
  // rafraîchit : on recharge jusqu'à voir le rappel.
  await expect(async () => {
    await page.evaluate(() => window.localStorage.clear());
    await open(page, routes.vendre({ client: customerId }));
    await expect(page.locator("[data-kept-deposit-reminder]")).toBeVisible({ timeout: 3_000 });
  }).toPass({ timeout: 90_000 });
  await page.getByRole("button", { name: /^Ajouter .* en stock/ }).first().click();
  await shot(page, "02-vendre-rappel-acompte.png");

  await page.getByRole("button", { name: "Lui faire une remise" }).click();
  await shot(page, "03-vendre-montant-remise.png");
  await page.getByRole("button", { name: /^Retirer .* du prix$/ }).click();
  await expect(page.getByRole("button", { name: "Retirer la remise" })).toBeVisible();
  await shot(page, "04-vendre-remise-appliquee.png");

  await open(page, withSheet(routes.client(customerId), { doc: DOCS.withdrawn }));
  await expect(page.locator(`[data-document-sheet="${DOCS.withdrawn}"]`)).toBeVisible();
  await shot(page, "05-desistee-acompte-garde.png");

  await page.evaluate(() => window.localStorage.clear());
  await open(page, routes.accueil());
  await shot(page, "06-accueil-a-relancer.png");
});
