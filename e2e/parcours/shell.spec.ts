import { expect, test, type Page } from "@playwright/test";
import { routes } from "../../src/app-shell/routes";
import { waitForHydration } from "../helpers/hydration";
import { countTaps } from "../helpers/tap";

/**
 * La coque, ce que le gérant touche en permanence (06 §1.5, §4.4 ; 07 J4, A-4) : mémoire d'onglet,
 * tap sur l'onglet actif, recherche, point de brouillon. Session ouverte par `global-setup`.
 */

const pathAndQuery = (page: Page) => {
  const url = new URL(page.url());
  return `${url.pathname}${url.search}`;
};

async function openShell(page: Page, url: string) {
  await page.goto(url);
  await waitForHydration(page.locator("[data-tabbar] a").first());
}

const tab = (page: Page, name: string) => page.locator("[data-tabbar]").getByRole("link", { name, exact: true });

test("onglet inactif : son dernier écran revient, filtres compris", async ({ page }) => {
  await openShell(page, routes.clients({ q: "fa" }));
  const taps = countTaps(page);

  await taps.tap(tab(page, "Catalogue"));
  await expect(page).toHaveURL((url) => url.pathname === "/admin/catalogue");
  await expect(tab(page, "Catalogue")).toHaveAttribute("aria-current", "page");

  await taps.tap(tab(page, "Clients"));
  await expect.poll(() => pathAndQuery(page)).toBe(routes.clients({ q: "fa" }));
  await expect(tab(page, "Clients")).toHaveAttribute("aria-current", "page");
  taps.expectAtMost(2);
});

test("onglet actif, racine filtrée : un tap efface les filtres", async ({ page }) => {
  await openShell(page, routes.catalogue({ tab: "marques", q: "dior" }));
  await tab(page, "Catalogue").click();
  await expect.poll(() => pathAndQuery(page)).toBe(routes.catalogue());
});

test("onglet actif, fiche document ouverte : un tap ferme la sheet et garde l'écran", async ({ page }) => {
  await openShell(page, routes.document({ id: "doc-inexistant", origin: "ORDER" }));
  // Depuis J8 la fiche s'ouvre vraiment (« Ce document n'existe plus ») ; pleine hauteur, au-dessus de la barre
  // d'onglets (05 §2.7), elle reçoit le doigt : le clic est remis à l'onglet pour éprouver la règle du shell.
  await expect(page.getByText("Ce document n'existe plus")).toBeVisible();
  // La sheet modale retire le reste de l'écran de l'arbre d'accessibilité : l'onglet se désigne par son attribut.
  await page.locator('[data-tabbar] [data-tab="commandes"]').dispatchEvent("click");
  await expect.poll(() => pathAndQuery(page)).toBe(routes.commandes());
  await expect(page.getByText("Ce document n'existe plus")).toBeHidden();
});

test("recherche : s'ouvre au tap, focalise le champ, mène à « Nouvelle commande » sans changer d'écran à la main", async ({ page }) => {
  await openShell(page, routes.accueil());
  const taps = countTaps(page);
  await taps.tap(page.getByRole("button", { name: "Rechercher" }));

  const palette = page.getByRole("dialog", { name: "Recherche" });
  await expect(palette).toBeVisible();
  await expect(palette.getByLabel("Rechercher", { exact: true })).toBeFocused();

  await taps.tap(palette.getByRole("button", { name: "Nouvelle commande" }));
  await expect(palette).toBeHidden();
  /*
   * Le composeur consomme `mode=commande` dans son brouillon puis le retire de l'adresse (06 E11 « Paramètres
   * d'URL », J9) : ce qui se vérifie ici, c'est l'écran atteint — onglet Vendre, bascule sur « Commande ».
   */
  await expect.poll(() => new URL(page.url()).pathname).toBe(routes.vendre());
  await expect(page.getByRole("radio", { name: "Commande" })).toHaveAttribute("aria-checked", "true");
  await expect(tab(page, "Vendre")).toHaveAttribute("aria-current", "page");
  taps.expectAtMost(2);
});

test("recherche : « Fermer » rend la main à l'écran", async ({ page }) => {
  await openShell(page, routes.commandes());
  await page.getByRole("button", { name: "Rechercher" }).click();
  const palette = page.getByRole("dialog", { name: "Recherche" });
  await palette.getByLabel("Rechercher", { exact: true }).fill("fares");
  // Recherche à la frappe (07 J8) : le client du jeu est trouvé par son nom.
  await expect(palette.getByText("Fares Benali", { exact: true })).toBeVisible();
  await palette.getByRole("button", { name: "Fermer" }).click();
  await expect(palette).toBeHidden();
  await expect(page.getByRole("heading", { level: 1, name: "Commandes" })).toBeVisible();
});

test("point de brouillon sur Vendre, nom accessible compris", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("nurea:brouillon:vendre", JSON.stringify({ v: 1, savedAt: Date.now(), value: { lignes: 1 } }));
  });
  await openShell(page, routes.accueil());
  await expect(page.getByRole("link", { name: "Vendre, brouillon en cours" })).toBeVisible();
  await expect(page.locator("[data-tab-badge]")).toHaveCount(1);
});

test("brouillon de plus de 24 h : pas de point", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("nurea:brouillon:vendre", JSON.stringify({ v: 1, savedAt: Date.now() - 25 * 3600 * 1000, value: {} }));
  });
  await openShell(page, routes.accueil());
  await expect(tab(page, "Vendre")).toBeVisible();
  await expect(page.locator("[data-tab-badge]")).toHaveCount(0);
});
