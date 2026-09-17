import { expect, test, type Page } from "@playwright/test";
import { routes } from "../../src/app-shell/routes";
import { SESSION_EXPIRED_MESSAGE } from "../../src/app-shell/session-hint";
import { waitForHydration } from "../helpers/hydration";
import { countTaps } from "../helpers/tap";
import { ADMIN, SESSION_COOKIE, lockAccount } from "../support/env";

/**
 * E18 — Connexion (06 §3.6, 04 §8.5), critères de 07 J4 : connexion par l'écran, refus
 * indifférencié, blocage après 5 échecs avec sa durée réelle, expiration de session avec retour à
 * l'écran d'origine.
 */

const REFUSED = "Identifiant ou mot de passe incorrect.";
const LOCKED = "Trop d'essais. Réessaie dans 1 min.";

async function openLogin(page: Page, url: string = routes.connexion()) {
  await page.goto(url);
  await waitForHydration(page.getByRole("button", { name: "Se connecter" }));
}

/** Le message du formulaire (et non l'annonceur de route de Next, qui porte aussi `role="alert"`). */
const formAlert = (page: Page) => page.getByRole("form", { name: "Connexion" }).getByRole("alert");

async function fill(page: Page, username: string, password: string) {
  await page.getByLabel("Identifiant").fill(username);
  await page.getByLabel("Mot de passe", { exact: true }).fill(password);
}

test.describe("sans session", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("connexion par l'écran : l'Accueil en un tap, sans message d'expiration à la première visite", async ({ page }) => {
    await page.goto(routes.accueil());
    await expect(page).toHaveURL((url) => url.pathname === "/admin/login" && url.searchParams.get("retour") === "/admin");
    await waitForHydration(page.getByRole("button", { name: "Se connecter" }));
    await expect(page.getByText(SESSION_EXPIRED_MESSAGE)).toHaveCount(0);

    const taps = countTaps(page);
    await fill(page, ADMIN.username, ADMIN.password);
    await taps.tap(page.getByRole("button", { name: "Se connecter" }));

    await expect(page).toHaveURL((url) => url.pathname === "/admin");
    await expect(page.getByRole("heading", { level: 1, name: "Accueil" })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Navigation principale" })).toBeVisible();
    taps.expectAtMost(1);
  });

  test("mauvais mot de passe : message exact, identifiant gardé, mot de passe à retaper", async ({ page }) => {
    await openLogin(page);
    await fill(page, ADMIN.username, "pas-le-bon-mot-de-passe");
    await page.getByRole("button", { name: "Se connecter" }).click();

    await expect(formAlert(page)).toHaveText(REFUSED);
    await expect(page).toHaveURL((url) => url.pathname === "/admin/login");
    await expect(page.getByLabel("Identifiant")).toHaveValue(ADMIN.username);
    await expect(page.getByLabel("Mot de passe", { exact: true })).toHaveValue("");
    await expect(page.getByLabel("Mot de passe", { exact: true })).toBeFocused();
  });

  test("identifiant inconnu : le même message, rien ne dit lequel est faux", async ({ page }) => {
    await openLogin(page);
    await fill(page, "personne-de-connu", "un-mot-de-passe-quelconque");
    await page.getByRole("button", { name: "Se connecter" }).click();
    await expect(formAlert(page)).toHaveText(REFUSED);
  });

  test("champs vides : dit ce qui manque, sans aller-retour", async ({ page }) => {
    await openLogin(page);
    await page.getByRole("button", { name: "Se connecter" }).click();
    await expect(page.getByText("Saisis ton identifiant.")).toBeVisible();
    await expect(page.getByText("Saisis ton mot de passe.")).toBeVisible();
    await expect(page.getByLabel("Identifiant")).toBeFocused();
  });

  test("afficher le mot de passe", async ({ page }) => {
    await openLogin(page);
    const field = page.getByLabel("Mot de passe", { exact: true });
    await field.fill("secret-visible");
    await expect(field).toHaveAttribute("type", "password");
    await page.getByRole("button", { name: "Afficher" }).click();
    await expect(field).toHaveAttribute("type", "text");
    await page.getByRole("button", { name: "Masquer" }).click();
    await expect(field).toHaveAttribute("type", "password");
  });

  test("5 échecs : « Trop d'essais. Réessaie dans 1 min. »", async ({ page }, testInfo) => {
    const account = lockAccount(testInfo.project.name);
    test.skip(account === null, "E2E_REMOTE=1 sans E2E_VERROU_USERNAME : on ne verrouille jamais le compte réel.");
    testInfo.setTimeout(120_000);
    await openLogin(page);
    for (let attempt = 1; attempt <= 4; attempt += 1) {
      await fill(page, account!.username, `mauvais-${attempt}`);
      await page.getByRole("button", { name: "Se connecter" }).click();
      await expect(formAlert(page), `essai ${attempt}`).toHaveText(REFUSED);
    }
    await fill(page, account!.username, "mauvais-5");
    await page.getByRole("button", { name: "Se connecter" }).click();
    await expect(formAlert(page)).toHaveText(LOCKED);

    // Pendant le verrou, même le bon mot de passe est refusé sans prolonger l'attente (04 §8.5).
    await fill(page, account!.username, account!.password);
    await page.getByRole("button", { name: "Se connecter" }).click();
    await expect(formAlert(page)).toHaveText(LOCKED);
  });
});

