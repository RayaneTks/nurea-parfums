import { mkdirSync } from "node:fs";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { routes } from "../../src/app-shell/routes";
import { NEWS_SEEN_KEY } from "../../src/contracts/stats";
import { waitForHydration } from "../helpers/hydration";

/**
 * Captures de revue du jalon J16 (390 × 844, iPhone 12-16) : la page hors ligne (E09), avec et sans
 * ticket en cours, et la carte d'installation dans ses deux modes (06 E01 zone 2). Hors des suites :
 * `NUREA_CAPTURES=1 npx playwright test captures/j16 --project=Desktop`.
 */

const OUT = path.join(process.cwd(), "migration-artifacts", "captures-j16");

const IPHONE_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1";

test.skip(!process.env.NUREA_CAPTURES, "Captures de revue : NUREA_CAPTURES=1 pour les produire.");
test.use({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });

function save(page: Page, name: string) {
  mkdirSync(OUT, { recursive: true });
  return page.screenshot({ path: path.join(OUT, name) });
}

/** L'indicateur des outils de `next dev` n'existe pas en production : il ne figure pas sur une capture. */
async function hideDevTools(page: Page) {
  await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" });
}

test("E09 — page hors ligne", async ({ page }) => {
  await page.goto("/admin-offline.html");
  await expect(page.getByRole("heading", { name: "Pas de connexion" })).toBeVisible();
  await save(page, "01-hors-ligne.png");
});

test("E09 — page hors ligne avec un ticket en cours", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("nurea:brouillon:vendre", JSON.stringify({ v: 1, savedAt: Date.now(), value: { lignes: 1 } }));
  });
  await page.goto("/admin-offline.html");
  await expect(page.getByText("Ton ticket en cours est gardé sur ce téléphone.")).toBeVisible();
  await save(page, "02-hors-ligne-brouillon.png");
});

test("E01 — carte d'installation, Safari iOS", async ({ page }) => {
  await page.addInitScript((ua) => {
    Object.defineProperty(navigator, "userAgent", { get: () => ua });
    // `navigator.standalone` : la propriété par laquelle la détection reconnaît le vrai Safari iOS.
    Object.defineProperty(navigator, "standalone", { get: () => false, configurable: true });
  }, IPHONE_UA);
  await page.addInitScript((key) => localStorage.setItem(key, "1"), NEWS_SEEN_KEY);
  await page.goto(routes.accueil());
  await waitForHydration(page.locator("[data-tabbar] a").first());
  await hideDevTools(page);
  await expect(page.locator('[data-card="installation"]')).toBeVisible();
  await page.waitForTimeout(600);
  await save(page, "03-carte-installation-ios.png");
});

test("E01 — carte d'installation, invite du navigateur", async ({ page }) => {
  await page.addInitScript((key) => localStorage.setItem(key, "1"), NEWS_SEEN_KEY);
  await page.goto(routes.accueil());
  await waitForHydration(page.locator("[data-tabbar] a").first());
  await hideDevTools(page);
  await page.evaluate(() => {
    const event = new Event("beforeinstallprompt") as Event & { prompt?: () => Promise<void>; userChoice?: Promise<unknown> };
    event.prompt = async () => undefined;
    event.userChoice = Promise.resolve({ outcome: "dismissed" });
    window.dispatchEvent(event);
  });
  await expect(page.locator('[data-card="installation"]').getByRole("button", { name: "Installer", exact: true })).toBeVisible();
  await page.waitForTimeout(600);
  await save(page, "04-carte-installation-invite.png");
});
