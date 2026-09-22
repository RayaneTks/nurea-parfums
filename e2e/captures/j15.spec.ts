import { mkdirSync } from "node:fs";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { routes } from "../../src/app-shell/routes";
import { waitForHydration } from "../helpers/hydration";
import { simulateKeyboard } from "../helpers/layoutInvariants";

/**
 * Captures de revue du jalon J15 (390 × 844, iPhone 12-16) : Réglages, la sheet de poche par défaut (S07),
 * l'ordre des poches (S21), la confirmation de déconnexion, le taux clavier ouvert, et les actions de la
 * recherche globale. Hors des suites :
 * `NUREA_CAPTURES=1 npx playwright test captures/j15 --project=Desktop`.
 */

const OUT = path.join(process.cwd(), "migration-artifacts", "captures-j15");

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

const sheet = (page: Page) => page.locator('[data-vaul-drawer][data-state="open"]').last();

test("Réglages", async ({ page }) => {
  await shot(page, routes.reglages(), "01-reglages.png", async (p) => {
    await expect(p.locator("[data-settings]")).toBeVisible();
  });
});

test("Réglages : poche par défaut (S07)", async ({ page }) => {
  await shot(page, routes.reglages(), "02-poche-par-defaut.png", async (p) => {
    const row = p.getByRole("button", { name: /^Poche par défaut : / });
    await waitForHydration(row);
    await row.tap();
    await expect(sheet(p).getByRole("heading", { name: "Poche par défaut", exact: true })).toBeVisible();
    await p.waitForTimeout(700);
  });
});

test("Ordre des poches (S21) depuis les Réglages", async ({ page }) => {
  await shot(page, routes.reglages(), "03-ordre-des-poches.png", async (p) => {
    const row = p.getByRole("button", { name: "Ordre des poches", exact: true });
    await waitForHydration(row);
    await row.tap();
    await expect(sheet(p).locator("[data-pocket-order-sheet]")).toBeVisible();
    await p.waitForTimeout(700);
  });
});

test("Réglages : taux DZD, clavier ouvert", async ({ page }) => {
  await shot(page, routes.reglages(), "04-taux-clavier.png", async (p) => {
    const rate = p.getByLabel("Taux DZD par défaut", { exact: true });
    await waitForHydration(rate);
    await simulateKeyboard(p, 336);
    await rate.focus();
    await expect(rate).toBeFocused();
    await p.waitForTimeout(900);
  });
});

test("Réglages : confirmation de déconnexion", async ({ page }) => {
  await shot(page, routes.reglages(), "05-deconnexion.png", async (p) => {
    const row = p.getByRole("button", { name: "Se déconnecter", exact: true });
    await waitForHydration(row);
    await row.tap();
    await expect(p.locator("[data-confirm-dialog]")).toBeVisible();
    await p.waitForTimeout(700);
  });
});

test("Recherche globale : actions « Encaisser » et « Vendre »", async ({ page }) => {
  await shot(page, routes.accueil(), "06-recherche-actions.png", async (p) => {
    const trigger = p.getByRole("button", { name: "Rechercher" });
    await waitForHydration(trigger);
    await trigger.tap();
    const dialog = p.getByRole("dialog", { name: "Recherche" });
    await expect(dialog).toBeVisible();
    await dialog.getByLabel("Rechercher", { exact: true }).fill("no");
    await expect(dialog.getByRole("button", { name: /^Encaisser / }).first()).toBeVisible();
    await p.waitForTimeout(700);
  });
});
