import { expect, test, type Page } from "@playwright/test";
import { routes } from "../../src/app-shell/routes";
import { DOCS } from "../fixtures/documents";
import { seedPerfumeId } from "../fixtures/seed";
import { documentBalance, withE2eDb } from "../helpers/db";
import { waitForHydration } from "../helpers/hydration";
import { countTaps, type TapCounter } from "../helpers/tap";
import { actionSheet, euros, expectToast, openShell } from "./support-j8";

/**
 * Actions de résultat de la recherche globale (07 J15 ; 06 §4.4 S17, amendement A16) : sur un résultat client
 * qui doit de l'argent, « Encaisser xx € » ouvre S02 « Tout encaisser » SUR L'ÉCRAN COURANT — la palette se
 * ferme d'abord, l'onglet ne change pas ; sur un résultat parfum, « Vendre » ouvre le composeur pré-rempli.
 *
 * La créance encaissée ici est celle de Dounia Ferhat, dédiée à ce parcours (`e2e/fixtures/documents.ts`) :
 * personne d'autre n'y touche, son dû se vérifie au centime.
 */

const palette = (page: Page) => page.getByRole("dialog", { name: "Recherche" });

/** Ouvre S17 et tape la saisie : 1 tap (la frappe n'en est pas un, 06 « Compter les taps »). */
async function search(page: Page, text: string, taps?: TapCounter) {
  // « Rechercher » exact : le composeur porte un « Rechercher un parfum » qui n'est pas la loupe du header.
  const trigger = page.getByRole("button", { name: "Rechercher", exact: true });
  await waitForHydration(trigger);
  if (taps) await taps.tap(trigger, "loupe");
  else await trigger.tap();
  const dialog = palette(page);
  await expect(dialog).toBeVisible();
  await dialog.getByLabel("Rechercher", { exact: true }).fill(text);
  return dialog;
}

test("S17 : « Encaisser 70 € » sur un résultat client ouvre S02 sur l'écran courant, sans changer d'onglet", async ({ page }) => {
  expect((await documentBalance(DOCS.rechercheEncaisser))?.due).toBe("70.00");

  // Depuis le Catalogue : l'onglet ne doit pas changer, la sheet s'ouvre par-dessus cet écran.
  await openShell(page, routes.catalogue());
  const taps = countTaps(page);
  const dialog = await search(page, "dounia", taps);

  const action = dialog.getByRole("button", { name: `Encaisser ${euros("70")}`, exact: true });
  await expect(action).toBeVisible();
  await taps.tap(action, "Encaisser 70 €");

  // La palette est partie AVANT que la sheet monte (06 §4.4) : la sheet n'est jamais rendue sous elle.
  await expect(dialog).toBeHidden();
  const collect = actionSheet(page, "Tout encaisser · Dounia Ferhat");
  await expect(collect).toBeVisible();
  expect(new URL(page.url()).pathname).toBe("/admin/catalogue");
  await expect(page.locator("[data-tabbar] a[aria-current='page']")).toContainText("Catalogue");

  await taps.tap(collect.getByRole("button", { name: `Encaisser ${euros("70")} · Espèces`, exact: true }), "CTA");
  // Trois taps depuis n'importe quel écran : loupe, « Encaisser 70 € », CTA.
  taps.expectAtMost(3);
  await expectToast(page, `${euros("70")} encaissés · Espèces`);
  await expect(collect).toBeHidden();
  expect((await documentBalance(DOCS.rechercheEncaisser))?.due).toBe("0.00");

  // Le client soldé n'a plus d'action : le bouton laisse la place au résultat nu.
  const again = await search(page, "dounia");
  await expect(again.getByRole("button", { name: `Encaisser ${euros("70")}`, exact: true })).toHaveCount(0);
  // La rangée reste là, nue : son nom accessible porte le nom et le contact, pas de montant ni de bouton.
  await expect(again.getByRole("button", { name: /^Dounia Ferhat/ })).toBeVisible();

  // Rien d'autre n'a été écrit sur la fiche : un seul paiement de plus.
  const payments = await withE2eDb((db) =>
    db.payment.findMany({ where: { documentId: DOCS.rechercheEncaisser }, select: { kind: true, movement: { select: { amount: true } } } }),
  );
  expect(payments.map((payment) => [payment.kind, payment.movement.amount.toFixed(2)])).toEqual([
    ["BALANCE", "30.00"],
    ["BALANCE", "70.00"],
  ]);
});

test("S17 : « Vendre » sur un résultat parfum ouvre le composeur pré-rempli sur ce parfum", async ({ page }) => {
  await openShell(page, routes.clients());
  const taps = countTaps(page);
  const dialog = await search(page, "sauvage", taps);

  const action = dialog.getByRole("button", { name: "Vendre Sauvage", exact: true });
  await expect(action).toBeVisible();
  await taps.tap(action, "Vendre");

  // Une action qui NAVIGUE ferme la palette en naviguant (06 §4.4) : composeur, onglet Vendre, parfum posé.
  await page.waitForURL((url) => url.pathname === "/admin/vendre", { timeout: 60_000 });
  expect(new URL(page.url()).searchParams.get("parfum")).toBe(String(seedPerfumeId("Sauvage")));
  await expect(dialog).toBeHidden();
  await expect(page.locator("[data-edit-line]")).toContainText("Sauvage");
  await expect(page.locator("[data-tabbar] a[aria-current='page']")).toContainText("Vendre");
  taps.expectAtMost(2);

  // Un parfum en rupture ne propose pas de le vendre : le badge passe devant (05 §5.3).
  const rupture = await search(page, "oud mood");
  await expect(rupture.getByRole("button", { name: "Vendre Oud Mood", exact: true })).toHaveCount(0);
  await expect(rupture.getByText("Rupture", { exact: true }).first()).toBeVisible();
});
