import { expect, test } from "@playwright/test";
import { routes } from "../../src/app-shell/routes";
import { ADMIN, SESSION_COOKIE } from "../support/env";
import { waitForHydration } from "../helpers/hydration";
import { confirmationCard, cta, documentsOf, euros, openFresh, openSheet, tile, waitForComposer } from "./support-j9";

/**
 * Session expirée en pleine vente (06 §4.6, 07 J9) : le brouillon vit sur l'appareil, pas dans la session. Le cookie
 * disparaît, l'écriture renvoie vers la connexion, et le retour retrouve le ticket intact — un seul document part.
 */

const CUSTOMER = "Camille Roux";

test("cookie supprimé après deux lignes : connexion, retour sur Vendre avec le brouillon intact, un seul document", async ({ page, context }, testInfo) => {
  testInfo.setTimeout(120_000);
  await openFresh(page, routes.vendre());
  await waitForComposer(page);

  // Deux lignes et un nom de client de passage : le ticket est en cours.
  await tile(page, "J'adore").tap();
  await tile(page, "L'Homme Idéal").tap();
  await page.getByRole("button", { name: "Client : Client de passage" }).tap();
  const picker = openSheet(page);
  const passing = picker.getByRole("button", { name: /^Client de passage/ });
  await waitForHydration(passing);
  await passing.tap();
  await picker.getByLabel("Nom du client", { exact: true }).fill(CUSTOMER);
  await picker.getByRole("button", { name: "Valider", exact: true }).tap();
  await expect(picker).toBeHidden();
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
  await expect(page.getByRole("button", { name: `Client : ${CUSTOMER}` })).toBeVisible();
  await expect(cta(page)).toContainText(`Encaisser ${euros("240")}`);

  await cta(page).tap();
  await expect(confirmationCard(page)).toContainText("Vente enregistrée");
  const sales = await documentsOf({ customerName: CUSTOMER });
  expect(sales).toHaveLength(1);
  expect(sales[0]?.lines).toHaveLength(2);
  expect(sales[0]?.payments.map((payment) => payment.movement.amount.toFixed(2))).toEqual(["240.00"]);
});
