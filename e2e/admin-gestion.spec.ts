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
    await expect(page.getByRole("heading", { level: 1, name: "Nuréa Gestion" })).toBeVisible();
    await expect(page.getByText(/Connecte-toi pour continuer/i)).toBeVisible();
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

  /*
   * Ces tests décrivent la STRUCTURE des écrans, jamais leur contenu.
   * Les pages de gestion sont des composants serveur qui interrogent Prisma :
   * mocker les routes d'API ne change rien à ce qu'elles affichent. Les
   * anciennes assertions sur des états vides (« Aucune vente sur cette
   * période ») ne pouvaient donc plus passer dès que la base contenait des
   * données. Ce qui se vérifie ici tient quel que soit le volume.
   */

  test("Compta : titre, chiffres clés et bascule de vue", async ({ page }) => {
    await setupAdminSession(page);
    await page.goto("/admin/compta");

    await expect(page.getByRole("heading", { name: "Compta" })).toBeVisible();
    await expect(page.getByText("Encaissé", { exact: true })).toBeVisible();
    await expect(page.getByText("Marge nette", { exact: true })).toBeVisible();
    await expect(page.getByRole("radio", { name: "Ventes" })).toBeVisible();
    await expect(page.getByRole("radio", { name: "Trésorerie" })).toBeVisible();
  });

  test("Compta : la vue Trésorerie s'inscrit dans l'URL", async ({ page }) => {
    await setupAdminSession(page);
    await page.goto("/admin/compta");

    // La vue active doit survivre au partage d'un lien et au retour arrière.
    await page.getByRole("radio", { name: "Trésorerie" }).click();
    await expect(page).toHaveURL(/vue=tresorerie/);

    await page.getByRole("radio", { name: "Ventes" }).click();
    await expect(page).not.toHaveURL(/vue=tresorerie/);
  });

  test("TabBar : cinq onglets, aucun menu « Plus »", async ({ page }) => {
    await setupAdminSession(page);
    await page.goto("/admin/compta");

    const nav = page.getByRole("navigation", { name: "Navigation principale" });
    await expect(nav).toBeVisible();
    for (const label of ["Accueil", "Commandes", "Vendre", "Compta", "Catalogue"]) {
      await expect(nav.getByRole("link", { name: new RegExp(label, "i") })).toBeVisible();
    }
    // Cinq destinations exactement : un sixième onglet tronquerait les libellés.
    await expect(nav.getByRole("link")).toHaveCount(5);
  });

  test("Commandes : titre, filtres et création accessible", async ({ page }) => {
    await setupAdminSession(page);
    await page.goto("/admin/ordres");

    await expect(page.getByRole("heading", { name: "Commandes" })).toBeVisible();
    for (const filter of ["Tout", "En attente", "À traiter", "Livrées"]) {
      await expect(page.getByRole("radio", { name: filter })).toBeVisible();
    }
    await expect(page.getByRole("link", { name: /Nouvelle commande/i })).toBeVisible();
  });

  test("Vendre : client et choix du parfum atteignables", async ({ page }) => {
    await setupAdminSession(page);
    await page.goto("/admin/vendre");

    await expect(page.getByRole("heading", { name: "Vendre" })).toBeVisible();
    // Le client passe par une sheet : c'est un bouton, pas un champ.
    await expect(page.getByRole("button", { name: /Rechercher ou créer/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /parfum/i }).first()).toBeVisible();
  });
});
