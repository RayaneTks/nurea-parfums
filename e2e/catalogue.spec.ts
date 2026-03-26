import { test, expect } from "@playwright/test";

function articleFor(
  page: import("@playwright/test").Page,
  cardName: RegExp | string
) {
  return page
    .locator("article")
    .filter({ has: page.getByRole("button", { name: cardName }) })
    .first();
}

function activeArticle(page: import("@playwright/test").Page) {
  return page.locator('article[data-open="true"]').first();
}

test.describe("Catalogue — parcours principaux", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.locator("#collection").waitFor({ state: "visible" });
  });

  test("affiche le titre et le compteur de créations", async ({ page }) => {
    const zone = page.locator("#collection");
    await expect(
      zone.getByRole("heading", { level: 2, name: "La Collection" })
    ).toBeVisible();
    await expect(zone.getByText(/\d+ création/)).toBeVisible();
  });

  test("ne monte aucun panneau de contact caché au chargement", async ({
    page,
  }) => {
    await expect(page.locator("article [role='region']")).toHaveCount(0);
  });

  test("filtre « Gammes Complètes » et ouvre une gamme : classiques visibles", async ({
    page,
  }) => {
    await page.getByRole("button", { name: "Gammes Complètes" }).click();
    const rabanneArticle = articleFor(page, /Gamme complète Rabanne/i);
    await rabanneArticle.getByRole("button", { name: /Rabanne/i }).click();

    const panel = rabanneArticle.getByRole("region");
    await expect(panel).toBeVisible();
    await expect(panel.getByText("Références de la maison")).toBeVisible();

    for (const classic of ["1 Million", "Invictus", "Fame", "Phantom"]) {
      await expect(
        panel.getByRole("link", { name: new RegExp(classic, "i") })
      ).toBeVisible();
    }
  });

  test("mobile : bandeau « Gamme complète » masqué quand le panneau est ouvert", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "Mobile", "Spécifique mobile");

    await page.getByRole("button", { name: "Gammes Complètes" }).click();
    const article = articleFor(page, /Gamme complète Dior/i);
    const tagStrip = article.getByTestId("perfume-tag-strip");

    await expect(tagStrip).toBeVisible();
    await expect(tagStrip).toHaveCSS("opacity", "1");

    await article.getByRole("button", { name: /Gamme complète Dior/i }).click();
    await expect(article.getByRole("region")).toBeVisible();
    await expect(tagStrip).toHaveCSS("opacity", "0");
  });

  test("Guerlain : tous les classiques sont listés dans le panneau (mobile)", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "Mobile", "Spécifique mobile");

    await page.getByRole("button", { name: "Gammes Complètes" }).click();
    const article = articleFor(page, /Gamme complète Guerlain/i);
    await article.getByRole("button", { name: /Gamme complète Guerlain/i }).click();

    const panel = article.getByRole("region");
    await expect(panel.getByText("Références de la maison")).toBeVisible();

    const classics = [
      "Shalimar",
      "Habit Rouge",
      "L'Homme Idéal",
      "Aqua Allegoria",
    ] as const;
    for (const label of classics) {
      await expect(panel.getByRole("link", { name: label })).toBeVisible();
    }
  });

  test("carte individuelle : options WhatsApp / Snapchat visibles", async ({
    page,
  }) => {
    await page
      .getByRole("button", { name: "Sélections Individuelles" })
      .click();
    const baccaratArticle = articleFor(page, /Baccarat Rouge 540/i);
    await baccaratArticle.scrollIntoViewIfNeeded();
    await baccaratArticle
      .getByRole("button", { name: /Baccarat Rouge 540/i })
      .click();

    const panel = activeArticle(page).getByRole("region");
    await expect(panel).toBeVisible();
    await expect(panel.getByText("Continuer l'échange")).toBeVisible();
    await expect(panel.getByRole("link", { name: /WhatsApp/i })).toBeVisible();
    await expect(panel.getByRole("link", { name: /Snapchat/i })).toBeVisible();
  });

  test("raccourci recherche : défile vers le catalogue et focus le champ", async ({
    page,
  }) => {
    await page.getByRole("button", { name: "Rechercher" }).click();
    const search = page.getByRole("searchbox", {
      name: /Rechercher un parfum/i,
    });
    await expect(search).toBeFocused();
  });

  test("recherche du catalogue : filtre la maison Dior", async ({ page }) => {
    await page.getByRole("button", { name: "Rechercher" }).click();
    const search = page.getByRole("searchbox", {
      name: /Rechercher un parfum/i,
    });
    await search.fill("Dior");

    await expect(
      page.getByRole("button", { name: /Gamme complète Dior/i })
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Gamme complète Rabanne/i })
    ).toHaveCount(0);
    await expect(page.getByText("Filtres :")).toBeVisible();
  });
});

test.describe("Navigation & thème", () => {
  test("page Contact accessible", async ({ page }) => {
    await page.goto("/contact");
    await expect(page).toHaveURL(/\/contact/);
    await expect(page.getByText(/Conciergerie Privée/i)).toBeVisible();
    await expect(
      page.getByRole("heading", { level: 1, name: /L'Art de/i })
    ).toBeVisible();
  });

  test("mobile : menu puis retour accueil", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "Mobile", "Menu burger mobile");

    await page.goto("/");
    await page.getByRole("button", { name: "Ouvrir le menu" }).click();
    const menu = page.getByRole("dialog", { name: "Menu principal" });
    await expect(menu).toBeVisible();
    await menu.getByRole("link", { name: "La Collection", exact: true }).click();
    await expect(page).toHaveURL(/\//);
  });

  test("mobile : bascule thème depuis le menu", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "Mobile", "Menu mobile");

    await page.goto("/");
    await page.getByRole("button", { name: "Ouvrir le menu" }).click();
    const before = await page.evaluate(() =>
      document.documentElement.classList.contains("light") ? "light" : "dark"
    );
    await page.getByRole("button", { name: "Basculer le thème" }).click();
    await expect
      .poll(async () =>
        page.evaluate(() =>
          document.documentElement.classList.contains("light") ? "light" : "dark"
        )
      )
      .not.toBe(before);
  });
});
