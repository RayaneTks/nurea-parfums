import { expect, test } from "@playwright/test";
import { routes } from "../../src/app-shell/routes";
import { SEED } from "../fixtures/seed";
import { waitForHydration } from "../helpers/hydration";
import { countTaps } from "../helpers/tap";
import {
  chrono,
  confirmationCard,
  cta,
  dialog,
  documentsOf,
  euros,
  expectToast,
  openFresh,
  openSheet,
  stockOf,
  tab,
  tile,
  waitForComposer,
} from "./support-j9";

/**
 * PC-01 variante « Reçu maintenant » partiel (02 §5 N1 ; 06 E11 zone 8 ; 07 J9) : le dû se dérive du ledger, le CTA
 * exige un nom pour suivre ce qui restera, et le document apparaît dans « À encaisser » avec le bon dû.
 *
 * Puis la vente entièrement à crédit et, sur un document sans aucun paiement, la suppression différée de la carte de
 * confirmation (T6) — une erreur de saisie ne laisse pas de document « Annulée » (03 §4.4).
 */

/** Élise n'a aucune créance dans le jeu : la vente à crédit de ce parcours est la seule de sa fiche. */
const CLIENT = SEED.customers[2];

test("« Reçu maintenant » partiel : le client est exigé, le dû part dans À encaisser", async ({ page }, testInfo) => {
  const stockBefore = await stockOf("J'adore");
  await openFresh(page, routes.accueil());

  const taps = countTaps(page);
  const stop = chrono(testInfo, "PC-01 vente à crédit partielle");
  await taps.tap(tab(page, "Vendre"), "onglet Vendre");
  await waitForComposer(page);
  await taps.tap(tile(page, "J'adore"), "tuile J'adore · 80 ml · 150 €");

  // Reçu 50 € sur 150 € : sans nom, le CTA dit pourquoi il en faut un et place le curseur dans le champ client.
  await taps.tap(page.getByLabel("Reçu maintenant", { exact: true }), "champ Reçu maintenant");
  await page.getByLabel("Reçu maintenant", { exact: true }).fill("50");
  await expect(cta(page)).toHaveText("Choisir le client");
  await expect(page.locator("[data-sticky-action]")).toContainText(`Nécessaire pour suivre les ${euros("100")} à encaisser`);

  await taps.tap(cta(page), "Choisir le client");
  const field = page.getByLabel("Nom du client", { exact: true });
  await expect(field).toBeFocused();
  await field.fill(CLIENT.fullName.slice(0, 4));
  // Une suggestion porte son contact en légende : le nom accessible du bouton ne s'arrête pas au nom.
  const client = page.locator("[data-customer-suggestions]").getByRole("button", { name: new RegExp(`^${CLIENT.fullName}`) });
  await taps.tap(client, CLIENT.fullName);

  await expect(cta(page)).toContainText(`Encaisser ${euros("50")}`);
  await expect(page.locator("[data-sticky-action]")).toContainText(`${euros("100")} resteront à encaisser`);
  await taps.tap(cta(page), "Encaisser 50 € · Espèces");
  await expect(confirmationCard(page)).toContainText("Vente enregistrée");
  await expect(confirmationCard(page)).toContainText(`${euros("100")} à encaisser`);
  stop(taps.count);
  taps.expectAtMost(8);

  const [sale] = await documentsOf({ customerId: CLIENT.id, perfume: "J'adore" });
  expect(sale).toMatchObject({ origin: "DIRECT_SALE", status: "DELIVERED", customerId: CLIENT.id });
  expect(sale?.payments.map((payment) => [payment.kind, payment.movement.amount.toFixed(2), payment.movement.pocket.name])).toEqual([
    ["BALANCE", "50.00", "Espèces"],
  ]);
  // Parfum non suivi : le stock ne bouge pas (03 §4.7).
  expect(await stockOf("J'adore")).toBe(stockBefore);

  // Le dû est dans « À encaisser », au centime, sous le nom du client (E13).
  await page.goto(routes.encaisser());
  const row = page.getByRole("button", { name: `Encaisser ${euros("100")} · ${CLIENT.fullName}` });
  await expect(row).toBeVisible();
});

test("vente entièrement à crédit puis « Annuler » : sans paiement, la vente est supprimée, pas annulée", async ({ page }) => {
  await openFresh(page, routes.vendre());
  await waitForComposer(page);
  await tile(page, "J'adore").tap();
  await page.getByRole("button", { name: "Rien", exact: true }).tap();

  // Sans reçu, le CTA annonce la créance ; un nom suffit à la suivre (fiche créée à l'enregistrement).
  await expect(cta(page)).toHaveText("Choisir le client");
  await cta(page).tap();
  await expect(page.getByLabel("Nom du client", { exact: true })).toBeFocused();
  await page.getByLabel("Nom du client", { exact: true }).fill("Inès Rahmani");

  await expect(cta(page)).toHaveText(`Enregistrer · ${euros("150")} à encaisser`);
  await cta(page).tap();
  await expect(confirmationCard(page)).toContainText(`${euros("150")} à encaisser`);

  const [sale] = await documentsOf({ customerName: "Inès Rahmani" });
  expect(sale?.payments).toEqual([]);

  // Aucun paiement : « Annuler » propose la suppression, avec le filet de 5 secondes.
  await confirmationCard(page).getByRole("button", { name: "Annuler", exact: true }).tap();
  await expect(dialog(page)).toContainText("Supprimer cette vente ?");
  await expect(dialog(page)).toContainText("Elle n'a aucun paiement. Tu pourras annuler pendant 5 secondes.");
  await dialog(page).getByRole("button", { name: "Supprimer", exact: true }).tap();
  await expectToast(page, "Vente supprimée");
  await expect(confirmationCard(page)).toHaveCount(0);

  // Le filet non touché : la suppression part à la fin des 5 secondes, et ne laisse aucun document « Annulée ».
  await expect.poll(async () => (await documentsOf({ customerName: "Inès Rahmani" })).length, { timeout: 15_000 }).toBe(0);
});
