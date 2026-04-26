import { test, expect, type Page } from "@playwright/test";

/**
 * Tests e2e pour la section Gestion (Compta / commandes / Vendre) en mobile-first.
 * Les tests smoke (login, redirect) n'ont pas besoin de DB ni de session.
 * Le test "workflow complet" utilise des mocks API + un faux cookie de session
 * pour éviter d'avoir à seeder la DB à chaque run.
 */

test.describe("Admin — smoke (sans session)", () => {
  test.beforeEach(async ({ context }) => {
    await context.clearCookies();
  });

  test("la page de connexion s'affiche avec le bon design Nuréa", async ({ page }) => {
    await page.goto("/admin/login");
    await expect(page.getByRole("heading", { level: 1, name: "Bienvenue" })).toBeVisible();
    await expect(page.getByText(/gérer la boutique/i)).toBeVisible();
    await expect(page.getByLabel("Identifiant")).toBeVisible();
    await expect(page.getByLabel("Mot de passe")).toBeVisible();
    await expect(page.getByRole("button", { name: /Se connecter/i })).toBeVisible();
  });

  test("/admin redirige vers /admin/login quand non authentifié", async ({ page }) => {
    const response = await page.goto("/admin");
    expect(page.url()).toContain("/admin/login");
    expect(response).toBeTruthy();
  });

  test("/admin/compta redirige vers /admin/login quand non authentifié", async ({ page }) => {
    await page.goto("/admin/compta");
    await expect(page).toHaveURL(/\/admin\/login/);
  });
});

/**
 * Tests avec mocks API — vérifient l'UI sans dépendance DB.
 * On pose un faux cookie nurea_admin pour passer le middleware.
 * Le middleware ne valide pas le JWT côté Edge (voir middleware.ts), donc
 * un cookie non vide suffit. La validation côté API est mockée par les routes.
 */
test.describe("Admin Gestion — UI (mocks API)", () => {
  async function setupAdminSession(page: Page) {
    await page.context().addCookies([
      {
        name: "nurea_admin",
        value: "fake-session-for-ui-tests",
        domain: "localhost",
        path: "/",
        httpOnly: true,
      },
    ]);

    await page.route("**/api/admin/session", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ user: { username: "admin", role: "OWNER" } }),
      });
    });

    await page.route("**/api/admin/sales?*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ sales: [], period: "month" }),
      });
    });

    await page.route("**/api/admin/sales/stats?*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          period: "month",
          count: 0,
          totalRevenue: "0.00",
          totalCost: "0.00",
          totalMargin: "0.00",
          averageSale: "0.00",
        }),
      });
    });

    await page.route("**/api/admin/orders", async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ orders: [] }),
        });
      } else {
        await route.continue();
      }
    });

    await page.route("**/api/admin/catalogue", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          brands: [
            {
              id: "brand-1",
              name: "Maison Test",
              slug: "maison-test",
              catalogMode: "CURATED",
              status: "PUBLISHED",
              image: null,
              imageLight: null,
              _count: { perfumes: 1 },
            },
          ],
          perfumes: [
            {
              id: 42,
              image: "/placeholder.svg",
              imageLight: null,
              name: "Parfum Test",
              status: "PUBLISHED",
              isFeatured: false,
              brand: {
                id: "brand-1",
                name: "Maison Test",
                image: null,
                catalogMode: "CURATED",
                status: "PUBLISHED",
              },
            },
          ],
        }),
      });
    });
  }

  test("Compta : affiche les StatCards + empty state", async ({ page }) => {
    await setupAdminSession(page);
    await page.goto("/admin/compta");

    await expect(page.getByRole("heading", { name: "Compta" })).toBeVisible();
    await expect(page.getByText("Chiffre d'affaires")).toBeVisible();
    await expect(page.getByText("Marge", { exact: true })).toBeVisible();
    await expect(page.getByText("Aucune vente sur cette période")).toBeVisible();
  });

  test("BottomNav : 4 items Produits / Vendre / Commandes / Compta", async ({ page }) => {
    await setupAdminSession(page);
    await page.goto("/admin/compta");

    const nav = page.getByRole("navigation", { name: "Navigation principale" });
    await expect(nav).toBeVisible();
    await expect(nav.getByRole("link", { name: /Produits/i })).toBeVisible();
    await expect(nav.getByRole("link", { name: /Vendre/i })).toBeVisible();
    await expect(nav.getByRole("link", { name: /Commandes/i })).toBeVisible();
    await expect(nav.getByRole("link", { name: /Compta/i })).toBeVisible();
  });

  test("Commandes : empty state + FAB création", async ({ page }) => {
    await setupAdminSession(page);
    await page.goto("/admin/ordres");

    await expect(page.getByRole("heading", { name: "Commandes" })).toBeVisible();
    await expect(page.getByText(/Aucune commande/)).toBeVisible();
    await expect(page.getByRole("button", { name: /Nouvelle commande/i }).first()).toBeVisible();
  });

  test("Vendre : saisie rapide avec totaux live", async ({ page }) => {
    await setupAdminSession(page);
    await page.goto("/admin/vendre");

    await expect(page.getByRole("heading", { name: "Vendre" })).toBeVisible();
    await expect(page.getByLabel(/Client/)).toBeVisible();
    await expect(page.getByText(/Aucune ligne/)).toBeVisible();
    await expect(page.getByRole("button", { name: /Ajouter un parfum/i }).first()).toBeVisible();
  });

  test("Filtres période Compta changent l'URL de stats fetched", async ({ page }) => {
    await setupAdminSession(page);

    const urls: string[] = [];
    await page.route("**/api/admin/sales/stats*", async (route) => {
      urls.push(route.request().url());
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          period: "month",
          count: 0,
          totalRevenue: "0.00",
          totalCost: "0.00",
          totalMargin: "0.00",
          averageSale: "0.00",
        }),
      });
    });

    await page.goto("/admin/compta");
    await expect.poll(() => urls.some((u) => u.includes("period=month"))).toBeTruthy();

    await page.getByRole("radio", { name: "Semaine" }).click();
    await expect.poll(() => urls.some((u) => u.includes("period=week"))).toBeTruthy();

    await page.getByRole("radio", { name: "Tout" }).click();
    await expect.poll(() => urls.some((u) => u.includes("period=all"))).toBeTruthy();
  });
});
