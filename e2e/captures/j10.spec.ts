import { mkdirSync } from "node:fs";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { routes } from "../../src/app-shell/routes";
import { SEED } from "../fixtures/seed";
import { waitForHydration } from "../helpers/hydration";
import { simulateKeyboard } from "../helpers/layoutInvariants";

/**
 * Captures de revue du jalon J10 (390 × 844, iPhone 12-16) : liste Clients, fiche d'un client qui doit de l'argent,
 * formulaire client clavier ouvert sur le téléphone, sheet de relance. Hors des suites :
 * `NUREA_CAPTURES=1 npx playwright test captures/j10 --project=Desktop`.
 */

const OUT = path.join(process.cwd(), "migration-artifacts", "captures-j10");

test.skip(!process.env.NUREA_CAPTURES, "Captures de revue : NUREA_CAPTURES=1 pour les produire.");
test.use({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });

const NORA = SEED.customers.find((customer) => customer.fullName === "Nora Belkacem")?.id ?? "";

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

test("liste des clients", async ({ page }) => {
  await shot(page, routes.clients(), "01-clients-liste.png");
});

test("fiche client avec créance", async ({ page }) => {
  await shot(page, routes.client(NORA), "02-fiche-client-creance.png");
});

test("formulaire client, clavier ouvert sur le téléphone", async ({ page }) => {
  await shot(page, routes.nouveauClient({ nom: "Inès Laurent" }), "03-formulaire-client-clavier.png", async (p) => {
    const phone = p.getByLabel("Téléphone", { exact: true });
    await waitForHydration(phone);
    await phone.fill("06 12 34 56 78");
    await simulateKeyboard(p, 336);
    await phone.focus();
    await expect(phone).toBeFocused();
    await p.waitForTimeout(900);
  });
});

test("sheet de relance", async ({ page }) => {
  await shot(page, routes.client(NORA), "04-relance.png", async (p) => {
    const relancer = p.getByRole("button", { name: "Relancer", exact: true });
    await waitForHydration(relancer);
    await relancer.tap();
    await expect(p.locator('[data-vaul-drawer][data-state="open"]')).toBeVisible();
    await p.waitForTimeout(700);
  });
});
