import { test, expect } from "@playwright/test";

/** Carte actuellement ouverte (overlay visible) */
function activeCard(page: import("@playwright/test").Page) {
  return page.locator('[role="button"][aria-expanded="true"]');
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
    await expect(zone.getByText(/\d+ creation/)).toBeVisible();
  });

  test("filtre « Gammes Complètes » et ouvre une gamme : classiques visibles", async ({
    page,
  }) => {
    await page.getByRole("button", { name: "Gammes Complètes" }).click();
    const rabanneCard = page.getByRole("button", {
      name: /Gamme complète Rabanne/i,
    });
    await rabanneCard.click();
    await expect(
      activeCard(page).getByText("Classiques de la Maison", { exact: true })
    ).toBeVisible();

    for (const classic of ["1 Million", "Invictus", "Fame", "Phantom"]) {
      await expect(
        activeCard(page).getByRole("link", { name: new RegExp(classic, "i") })
      ).toBeVisible();
    }
  });

  test("mobile : bandeau « Gamme complète » masqué quand le panneau est ouvert", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "Mobile", "Spécifique mobile");

    await page.getByRole("button", { name: "Gammes Complètes" }).click();
    const card = page.getByRole("button", { name: /Gamme complète Dior/i });
    const tagStrip = card.getByTestId("perfume-tag-strip");

    await expect(tagStrip).toBeVisible();
    await expect(tagStrip).toHaveCSS("opacity", "1");

    await card.click();
    await expect(
      activeCard(page).getByText("Classiques de la Maison", { exact: true })
    ).toBeVisible();

    await expect(tagStrip).toHaveCSS("opacity", "0");
  });

  test("Guerlain : tous les classiques sont listés dans le panneau (mobile)", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "Mobile", "Spécifique mobile");

    await page.getByRole("button", { name: "Gammes Complètes" }).click();
    await page.getByRole("button", { name: /Gamme complète Guerlain/i }).click();
    await expect(
      activeCard(page).getByText("Classiques de la Maison", { exact: true })
    ).toBeVisible();

    const classics = [
      "Shalimar",
      "Habit Rouge",
      "L'Homme Idéal",
      "Aqua Allegoria",
    ] as const;
    for (const label of classics) {
      await expect(
        activeCard(page).getByRole("link", { name: label })
      ).toBeVisible();
    }
  });

  test("carte individuelle : overlay WhatsApp / Snapchat", async ({ page }) => {
    await page.getByRole("button", { name: "Sélections Individuelles" }).click();
    const baccarat = page
      .locator("#collection")
      .getByRole("button", { name: /Baccarat Rouge 540/i });
    await baccarat.scrollIntoViewIfNeeded();
    await baccarat.click();
    await expect(baccarat).toHaveAttribute("aria-expanded", "true");
    const panel = activeCard(page);
    await expect(
      panel.getByText("Acquerir cette creation", { exact: true })
    ).toBeVisible();
    await expect(panel.getByRole("link", { name: /WhatsApp/i })).toBeVisible();
    await expect(panel.getByRole("link", { name: /Snapchat/i })).toBeVisible();
  });

  test("Affiner la recherche : ouverture / fermeture", async ({ page }) => {
    await page.getByRole("button", { name: /Affiner la recherche/i }).click();
    await expect(page.getByRole("dialog", { name: "Recherche" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog", { name: "Recherche" })).toBeHidden();
  });

  test("recherche dans l’overlay : filtre marque Dior", async ({ page }) => {
    await page.getByRole("button", { name: /Affiner la recherche/i }).click();
    await page.getByPlaceholder("Filtrer les maisons...").fill("Dior");
    await page.getByRole("button", { name: "Dior", exact: true }).click();
    await page.getByRole("button", { name: "Voir le catalogue" }).click();
    await expect(page.getByText("Filtres :")).toBeVisible();
    await expect(page.getByText("Dior", { exact: true }).first()).toBeVisible();
  });
});

test.describe("Navigation & thème", () => {
  test("page Contact accessible", async ({ page }) => {
    await page.goto("/contact");
    await expect(page).toHaveURL(/\/contact/);
    await expect(page.getByText("Conciergerie Privee")).toBeVisible();
    await expect(
      page.getByRole("heading", { level: 1, name: /Art de/i })
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
    await page.getByRole("button", { name: "Basculer le theme" }).click();
    await expect
      .poll(async () =>
        page.evaluate(() =>
          document.documentElement.classList.contains("light") ? "light" : "dark"
        )
      )
      .not.toBe(before);
  });
});
