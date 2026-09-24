import { expect, test } from "@playwright/test";
import { routes, withSheet } from "../../src/app-shell/routes";
import { parisDayKey, parseParisDayKey } from "../../src/domain/periods";
import { DOCS, PASSING } from "../fixtures/documents";
import { SEED } from "../fixtures/seed";
import { documentBalance, paymentsOf, withE2eDb } from "../helpers/db";
import { waitForHydration } from "../helpers/hydration";
import { countTaps } from "../helpers/tap";
import {
  actionSheet,
  documentSheet,
  euros,
  expectNoReload,
  expectToast,
  markDocument,
  openShell,
  orderRow,
  swipeContainer,
  tab,
  toast,
} from "./support-j8";
import { chrono, cta, documentsOf, openFresh, openSheet, tile, waitForComposer } from "./support-j9";

/**
 * PC-04 et PC-05 (06 §2 ; 02 §2 tâches n°4 et n°5 ; 07 J8) : acompte depuis la fiche en 3 taps, statut et tuiles à
 * jour SANS rechargement ; pointage d'une ligne en 1 tap ; « Livrer » par glissement avec solde en 4 taps depuis
 * l'Accueil ; commande soldée livrée en 3 ; solde depuis la fiche en 2. Chaque geste est confronté à la base.
 */

const deliveredOf = (id: string) =>
  withE2eDb(async (db) =>
    (await db.saleLine.findMany({ where: { documentId: id }, orderBy: { position: "asc" }, select: { deliveredQuantity: true } })).map(
      (line) => line.deliveredQuantity,
    ),
  );

test("PC-05 puis PC-04 : acompte depuis la fiche (3 taps), pointage d'une ligne (1 tap), « Livrer » glissé avec solde (4 taps)", async ({ page }, testInfo) => {
  testInfo.setTimeout(120_000);
  await openShell(page, routes.accueil());
  await markDocument(page);

  // Ouvrir la commande depuis la liste.
  await tab(page, "Commandes").tap();
  const line = orderRow(page, PASSING.acompte);
  await waitForHydration(line.getByRole("button").first());
  await line.getByRole("button").first().tap();
  const fiche = documentSheet(page);
  await expect(fiche.getByRole("radio", { name: "En attente" })).toHaveAttribute("aria-checked", "true");
  await waitForHydration(fiche.getByRole("button", { name: "Encaisser un acompte" }));

  // PC-05 — acompte : 3 taps depuis la fiche.
  const acompte = countTaps(page);
  await acompte.tap(fiche.getByRole("button", { name: "Encaisser un acompte" }), "Encaisser un acompte");
  const collect = actionSheet(page, `Acompte · ${PASSING.acompte}`);
  await expect(collect).toBeVisible();
  await acompte.tap(collect.getByRole("button", { name: "La moitié", exact: true }), "La moitié");
  await acompte.tap(collect.getByRole("button", { name: `Encaisser ${euros("130")} · Espèces` }), "CTA");
  acompte.expectAtMost(3);
  await expectToast(page, `${euros("130")} encaissés · Espèces`);

  // La fiche reflète l'écriture sans re-navigation : statut confirmé, Payé et À encaisser.
  await expect(fiche.getByRole("radio", { name: "Confirmée" })).toHaveAttribute("aria-checked", "true");
  await expect(fiche.locator('[data-money-tile="Payé"]')).toContainText(euros("130"));
  await expect(fiche.locator('[data-money-tile="À encaisser"]')).toContainText(euros("130"));
  await expectNoReload(page);
  expect(await documentBalance(DOCS.acompte)).toMatchObject({ status: "CONFIRMED", paid: "130.00", due: "130.00" });

  // PC-04 cas C — pointer une ligne : 1 tap (« Tout »), stock suivi ajusté.
  const pointage = countTaps(page);
  await pointage.tap(fiche.getByRole("button", { name: "Tout livrer : Bleu de Chanel 80 ml" }), "Tout");
  pointage.expectAtMost(1);
  await expect(fiche.getByText("Articles · Livré 2/3")).toBeVisible();
  await expect.poll(() => deliveredOf(DOCS.acompte)).toEqual([2, 0]);

  // Retour à la liste, puis l'Accueil : le parcours de livraison part de l'app ouverte sur l'Accueil.
  await fiche.getByRole("button", { name: "Fermer", exact: true }).tap();
  await expect(fiche).toBeHidden();
  // `doc` doit avoir quitté l'adresse : tant qu'il y est, un tap sur l'onglet ferme la sheet au lieu de naviguer.
  await expect.poll(() => new URL(page.url()).searchParams.has("doc")).toBe(false);
  /*
   * En `next dev`, l'indicateur des outils de Next recouvre le premier onglet : le clic lui est remis directement.
   * Et juste après la fermeture d'une sheet, le premier tap peut encore être lu comme « ferme la sheet » : on le
   * rejoue jusqu'à l'Accueil, sans recharger la page (le marqueur de non-rechargement doit survivre).
   */
  await expect(async () => {
    await tab(page, "Accueil").dispatchEvent("click");
    await expect(page.getByRole("heading", { level: 1, name: "Accueil" })).toBeVisible({ timeout: 5_000 });
  }).toPass({ timeout: 60_000 });

  // PC-04 cas B — livrer avec un solde : 4 taps depuis l'Accueil.
  const livrer = countTaps(page);
  await livrer.tap(tab(page, "Commandes"), "onglet Commandes");
  await waitForHydration(orderRow(page, PASSING.acompte).getByRole("button").first());
  await livrer.swipe(orderRow(page, PASSING.acompte), "right");
  await livrer.tap(swipeContainer(orderRow(page, PASSING.acompte)).getByRole("button", { name: "Livrer" }), "Livrer");
  const deliver = actionSheet(page, `Livrer · ${PASSING.acompte}`);
  await expect(deliver).toBeVisible();
  await livrer.tap(deliver.getByRole("button", { name: `Encaisser ${euros("130")} et livrer` }), "CTA");
  livrer.expectAtMost(4);
  await expectToast(page, `Livrée · ${euros("130")} encaissés`);
  await expect(orderRow(page, PASSING.acompte)).toHaveCount(0);

  expect(await documentBalance(DOCS.acompte)).toMatchObject({ status: "DELIVERED", paid: "260.00", due: "0.00" });
  expect((await paymentsOf(DOCS.acompte)).map((payment) => [payment.kind, payment.movement.amount.toFixed(2)])).toEqual([
    ["DEPOSIT", "130.00"],
    ["BALANCE", "130.00"],
  ]);
  expect(await deliveredOf(DOCS.acompte)).toEqual([2, 1]);
  await expectNoReload(page);
});

