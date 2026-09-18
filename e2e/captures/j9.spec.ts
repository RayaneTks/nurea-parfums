import { mkdirSync } from "node:fs";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { routes } from "../../src/app-shell/routes";
import { waitForHydration } from "../helpers/hydration";

/**
 * Captures de revue du jalon J9 (390 × 844, iPhone 12-16) : composeur vide, vente d'une ligne prête à encaisser,
 * bascule Commande avec client et acompte, carte de confirmation. Hors des suites :
 * `NUREA_CAPTURES=1 npx playwright test captures/j9 --project=Desktop`.
 */

const OUT = path.join(process.cwd(), "migration-artifacts", "captures-j9");

test.skip(!process.env.NUREA_CAPTURES, "Captures de revue : NUREA_CAPTURES=1 pour les produire.");
test.use({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
test.describe.configure({ mode: "serial" });

async function open(page: Page) {
  await page.goto(routes.vendre());
  await waitForHydration(page.locator("[data-tabbar] a").first());
  // L'indicateur des outils de `next dev` n'existe pas en production : il ne figure pas sur une capture de revue.
  await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" });
  await expect(page.locator("[data-recent-tile]").first()).toBeVisible();
  await page.waitForTimeout(600);
}

async function shot(page: Page, name: string) {
  mkdirSync(OUT, { recursive: true });
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(OUT, name) });
}

const tile = (page: Page, name: string) => page.locator("[data-recent-tile]").filter({ hasText: name }).first();

test("composeur vide, vente d'une ligne, commande avec client et acompte, carte de confirmation", async ({ page }) => {
  await page.addInitScript(() => localStorage.clear());
  await open(page);
  await shot(page, "01-composeur-vide.png");

  await tile(page, "Asad").tap();
  await expect(page.locator("[data-composer-cta]")).toContainText("Encaisser");
  await page.evaluate(() => document.getElementById("admin-scroll-root")?.scrollTo({ top: 0 }));
  await shot(page, "02-vente-une-ligne-prete.png");

  await page.getByRole("radio", { name: "Commande" }).tap();
  await page.locator("[data-composer-cta]").tap();
  const sheet = page.locator('[data-vaul-drawer][data-state="open"]');
  const fares = sheet.getByRole("button", { name: "Fares Benali" });
  await waitForHydration(fares);
  await fares.tap();
  await expect(sheet).toBeHidden();
  await page.getByRole("button", { name: "Demain", exact: true }).tap();
  await page.getByRole("button", { name: "La moitié", exact: true }).tap();
  await expect(page.locator("[data-composer-cta]")).toContainText("Créer la commande · acompte");
  await page.locator("[data-payment-block]").scrollIntoViewIfNeeded();
  await shot(page, "03-commande-client-acompte.png");

  await page.locator("[data-composer-cta]").tap();
  await expect(page.locator("[data-confirmation-card]")).toBeVisible();
  await page.waitForTimeout(900);
  await shot(page, "04-carte-de-confirmation.png");
});
