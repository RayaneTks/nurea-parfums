import { mkdirSync } from "node:fs";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { routes } from "../../src/app-shell/routes";
import { COMPTA_MONTH, JOURNAL_MONTH } from "../fixtures/compta";
import { waitForHydration } from "../helpers/hydration";
import { simulateKeyboard } from "../helpers/layoutInvariants";
import { margeNetteRow } from "../routes";

/**
 * Captures de revue du jalon J12 (390 × 844, iPhone 12-16) : Compta vue Ventes (mois), détail de la Marge nette,
 * vue Trésorerie, Journal, sheet de transfert clavier ouvert. Hors des suites :
 * `NUREA_CAPTURES=1 npx playwright test captures/j12 --project=Desktop`.
 */

const OUT = path.join(process.cwd(), "migration-artifacts", "captures-j12");

test.skip(!process.env.NUREA_CAPTURES, "Captures de revue : NUREA_CAPTURES=1 pour les produire.");
test.use({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });

async function shot(page: Page, url: string, name: string, prepare?: (page: Page) => Promise<void>) {
  await page.goto(url);
  await waitForHydration(page.locator("[data-tabbar] a").first());
  // L'indicateur des outils de `next dev` n'existe pas en production : il ne figure pas sur une capture de revue.
  await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" });
  await page.waitForTimeout(900);
  await prepare?.(page);
  mkdirSync(OUT, { recursive: true });
  await page.screenshot({ path: path.join(OUT, name) });
}

test("Compta, vue Ventes du mois", async ({ page }) => {
  await shot(page, routes.compta(), "01-compta-ventes-mois.png", async (p) => {
    await expect(p.locator("[data-sales-figures]")).toBeVisible();
    await p.waitForTimeout(800);
  });
});

test("Compta, vue Ventes d'un mois avec dépense : détail de la Marge nette", async ({ page }) => {
  const ref = COMPTA_MONTH.ref();
  await shot(page, routes.compta({ ref }), "02-detail-marge-nette.png", async (p) => {
    const row = p.getByRole("button", { name: margeNetteRow(ref), exact: true });
    await waitForHydration(row);
    await row.tap();
    await expect(p.locator("[data-marge-nette-sheet]")).toBeVisible();
    await p.waitForTimeout(700);
  });
});

test("Compta, vue Trésorerie", async ({ page }) => {
  await shot(page, routes.compta({ vue: "tresorerie" }), "03-compta-tresorerie.png", async (p) => {
    await expect(p.locator("[data-treasury]")).toBeVisible();
  });
});

test("Journal d'un mois", async ({ page }) => {
  await shot(page, routes.journal({ mois: JOURNAL_MONTH.key() }), "04-journal.png", async (p) => {
    await expect(p.locator("[data-journal]")).toBeVisible();
  });
});

test("Sheet de transfert depuis une poche, clavier ouvert sur le montant", async ({ page }) => {
  await shot(page, routes.compta({ vue: "tresorerie" }), "05-transfert-clavier.png", async (p) => {
    const pocket = p.getByRole("button", { name: "Poche Coffre", exact: true });
    await waitForHydration(pocket);
    await pocket.tap();
    await p.waitForTimeout(500);
    await p.getByRole("button", { name: "Transférer", exact: true }).last().tap();
    const sheet = p.locator('[data-vaul-drawer][data-state="open"]').last();
    await expect(sheet.locator("[data-movement-sheet]")).toBeVisible();
    await sheet.getByRole("group", { name: "Vers" }).getByRole("button", { name: "Compte pro", exact: true }).tap();
    const input = sheet.getByLabel("Montant", { exact: true });
    await input.fill("300");
    await p.waitForTimeout(400);
    await simulateKeyboard(p, 336);
    await input.focus();
    await expect(input).toBeFocused();
    await p.waitForTimeout(900);
  });
});
