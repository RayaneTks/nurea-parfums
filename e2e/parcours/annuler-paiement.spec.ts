import { expect, test } from "@playwright/test";
import { routes, withSheet } from "../../src/app-shell/routes";
import { DOCS } from "../fixtures/documents";
import { documentBalance, paymentsOf } from "../helpers/db";
import { waitForHydration } from "../helpers/hydration";
import { countTaps } from "../helpers/tap";
import { documentSheet, euros, openShell } from "./support-j8";

/**
 * PC-10 — Annuler un paiement saisi par erreur (06 §2, S18 ; 03 §4.4 T8 ; 07 J8) : 3 taps depuis la fiche, un
 * dialogue qui dit la vérité sur l'effet, une contre-passation dans la MÊME poche à la MÊME date de valeur, le
 * statut inchangé, le dû restauré — à l'écran et en base.
 */

test("PC-10 : « Annuler ce paiement » en 3 taps — contre-passation même poche, même date, statut inchangé, dû restauré", async ({ page }) => {
  await openShell(page, withSheet(routes.commandes(), { doc: DOCS.voidPayment }));
  const fiche = documentSheet(page);
  const actions = fiche.getByRole("button", { name: /^Actions : Acompte du / });
  await waitForHydration(actions);
  const [original] = await paymentsOf(DOCS.voidPayment);
  expect(original?.kind).toBe("DEPOSIT");

  const taps = countTaps(page);
  await taps.tap(actions, "… sur l'acompte");
  await taps.tap(page.getByRole("button", { name: "Annuler ce paiement", exact: true }), "Annuler ce paiement");
  const dialog = page.locator("[data-confirm-dialog]");
  await expect(dialog).toContainText(`Annuler ce paiement de ${euros("40")} ?`);
  await expect(dialog).toContainText("Une écriture inverse est ajoutée à la même date dans Espèces. Le paiement reste visible, barré.");
  await expect(dialog).toContainText(`Elle reste confirmée : ${euros("120")} resteront à encaisser.`);
  await taps.tap(dialog.getByRole("button", { name: "Annuler le paiement" }), "Confirmer");
  taps.expectAtMost(3);

  await expect(dialog).toBeHidden();
  await expect(fiche.getByText("Paiement annulé", { exact: true })).toBeVisible();
  await expect(fiche.locator('[data-money-tile="À encaisser"]')).toContainText(euros("120"));
  await expect(fiche.getByRole("radio", { name: "Confirmée" })).toHaveAttribute("aria-checked", "true");

  const [first, reversal] = await paymentsOf(DOCS.voidPayment);
  expect(reversal?.kind).toBe("REFUND");
  expect(reversal?.movement.amount.toFixed(2)).toBe("-40.00");
  expect(reversal?.movement.pocketId).toBe(first?.movement.pocketId);
  expect(reversal?.movement.occurredAt.toISOString()).toBe(first?.movement.occurredAt.toISOString());
  expect(await documentBalance(DOCS.voidPayment)).toMatchObject({ status: "CONFIRMED", paid: "0.00", due: "120.00" });
});
