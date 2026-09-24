import { expect, test } from "@playwright/test";
import { routes } from "../../src/app-shell/routes";
import { ADMIN, SESSION_COOKIE } from "../support/env";
import { waitForHydration } from "../helpers/hydration";
import { confirmationCard, cta, documentsOf, euros, openFresh, openSheet, tile, waitForComposer } from "./support-j9";

/**
 * Session expirée en pleine vente (06 §4.6, 07 J9) : le brouillon vit sur l'appareil, pas dans la session. Le cookie
 * disparaît, l'écriture renvoie vers la connexion, et le retour retrouve le ticket intact — un seul document part.
 *
 * Déconnexion volontaire depuis les Réglages (07 J15, 06 E08 zone 5) : même promesse, tenue par écrit dans la
 * confirmation — « Ton brouillon de vente reste sur cet appareil. »
 */

const CUSTOMER = "Camille Roux";

test("cookie supprimé après deux lignes : connexion, retour sur Vendre avec le brouillon intact, un seul document", async ({ page, context }, testInfo) => {
  testInfo.setTimeout(120_000);
  await openFresh(page, routes.vendre());
  await waitForComposer(page);

  // Deux lignes et un nom de client : le ticket est en cours.
  await tile(page, "J'adore").tap();
  await tile(page, "L'Homme Idéal").tap();
  await page.getByLabel("Nom du client", { exact: true }).fill(CUSTOMER);
  await expect(cta(page)).toContainText(`Encaisser ${euros("240")}`);

  // Le point de brouillon dit qu'un ticket attend sur l'onglet Vendre (06 §1.5).
  await expect(page.getByRole("link", { name: "Vendre, brouillon en cours" })).toBeVisible();

  // La session expire : l'écriture n'aboutit pas, l'app ramène à la connexion avec l'écran à rouvrir.
  const cookies = await context.cookies();
  await context.clearCookies();
  await context.addCookies(cookies.filter((cookie) => cookie.name !== SESSION_COOKIE));
  await cta(page).tap();
  await page.waitForURL((url) => url.pathname === "/admin/login", { timeout: 60_000 });
  expect(new URL(page.url()).searchParams.get("retour")).toBe(routes.vendre());
  expect(await documentsOf({ customerName: CUSTOMER })).toEqual([]);

  await waitForHydration(page.getByRole("button", { name: "Se connecter" }));
  await page.getByLabel("Identifiant").fill(ADMIN.username);
  await page.getByLabel("Mot de passe", { exact: true }).fill(ADMIN.password);
  await page.getByRole("button", { name: "Se connecter" }).tap();
  await page.waitForURL((url) => url.pathname === "/admin/vendre", { timeout: 60_000 });

  // Le brouillon est retrouvé tel quel : deux lignes, le client, le montant reçu.
  await waitForComposer(page);
  await expect(page.locator("[data-edit-line]")).toHaveCount(2);
  await expect(page.getByLabel("Nom du client", { exact: true })).toHaveValue(CUSTOMER);
  await expect(cta(page)).toContainText(`Encaisser ${euros("240")}`);

  await cta(page).tap();
  await expect(confirmationCard(page)).toContainText("Vente enregistrée");
  const sales = await documentsOf({ customerName: CUSTOMER });
  expect(sales).toHaveLength(1);
  expect(sales[0]?.lines).toHaveLength(2);
  expect(sales[0]?.payments.map((payment) => payment.movement.amount.toFixed(2))).toEqual(["240.00"]);
});

test("« Se déconnecter » depuis les Réglages : confirmation, retour à la connexion, brouillon gardé sur l'appareil", async ({
  page,
  context,
}, testInfo) => {
  testInfo.setTimeout(120_000);
  await openFresh(page, routes.vendre());
  await waitForComposer(page);

  // Un ticket en cours, écrit sur l'appareil : c'est lui qui doit survivre à la déconnexion.
  await tile(page, "Asad").tap();
  await expect(cta(page)).toHaveText("Choisir le client");
  const draft = await page.evaluate(() => localStorage.getItem("nurea:brouillon:vendre"));
  expect(draft, "le composeur a écrit son brouillon sur l'appareil").not.toBeNull();

  // E08 zone 5 : la rangée `danger`, puis la confirmation qui DIT ce qu'il advient du brouillon (06 S18).
  await page.goto(routes.reglages());
  const logout = page.getByRole("button", { name: "Se déconnecter", exact: true });
  await waitForHydration(logout);
  await logout.tap();
  const dialog = page.locator("[data-confirm-dialog]");
  await expect(dialog).toContainText("Se déconnecter ?");
  await expect(dialog).toContainText("Ton brouillon de vente reste sur cet appareil.");

  await dialog.getByRole("button", { name: "Se déconnecter", exact: true }).tap();
  await page.waitForURL((url) => url.pathname === "/admin/login", { timeout: 60_000 });
  await waitForHydration(page.getByRole("button", { name: "Se connecter" }));

  // Le cookie de session est parti ; le brouillon, non.
  expect((await context.cookies()).map((cookie) => cookie.name)).not.toContain(SESSION_COOKIE);
  expect(await page.evaluate(() => localStorage.getItem("nurea:brouillon:vendre"))).toBe(draft);

  // Tant qu'on n'est pas revenu, un écran du shell renvoie à la connexion, avec l'écran à rouvrir.
  await page.goto(routes.reglages());
  await page.waitForURL((url) => url.pathname === "/admin/login", { timeout: 60_000 });
  expect(new URL(page.url()).searchParams.get("retour")).toBe(routes.reglages());

  // Reconnexion : le ticket est retrouvé tel quel, et rien n'a été écrit en base entre-temps.
  await waitForHydration(page.getByRole("button", { name: "Se connecter" }));
  await page.getByLabel("Identifiant").fill(ADMIN.username);
  await page.getByLabel("Mot de passe", { exact: true }).fill(ADMIN.password);
  await page.getByRole("button", { name: "Se connecter" }).tap();
  await page.waitForURL((url) => url.pathname.startsWith("/admin") && url.pathname !== "/admin/login", { timeout: 60_000 });
  await page.goto(routes.vendre());
  await waitForComposer(page);
  await expect(page.locator("[data-edit-line]")).toHaveCount(1);
  await expect(page.locator("[data-edit-line]")).toContainText("Asad");
});
