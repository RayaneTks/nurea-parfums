import { mkdirSync } from "node:fs";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { routes, withSheet } from "../../src/app-shell/routes";
import { formatEur, parseEurInput } from "../../src/domain/money";
import { DOCS, PASSING } from "../fixtures/documents";
import { waitForHydration } from "../helpers/hydration";
import { simulateKeyboard } from "../helpers/layoutInvariants";

/**
 * Captures de revue du jalon J8 (390 × 844, iPhone 12-16) : Commandes « À livrer » et ses groupes, fiche document
 * d'une commande partiellement livrée et partiellement payée, sheet Encaisser clavier ouvert, À encaisser. Hors des
 * suites : `NUREA_CAPTURES=1 npx playwright test captures/j8 --project=Desktop`.
 */

const OUT = path.join(process.cwd(), "migration-artifacts", "captures-j8");

test.skip(!process.env.NUREA_CAPTURES, "Captures de revue : NUREA_CAPTURES=1 pour les produire.");
test.use({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });

async function shot(page: Page, url: string, name: string, prepare?: (page: Page) => Promise<void>) {
  await page.goto(url);
  await waitForHydration(page.locator("[data-tabbar] a").first());
  // L'indicateur des outils de `next dev` n'existe pas en production : il ne figure pas sur une capture de revue.
  await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" });
  await page.waitForTimeout(600);
  await prepare?.(page);
  mkdirSync(OUT, { recursive: true });
  await page.screenshot({ path: path.join(OUT, name) });
}

const euros = (amount: string) => formatEur(parseEurInput(amount) as NonNullable<ReturnType<typeof parseEurInput>>);

test("Commandes, vue À livrer avec ses groupes", async ({ page }) => {
  await shot(page, routes.commandes(), "01-commandes-a-livrer.png");
});

test("fiche document : commande partiellement livrée et partiellement payée", async ({ page }) => {
  await shot(page, withSheet(routes.commandes(), { doc: DOCS.partial }), "02-fiche-commande-partielle.png", async (p) => {
    await expect(p.locator("[data-document-sheet]")).toBeVisible();
    await p.waitForTimeout(700);
  });
});

test("sheet Encaisser, clavier ouvert sur le montant", async ({ page }) => {
  await shot(page, routes.encaisser(), "03-encaisser-clavier.png", async (p) => {
    const amount = p.getByRole("button", { name: `Encaisser ${euros("80")} · ${PASSING.creance}` });
    await waitForHydration(amount);
    await amount.tap();
    const input = p.getByLabel("Montant encaissé", { exact: true });
    await expect(input).toBeVisible();
    await p.waitForTimeout(500);
    await simulateKeyboard(p, 336);
    await input.focus();
    await expect(input).toBeFocused();
    await p.waitForTimeout(900);
  });
});

test("À encaisser", async ({ page }) => {
  await shot(page, routes.encaisser(), "04-a-encaisser.png");
});