test("PC-04 cas A : livrer une commande soldée en 3 taps depuis l'Accueil ; « Annuler » la remet confirmée", async ({ page }) => {
  await openShell(page, routes.accueil());
  const taps = countTaps(page);
  await taps.tap(tab(page, "Commandes"), "onglet Commandes");
  const line = orderRow(page, PASSING.readyPaid);
  await waitForHydration(line.getByRole("button").first());
  await taps.swipe(line, "right");
  await taps.tap(swipeContainer(line).getByRole("button", { name: "Livrer" }), "Livrer");
  taps.expectAtMost(3);
  await expectToast(page, `Commande de ${PASSING.readyPaid} livrée`);
  await expect(orderRow(page, PASSING.readyPaid)).toHaveCount(0);
  await expect.poll(async () => (await documentBalance(DOCS.readyPaid))?.status).toBe("DELIVERED");

  // T4b : le filet du toast rétablit l'état d'avant.
  await toast(page).getByRole("button", { name: "Annuler" }).tap();
  await expect.poll(async () => (await documentBalance(DOCS.readyPaid))?.status).toBe("CONFIRMED");
  await expect(orderRow(page, PASSING.readyPaid)).toHaveCount(1);
});

test("PC-05 : encaisser le solde d'une commande depuis sa fiche en 2 taps", async ({ page }) => {
  await openShell(page, withSheet(routes.commandes(), { doc: DOCS.solde }));
  const fiche = documentSheet(page);
  const cta = fiche.getByRole("button", { name: `Encaisser ${euros("100")}`, exact: true });
  await waitForHydration(cta);
  const taps = countTaps(page);
  await taps.tap(cta, "Encaisser 100 €");
  const collect = actionSheet(page, `Encaisser · ${PASSING.solde}`);
  await taps.tap(collect.getByRole("button", { name: `Encaisser ${euros("100")} · Espèces` }), "CTA");
  taps.expectAtMost(2);
  await expectToast(page, `${euros("100")} encaissés · Espèces`);
  await expect(fiche.locator('[data-money-tile="À encaisser"]')).toContainText(euros("0"));
  await expect(fiche.getByRole("button", { name: `Encaisser ${euros("100")}`, exact: true })).toHaveCount(0);
  expect(await documentBalance(DOCS.solde)).toMatchObject({ status: "CONFIRMED", paid: "120.00", due: "0.00" });
});

/**
 * PC-03 — prendre une commande par le composeur (02 §2 tâche n°3 : ≤ 15 taps, < 60 s ; 06 §2 cible 9 taps ; 07 J9) :
 * client déjà en fiche, deux parfums vendus récemment, livraison demain, acompte de la moitié. Puis la livraison du
 * reste depuis sa fiche, qui encaisse le solde dans la même transaction (A-5).
 */
