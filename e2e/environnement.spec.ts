import { expect, test } from "@playwright/test";
import { PREPROD_BANNER_TEXT } from "../src/app-shell/preprod";
import { routes } from "../src/app-shell/routes";

/**
 * La préproduction se reconnaît au premier coup d'œil (07 §1.3, garde-fou 6), et seulement elle.
 *
 * L'attendu suit `NUREA_ENV` du lanceur, transmis à l'app par `playwright.config.ts` :
 *   npx playwright test environnement                     → ni bandeau ni suffixe
 *   NUREA_ENV=preprod npx playwright test environnement   → bandeau et « (essai) »
 * En distant (`E2E_REMOTE=1`), poser `NUREA_ENV` comme l'environnement visé.
 */

const PREPROD = process.env.NUREA_ENV?.trim() === "preprod";

test.describe(PREPROD ? "préproduction" : "hors préproduction", () => {
  test(PREPROD ? "le shell affiche le bandeau fixe" : "le shell n'affiche aucun bandeau", async ({ page }) => {
    await page.goto(routes.accueil());
    await expect(page.locator("[data-tabbar]")).toBeVisible();
    const banner = page.getByText(PREPROD_BANNER_TEXT, { exact: true });
    if (PREPROD) {
      await expect(banner).toBeVisible();
      // Non fermable, et reste en place quand l'écran défile : hors de la zone de défilement.
      await expect(page.locator("[data-preprod-banner] button")).toHaveCount(0);
      expect(await page.locator("#admin-scroll-root [data-preprod-banner]").count()).toBe(0);
    } else {
      await expect(banner).toHaveCount(0);
    }
  });

  test.describe("écran de connexion", () => {
    test.use({ storageState: { cookies: [], origins: [] } });
    test(PREPROD ? "affiche aussi le bandeau" : "sans bandeau", async ({ page }) => {
      await page.goto(routes.connexion());
      await expect(page.getByText(PREPROD_BANNER_TEXT, { exact: true })).toHaveCount(PREPROD ? 1 : 0);
    });
  });

  test(PREPROD ? "le manifeste est suffixé « (essai) »" : "le manifeste n'est pas suffixé", async ({ request }) => {
    const response = await request.get("/api/pwa/admin");
    expect(response.ok()).toBe(true);
    const manifest = (await response.json()) as { name: string; short_name: string };
    if (PREPROD) {
      expect(manifest.short_name).toBe("Nuréa Gestion (essai)");
      expect(manifest.name.endsWith(" (essai)")).toBe(true);
    } else {
      expect(manifest.short_name).toBe("Nuréa Gestion");
      expect(manifest.name).not.toContain("essai");
    }
  });
});
