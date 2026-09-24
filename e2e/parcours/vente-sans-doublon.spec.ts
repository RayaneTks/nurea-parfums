import { expect, test } from "@playwright/test";
import { routes } from "../../src/app-shell/routes";
import { waitForHydration } from "../helpers/hydration";
import {
  confirmationCard,
  cta,
  documentsOf,
  euros,
  expectToast,
  openFresh,
  openSheet,
  tab,
  tile,
  toast,
  waitForComposer,
} from "./support-j9";

/**
 * Brouillon persistant et renvoi sans doublon (04 §3.6, §3.7 ; 06 E11 « Brouillon », « Erreur d'écriture » ; 07 J9) :
 * l'identifiant du document est généré sur l'appareil et gardé jusqu'au succès — double tap, coupure réseau,
 * rechargement en pleine saisie : jamais deux ventes.
 */

const DOUBLE = "Théo Lambert";
const OFFLINE = "Sonia Meddah";

async function nameCustomer(page: import("@playwright/test").Page, name: string): Promise<void> {
  await page.getByLabel("Nom du client", { exact: true }).fill(name);
}

test("double tap sur le CTA : une seule vente", async ({ page }) => {
  await openFresh(page, routes.vendre());
  await waitForComposer(page);
  await tile(page, "J'adore").tap();
  await nameCustomer(page, DOUBLE);
  await expect(cta(page)).toContainText(`Encaisser ${euros("150")}`);

  await Promise.all([cta(page).tap(), cta(page).tap()]);
  await expect(confirmationCard(page)).toContainText("Vente enregistrée");
  await page.waitForTimeout(1000);
  expect(await documentsOf({ customerName: DOUBLE })).toHaveLength(1);
});

test("réseau coupé pendant l'envoi : le ticket reste, « Réessayer » n'écrit qu'une fois", async ({ page, context }) => {
  await openFresh(page, routes.vendre());
  await waitForComposer(page);
  await tile(page, "J'adore").tap();
  await nameCustomer(page, OFFLINE);
  await expect(cta(page)).toContainText(`Encaisser ${euros("150")}`);

  await context.setOffline(true);
  await cta(page).tap();
  await expectToast(page, "Pas de réseau. Ta saisie est gardée — réessaie quand ça capte.");
  // Le ticket est intact, rien n'est écrit.
  await expect(page.locator("[data-edit-line]")).toHaveCount(1);
  await expect(cta(page)).toContainText(`Encaisser ${euros("150")}`);
  expect(await documentsOf({ customerName: OFFLINE })).toEqual([]);

  await context.setOffline(false);
  await toast(page).getByRole("button", { name: "Réessayer" }).tap();
  await expect(confirmationCard(page)).toContainText("Vente enregistrée");

  // Le renvoi a porté le même identifiant de document (04 §3.6).
  await expect.poll(async () => (await documentsOf({ customerName: OFFLINE })).length).toBe(1);
  await page.waitForTimeout(1000);
  expect(await documentsOf({ customerName: OFFLINE })).toHaveLength(1);
});

test("interruption : le ticket survit au rechargement et au passage par un autre onglet", async ({ page }) => {
  await openFresh(page, routes.vendre());
  await waitForComposer(page);
  await tile(page, "Mon Guerlain").tap();
  await expect(cta(page)).toHaveText("Choisir le client");
  await expect(page.getByRole("link", { name: "Vendre, brouillon en cours" })).toBeVisible();

  // Rechargement (l'app tuée en arrière-plan par iOS) : le ticket est là.
  await page.reload();
  await waitForComposer(page);
  await expect(page.locator("[data-edit-line]")).toHaveCount(1);
  await expect(page.locator("[data-edit-line]")).toContainText("Mon Guerlain");

  // Un détour par un autre onglet, et retour : toujours là, et le point de brouillon l'annonce.
  await tab(page, "Commandes").tap();
  // La liste des commandes est un écran de données : en `next dev` chargé, sa première ouverture prend son temps.
  await expect(page.getByRole("heading", { level: 1, name: "Commandes" })).toBeVisible({ timeout: 60_000 });
  await expect(page.getByRole("link", { name: "Vendre, brouillon en cours" })).toBeVisible();
  // Le brouillon complète le nom accessible de l'onglet (06 §1.5).
  await page.locator("[data-tabbar]").getByRole("link", { name: "Vendre, brouillon en cours" }).tap();
  await waitForComposer(page);
  await expect(page.locator("[data-edit-line]")).toContainText("Mon Guerlain");

  // « Vider le ticket » le reprend à zéro, en le disant.
  await page.getByRole("button", { name: "Plus d'actions sur le ticket" }).tap();
  await openSheet(page).getByRole("button", { name: "Vider le ticket", exact: true }).tap();
  const dialog = page.locator("[data-confirm-dialog]");
  await expect(dialog).toContainText("Vider le ticket ?");
  await dialog.getByRole("button", { name: "Vider", exact: true }).tap();
  await expect(page.locator("[data-edit-line]")).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Vendre, brouillon en cours" })).toHaveCount(0);
});