test("PC-03 : commande avec acompte créée par le composeur en 9 taps, puis livrée et soldée", async ({ page }, testInfo) => {
  testInfo.setTimeout(120_000);
  const fares = SEED.customers[0];
  await openFresh(page, routes.accueil());

  const taps = countTaps(page);
  const stop = chrono(testInfo, "PC-03 prendre une commande");
  await taps.tap(tab(page, "Commandes"), "onglet Commandes");
  const nouvelle = page.getByRole("button", { name: "Nouvelle commande", exact: true });
  await waitForHydration(nouvelle);
  await taps.tap(nouvelle, "Nouvelle commande");
  await waitForComposer(page);

  // Mode Commande : le client d'abord (une commande se suit sous un nom), et c'est le CTA qui le dit.
  await expect(page.getByRole("radio", { name: "Commande" })).toHaveAttribute("aria-checked", "true");
  await expect(cta(page)).toHaveText("Choisir le client");
  await taps.tap(cta(page), "Choisir le client");
  const field = page.getByLabel("Nom du client", { exact: true });
  await expect(field).toBeFocused();
  await field.fill(fares.fullName.slice(0, 4));
  // La suggestion porte le contact en légende : le nom accessible du bouton ne s'arrête pas au nom du client.
  const suggestion = page.locator("[data-customer-suggestions]").getByRole("button", { name: new RegExp(`^${fares.fullName}`) });
  await taps.tap(suggestion, fares.fullName);

  await expect(cta(page)).toHaveText("Ajouter un parfum");
  await taps.tap(tile(page, "J'adore"), "tuile J'adore");
  await taps.tap(tile(page, "L'Homme Idéal"), "tuile L'Homme Idéal");
  await expect(cta(page)).toHaveText("Créer la commande");

  await taps.tap(page.getByRole("button", { name: "Demain", exact: true }), "chip Demain");
  await taps.tap(page.getByRole("button", { name: "La moitié", exact: true }), "chip La moitié");
  await expect(cta(page)).toHaveText(`Créer la commande · acompte ${euros("120")}`);
  await expect(page.locator("[data-sticky-action]")).toContainText("Espèces");
  await taps.tap(cta(page), "Créer la commande · acompte 120 €");

  const card = page.locator("[data-confirmation-card]");
  await expect(card).toContainText(`Commande de ${fares.fullName}`);
  await expect(card).toContainText("livraison");
  await expect(card).toContainText(`acompte ${euros("120")}`);
  stop(taps.count);
  taps.expectAtMost(15);

  // Le composeur est revenu en mode Vente, vidé (06 E11 « Brouillon »).
  await expect(page.getByRole("radio", { name: "Vente" })).toHaveAttribute("aria-checked", "true");
  await expect(page.locator("[data-edit-line]")).toHaveCount(0);

  const [order] = await documentsOf({ customerId: fares.id, perfume: "J'adore" });
  expect(order).toMatchObject({ origin: "ORDER", status: "CONFIRMED" });
  expect(order?.batchId).not.toBeNull();
  expect(order?.lines.map((line) => [line.perfumeName, line.volumeMl, line.quantity, line.unitPriceEur.toFixed(2)])).toEqual([
    ["J'adore", 80, 1, "150.00"],
    ["L'Homme Idéal", 80, 1, "90.00"],
  ]);
  expect(order?.payments.map((payment) => [payment.kind, payment.movement.amount.toFixed(2), payment.movement.pocket.name])).toEqual([
    ["DEPOSIT", "120.00", "Espèces"],
  ]);
  // Livraison prévue : demain à 00:00, heure de Paris (03 §3).
  const tomorrow = parseParisDayKey(parisDayKey(new Date(Date.now() + 24 * 60 * 60 * 1000)));
  expect(order?.expectedDeliveryAt?.toISOString()).toBe(tomorrow?.toISOString());
  expect(await documentBalance(order?.id as string)).toMatchObject({ status: "CONFIRMED", paid: "120.00", due: "120.00" });

  // La commande prise à l'instant se livre depuis sa fiche : solde encaissé et livraison en une transaction.
  await page.goto(withSheet(routes.commandes(), { doc: order?.id as string }));
  const fiche = documentSheet(page);
  const livree = fiche.getByRole("radio", { name: "Livrée" });
  await waitForHydration(livree);
  await livree.tap();
  const deliver = actionSheet(page, `Livrer · ${fares.fullName}`);
  await expect(deliver).toBeVisible();
  await deliver.getByRole("button", { name: `Encaisser ${euros("120")} et livrer` }).tap();
  await expectToast(page, `Livrée · ${euros("120")} encaissés`);
  expect(await documentBalance(order?.id as string)).toMatchObject({ status: "DELIVERED", paid: "240.00", due: "0.00" });
});
