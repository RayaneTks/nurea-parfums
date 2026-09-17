import { expect, test, type Page } from "@playwright/test";
import { routes } from "../../src/app-shell/routes";
import { waitForHydration } from "../helpers/hydration";

/**
 * Dédoublonnage des marques (02 §4.5 ; 06 S05, E17 ; 07 J11) : « louis vuitton » désigne « Louis Vuitton »
 * déjà au catalogue, avec une notice `info` — jamais une bannière d'erreur, jamais une seconde marque.
 */

async function openShell(page: Page, url: string) {
  await page.goto(url);
  await waitForHydration(page.locator("[data-tabbar] a").first());
}

const drawer = (page: Page) => page.locator('[data-vaul-drawer][data-state="open"]');

test("« louis vuitton » sélectionne Louis Vuitton existante avec une notice info, sans doublon", async ({ page }, testInfo) => {
  testInfo.setTimeout(120_000);

  // 1. La marque existe (E17, création par l'écran).
  await openShell(page, routes.nouvelleMarque());
  await waitForHydration(page.getByLabel("Nom de la marque", { exact: true }));
  await page.getByLabel("Nom de la marque", { exact: true }).fill("Louis Vuitton");
  await page.getByRole("button", { name: "Ajouter la marque", exact: true }).tap();
  await expect(page).toHaveURL((url) => url.pathname === "/admin/catalogue" && url.searchParams.get("tab") === "marques", { timeout: 30_000 });
  await expect(page.getByRole("link", { name: "Louis Vuitton", exact: true })).toBeVisible();

  // 2. E17 : retaper le nom autrement ne crée rien — notice « existe déjà » et CTA qui ouvre l'existante.
  await openShell(page, routes.nouvelleMarque());
  await waitForHydration(page.getByLabel("Nom de la marque", { exact: true }));
  await page.getByLabel("Nom de la marque", { exact: true }).fill("LOUIS VUITTON");
  const brandNotice = page.locator('[data-notice="info"]');
  await expect(brandNotice).toContainText("Louis Vuitton existe déjà.");
  await expect(page.getByRole("button", { name: "Ouvrir Louis Vuitton", exact: true })).toBeVisible();
  // (L'annonceur de route de Next porte aussi `role="alert"` : on regarde l'écran seulement.)
  await expect(page.locator('#main-content [role="alert"]')).toHaveCount(0);

  // 3. S05 depuis le formulaire parfum : la saisie désigne l'existante, « Créer la marque » n'est pas proposé.
  await openShell(page, routes.nouveauParfum());
  await waitForHydration(page.getByRole("button", { name: "Choisir la marque", exact: true }).first());
  await page.getByRole("button", { name: "Choisir la marque", exact: true }).first().tap();
  await expect(drawer(page)).toBeVisible();
  await drawer(page).getByLabel("Rechercher une marque", { exact: true }).fill("louis vuitton");
  const sheetNotice = drawer(page).locator('[data-notice="info"]');
  await expect(sheetNotice).toContainText("Louis Vuitton est déjà au catalogue");
  await expect(drawer(page).getByText(/Créer la marque/)).toHaveCount(0);
  await expect(drawer(page).locator('[role="alert"]')).toHaveCount(0);
  await drawer(page).getByRole("button", { name: /^Louis Vuitton\b/ }).first().tap();
  await expect(drawer(page)).toBeHidden();

  await expect(page.getByRole("button", { name: "Marque : Louis Vuitton. Changer", exact: true })).toBeVisible();
  await expect(page.locator('[data-notice="info"]')).toHaveText("Rattaché à Louis Vuitton, déjà au catalogue.");

  // 4. Le parfum est rangé sous la marque existante.
  await page.getByLabel("Nom du parfum", { exact: true }).fill("Ombre Nomade");
  await page.getByLabel("Prix du 80 ml", { exact: true }).fill("310");
  await page.getByRole("button", { name: "Ajouter au catalogue", exact: true }).tap();
  await expect(page.getByRole("heading", { level: 1, name: "Ombre Nomade" })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole("link", { name: "Louis Vuitton" })).toBeVisible();

  // 5. Une seule marque « Louis Vuitton », qui porte le parfum.
  await openShell(page, routes.catalogue({ tab: "marques", q: "vuitton" }));
  await expect(page.getByRole("heading", { level: 2, name: "1 marque" })).toBeVisible();
  await expect(page.getByText("Sélection · 1 parfum", { exact: true })).toBeVisible();
});
