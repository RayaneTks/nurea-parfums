import { test, expect, type Page } from "@playwright/test";

/**
 * Parcours de la vitrine.
 *
 * Les sélecteurs passent par les rôles et les libellés visibles : ils décrivent
 * ce que le visiteur perçoit, pas la structure du DOM, et survivent donc à une
 * refonte d'habillage.
 */

const CARD = "#collection button[aria-label]";

/**
 * Le catalogue est rendu par le serveur : il est *visible* bien avant d'être
 * *interactif*. Agir entre les deux ferait porter les frappes dans le vide —
 * l'hydratation réinitialiserait ensuite le champ. On attend donc la fin du
 * trafic réseau, seul signal disponible depuis l'extérieur de l'application.
 */
async function openCatalogue(page: Page) {
  await page.goto("/", { waitUntil: "networkidle" });
  await page.locator("#collection").waitFor({ state: "visible" });
}

function searchBox(page: Page) {
  return page.getByRole("searchbox", {
    name: /Rechercher une marque ou un parfum/i,
  });
}

test.describe("Catalogue", () => {
  test.beforeEach(async ({ page }) => openCatalogue(page));

  test("affiche le titre de section et le compteur de résultats", async ({ page }) => {
    const zone = page.locator("#collection");
    await expect(
      zone.getByRole("heading", { level: 2, name: "Le catalogue" })
    ).toBeVisible();
    await expect(
      zone.getByText(/\d+ (parfums?|résultats?|marques?)/)
    ).toBeVisible();
  });

  test("la grille est tronquée puis dépliée sur demande", async ({ page }) => {
    const before = await page.locator(CARD).count();
    const more = page.getByRole("button", { name: /Voir les \d+ références/ });

    if ((await more.count()) === 0) {
      test.skip(true, "Catalogue trop court pour être tronqué");
    }

    await more.click();
    await expect.poll(() => page.locator(CARD).count()).toBeGreaterThan(before);
  });

  test("une recherche restreint la grille et se reflète dans l'URL", async ({
    page,
  }) => {
    const firstBrand = await page
      .locator(CARD)
      .first()
      .evaluate((el) => el.querySelector("p")?.textContent?.trim() ?? "");

    await searchBox(page).fill(firstBrand);
    await expect(page.getByText("Filtres")).toBeVisible();
    await expect.poll(() => new URL(page.url()).searchParams.get("q")).toBe(
      firstBrand
    );
  });

  test("le filtre retiré depuis sa puce vide la recherche", async ({ page }) => {
    await searchBox(page).fill("Dior");
    const chip = page.getByRole("button", { name: /Retirer le filtre/ }).first();
    await expect(chip).toBeVisible();
    await chip.click();
    await expect(searchBox(page)).toHaveValue("");
  });

  test("ouvrir un parfum donne les moyens de commande, Échap referme", async ({
    page,
  }) => {
    const card = page
      .locator(`${CARD}:not([aria-label*="voir les parfums de la marque"])`)
      .first();
    await card.click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(
      dialog.getByRole("link", { name: "Snapchat" })
    ).toBeVisible();
    await expect(
      dialog.getByRole("link", { name: "WhatsApp" })
    ).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
  });

  test("changer de catégorie ramène la grille en vue", async ({ page }) => {
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.getByRole("tab", { name: "Gammes Complètes" }).click();

    await expect
      .poll(() =>
        page
          .locator("#collection")
          .evaluate((el) => el.getBoundingClientRect().top)
      )
      .toBeLessThan(160);
  });

  test("le panneau de filtres s'ouvre depuis la barre de navigation", async ({
    page,
  }) => {
    await page.getByRole("button", { name: "Filtrer le catalogue" }).click();
    await expect(
      page.getByRole("dialog", { name: "Filtrer par marques" })
    ).toBeVisible();
  });
});

test.describe("Recherche élargie", () => {
  test("suggère une référence hors catalogue", async ({ page }) => {
    await page.route("**/api/perfume-search**", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          type: "external_suggestion",
          query: "ZzApiMockParfum",
          suggestion: {
            name: "ZzApiMockParfum",
            brand: "Marque Test",
            externalId: "test-ext-1",
          },
        }),
      })
    );

    await openCatalogue(page);
    await searchBox(page).fill("ZzApiMockParfum");

    await expect(page.getByTestId("external-api-suggestion")).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByText(/Vous cherchez « ZzApiMockParfum »/i)).toBeVisible();
  });

  test("service indisponible : message de secours, aucune suggestion", async ({
    page,
  }) => {
    await page.route("**/api/perfume-search**", (route) =>
      route.fulfill({ status: 503, body: "unavailable" })
    );

    await openCatalogue(page);
    await searchBox(page).fill("ZzNoHintUnique999");

    await expect(
      page.getByText(/Aucun résultat pour « ZzNoHintUnique999 »/i)
    ).toBeVisible({ timeout: 10_000 });
    await expect(
      page.getByText(/recherche élargie est momentanément indisponible/i)
    ).toBeVisible();
    await expect(page.getByTestId("external-api-suggestion")).toHaveCount(0);
  });
});

test.describe("Navigation", () => {
  test("la barre mène à chaque page de la vitrine", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "Desktop", "Barre desktop");

    await page.goto("/");
    const nav = page.getByRole("navigation");
    await nav.getByRole("link", { name: "La Parfumerie" }).click();
    await expect(
      page.getByRole("heading", { level: 1, name: /L'excellence à votre portée/ })
    ).toBeVisible();

    await nav.getByRole("link", { name: "Contact", exact: true }).click();
    await expect(
      page.getByRole("heading", { level: 1, name: "Passer commande" })
    ).toBeVisible();
  });

  test("mobile : le menu plein écran navigue puis se referme", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "Mobile", "Menu mobile");

    await page.goto("/");
    await page.getByRole("button", { name: "Ouvrir le menu" }).click();

    const menu = page.getByRole("dialog", { name: "Menu principal" });
    await expect(menu).toBeVisible();
    await menu.getByRole("link", { name: "Contact" }).click();
    await expect(page).toHaveURL(/\/contact$/);
  });

  test("la bascule de thème change la classe du document", async ({ page }) => {
    await page.goto("/");
    const theme = () =>
      page.evaluate(() =>
        document.documentElement.classList.contains("light") ? "light" : "dark"
      );

    const before = await theme();
    await page
      .getByRole("button", { name: /Passer en thème (clair|sombre)/ })
      .first()
      .click();
    await expect.poll(theme).not.toBe(before);
  });
});