test.describe("avec la session ouverte par global-setup", () => {
  test("cookie supprimé puis navigation : « Ta session a expiré… », puis retour à l'écran d'origine", async ({ page, context }) => {
    const origin = routes.clients({ q: "fa" });
    await page.goto(origin);
    await waitForHydration(page.locator("[data-tabbar] a").first());
    await expect(page.getByRole("heading", { level: 1, name: "Clients" })).toBeVisible();

    await context.clearCookies({ name: SESSION_COOKIE });
    await page.reload();

    await expect(page).toHaveURL((url) => url.pathname === "/admin/login" && url.searchParams.get("retour") === origin);
    await expect(page.getByText(SESSION_EXPIRED_MESSAGE)).toBeVisible();

    await waitForHydration(page.getByRole("button", { name: "Se connecter" }));
    await fill(page, ADMIN.username, ADMIN.password);
    await page.getByRole("button", { name: "Se connecter" }).click();

    await expect(page).toHaveURL((url) => `${url.pathname}${url.search}` === origin);
    await expect(page.getByRole("heading", { level: 1, name: "Clients" })).toBeVisible();
  });

  test("session expirée pendant un changement d'onglet : connexion, puis l'onglet demandé", async ({ page, context }) => {
    await page.goto(routes.commandes());
    await waitForHydration(page.locator("[data-tabbar] a").first());

    await context.clearCookies({ name: SESSION_COOKIE });
    await page.getByRole("link", { name: "Catalogue" }).click();

    await expect(page).toHaveURL((url) => url.pathname === "/admin/login");
    const retour = new URL(page.url()).searchParams.get("retour");
    expect(retour).toBe(routes.catalogue());
    await expect(page.getByText(SESSION_EXPIRED_MESSAGE)).toBeVisible();

    await waitForHydration(page.getByRole("button", { name: "Se connecter" }));
    await fill(page, ADMIN.username, ADMIN.password);
    await page.getByRole("button", { name: "Se connecter" }).click();
    await expect(page).toHaveURL((url) => url.pathname === "/admin/catalogue");
    await expect(page.getByRole("heading", { level: 1, name: "Catalogue" })).toBeVisible();
  });

  test("écran de connexion rouvert avec une session valide : directement à destination", async ({ page }) => {
    await page.goto(routes.connexion({ retour: routes.vendre() }));
    await expect(page).toHaveURL((url) => url.pathname === "/admin/vendre");
  });
});
