import { expect, test } from "@playwright/test";
import { routes } from "../../src/app-shell/routes";
import { DOCS } from "../fixtures/documents";
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
  pricingOf,
  stockOf,
  tab,
  tile,
  waitForComposer,
} from "./support-j9";

/**
 * PC-01 — vendre et encaisser une vente simple (02 §2 tâche n°1 : ≤ 8 taps, < 20 s ; 06 §2 cible 3 taps ; 07 J9).
 *
 * Une ligne d'un parfum vendu récemment, client de passage, tout payé, poche par défaut : trois taps depuis
 * l'Accueil. Puis les variantes du même écran : la réserve de stock, l'article hors catalogue, et le filet
 * « Annuler » de la carte de confirmation (T5 : remboursement daté du jour, stock restitué).
 */

test("PC-01 : trois taps depuis l'Accueil, stock décrémenté, paiement dans la poche par défaut, tarif appris", async ({ page }, testInfo) => {
  const before = await stockOf("Asad");
  const pricingBefore = await pricingOf("Asad", 80);
  await openFresh(page, routes.accueil());

  const taps = countTaps(page);
  const stop = chrono(testInfo, "PC-01 vente simple");
  await taps.tap(tab(page, "Vendre"), "onglet Vendre");
  await waitForComposer(page);
  await taps.tap(tile(page, "Asad"), "tuile Asad · 80 ml · 120 €");

  // Le ticket est prêt : prix et coût mémorisés, poche par défaut pré-sélectionnée (N2), le CTA dit l'effet complet.
  await expect(page.getByLabel("Prix de Asad", { exact: true })).toHaveValue("120");
  await expect(page.getByRole("button", { name: "Espèces", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(cta(page)).toContainText("Encaisser");
  await expect(cta(page)).toContainText("Espèces");

  await taps.tap(cta(page), "Encaisser 120 € · Espèces");
  await expect(confirmationCard(page)).toContainText("Vente enregistrée");
  await expect(confirmationCard(page)).toContainText("Espèces");
  stop(taps.count);
  taps.expectAtMost(8);

  // Le composeur est vidé : ni ligne, ni CTA, et le point de brouillon a disparu de l'onglet.
  await expect(page.locator("[data-edit-line]")).toHaveCount(0);
  await expect(cta(page)).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Vendre, brouillon en cours" })).toHaveCount(0);

  const [sale] = await documentsOf({ perfume: "Asad", exclude: [DOCS.recentAsad] });
  expect(sale).toMatchObject({ origin: "DIRECT_SALE", status: "DELIVERED", customerId: null });
  expect(sale?.lines).toHaveLength(1);
  expect(sale?.lines[0]).toMatchObject({ perfumeName: "Asad", brandName: "Lattafa", volumeMl: 80, quantity: 1, isGift: false });
  expect(sale?.lines[0]?.unitPriceEur.toFixed(2)).toBe("120.00");
  // Le coût mémorisé est repris : la marge du document est vraie sans ressaisie (N8).
  expect(sale?.lines[0]?.unitCostEur?.toFixed(2)).toBe("79.42");
  expect(sale?.payments.map((payment) => [payment.kind, payment.movement.amount.toFixed(2), payment.movement.pocket.name])).toEqual([
    ["BALANCE", "120.00", "Espèces"],
  ]);
  // Lot pré-rempli sur le lot ouvert le plus récent (N9) : aucun second passage.
  expect(sale?.batchId).not.toBeNull();
  expect(await stockOf("Asad")).toBe((before ?? 0) - 1);
  const pricingAfter = await pricingOf("Asad", 80);
  expect(pricingAfter?.defaultUnitPriceEur.toFixed(2)).toBe("120.00");
  expect(pricingAfter?.updatedAt.getTime()).toBeGreaterThan(pricingBefore?.updatedAt.getTime() ?? 0);

  // PC-10 — « Annuler » de la carte : le dialogue dit l'effet, T5 contre-passe et restitue le stock.
  await confirmationCard(page).getByRole("button", { name: "Annuler", exact: true }).tap();
  await expect(dialog(page)).toContainText(`Annuler la vente de ${euros("120")} ?`);
  await expect(dialog(page)).toContainText(`Les ${euros("120")} sont retirés d'Espèces aujourd'hui.`);
  await expect(dialog(page)).toContainText("Le stock est restitué.");
  await dialog(page).getByRole("button", { name: "Annuler la vente", exact: true }).tap();
  await expectToast(page, /Vente annulée/);
  await expect(confirmationCard(page)).toHaveCount(0);

  await expect
    .poll(async () => (await documentsOf({ perfume: "Asad", exclude: [DOCS.recentAsad] }))[0]?.status)
    .toBe("CANCELLED");
  const [cancelled] = await documentsOf({ perfume: "Asad", exclude: [DOCS.recentAsad] });
  expect(cancelled?.payments.map((payment) => [payment.kind, payment.movement.amount.toFixed(2)]).sort()).toEqual([
    ["BALANCE", "120.00"],
    ["REFUND", "-120.00"],
  ]);
  expect(await stockOf("Asad")).toBe(before);
});

test("réserve de stock : le dialogue dit ce qui va arriver à la fiche, et rien n'est écrit si l'on renonce", async ({ page }) => {
  await openFresh(page, routes.vendre());
  await waitForComposer(page);
  await page.getByRole("button", { name: "Rechercher un parfum", exact: true }).tap();
  const sheet = openSheet(page);
  await sheet.getByLabel("Parfum ou marque", { exact: true }).fill("coco");
  const result = sheet.getByRole("button", { name: /^Coco Mademoiselle/ }).first();
  await waitForHydration(result);
  await result.tap();
  await expect(sheet).toBeHidden();
  // Deux flacons pour un stock suivi à 1.
  await page.getByRole("button", { name: "Augmenter" }).first().tap();
  await page.getByLabel("Prix de Coco Mademoiselle", { exact: true }).fill("90");
  await cta(page).tap();

  await expect(dialog(page)).toContainText("Stock insuffisant");
  await expect(dialog(page)).toContainText("Stock de Coco Mademoiselle à 1 : la fiche passera à 0.");
  await dialog(page).getByRole("button", { name: "Annuler", exact: true }).tap();
  await expect(dialog(page)).toHaveCount(0);

  expect(await documentsOf({ perfume: "Coco Mademoiselle", exclude: [DOCS.cancelled] })).toEqual([]);
  expect(await stockOf("Coco Mademoiselle")).toBe(1);
  // Le ticket est intact : la saisie n'a pas été perdue par le refus.
  await expect(cta(page)).toContainText("Encaisser");
});

test("hors catalogue : nom normalisé, marque rattachée à celle du catalogue, prix demandé par le CTA", async ({ page }, testInfo) => {
  await openFresh(page, routes.vendre());
  await waitForComposer(page);

  const taps = countTaps(page);
  const stop = chrono(testInfo, "PC-01 variante hors catalogue");
  await taps.tap(page.getByRole("button", { name: "Rechercher un parfum", exact: true }), "Rechercher un parfum");
  const sheet = openSheet(page);
  await sheet.getByLabel("Parfum ou marque", { exact: true }).fill("lattafa oud royal");
  await taps.tap(sheet.getByRole("button", { name: "Hors catalogue : « lattafa oud royal »", exact: true }), "Hors catalogue");
  // La marque connue du catalogue est reconnue dans la saisie, le nom est normalisé avant d'être enregistré.
  await expect(sheet.getByLabel("Marque", { exact: true })).toHaveValue("Lattafa");
  await expect(sheet.getByText("Lattafa, déjà au catalogue.")).toBeVisible();
  await expect(sheet.getByText("Enregistré : Oud Royal")).toBeVisible();
  await taps.tap(sheet.getByRole("button", { name: "Ajouter la ligne", exact: true }), "Ajouter la ligne");
  await expect(sheet).toBeHidden();

  // Le CTA dit ce qui manque et y mène.
  await expect(cta(page)).toHaveText("Ajouter le prix · Oud Royal 80 ml");
  await taps.tap(cta(page), "Ajouter le prix");
  await expect(page.getByLabel("Prix de Oud Royal", { exact: true })).toBeFocused();
  await page.getByLabel("Prix de Oud Royal", { exact: true }).fill("45");
  await expect(cta(page)).toContainText("Encaisser");
  await taps.tap(cta(page), "Encaisser");
  await expect(confirmationCard(page)).toContainText("Vente enregistrée");
  stop(taps.count);
  taps.expectAtMost(8);

  const [sale] = await documentsOf({ perfume: "Oud Royal" });
  expect(sale?.lines[0]).toMatchObject({ perfumeName: "Oud Royal", brandName: "Lattafa", isOffCatalog: true, volumeMl: 80 });
  expect(sale?.lines[0]?.unitPriceEur.toFixed(2)).toBe("45.00");
});
