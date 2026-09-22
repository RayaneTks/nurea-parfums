import { expect, test } from "@playwright/test";
import { routes } from "../../src/app-shell/routes";
import { DOCS, PASSING } from "../fixtures/documents";
import { paymentsOf } from "../helpers/db";
import { waitForHydration } from "../helpers/hydration";
import { actionSheet, euros, expectToast, openShell, toast } from "./support-j8";

/**
 * Réseau coupé pendant un encaissement (04 §3.6, §14.5 ; 06 S02 « États » ; 07 J8) : le message dit la vérité, la
 * sheet garde la saisie ; réseau rétabli, « Réessayer » renvoie le MÊME identifiant de paiement — un seul
 * paiement en base, jamais deux.
 */

test("S02 hors ligne : « Pas de réseau », saisie gardée ; « Réessayer » réseau rétabli : un seul paiement", async ({ page, context }) => {
  await openShell(page, routes.encaisser());
  const amount = page.getByRole("button", { name: `Encaisser ${euros("70")} · ${PASSING.offline}` });
  await waitForHydration(amount);
  await amount.tap();
  const collect = actionSheet(page, `Encaisser · ${PASSING.offline}`);
  const cta = collect.getByRole("button", { name: `Encaisser ${euros("70")} · Espèces` });
  await waitForHydration(cta);
  expect(await paymentsOf(DOCS.offline)).toHaveLength(0);

  await context.setOffline(true);
  await cta.tap();
  await expectToast(page, "Pas de réseau. Ta saisie est gardée — réessaie quand ça capte.");
  await expect(collect).toBeVisible();
  await expect(collect.getByLabel("Montant encaissé", { exact: true })).toHaveValue("70");

  await context.setOffline(false);
  await toast(page).getByRole("button", { name: "Réessayer" }).tap();
  await expectToast(page, `${euros("70")} encaissés · Espèces`);
  await expect(collect).toBeHidden();

  // Une seule écriture : le renvoi a porté le même identifiant (04 §3.6).
  await expect.poll(async () => (await paymentsOf(DOCS.offline)).length).toBe(1);
  await page.waitForTimeout(1000);
  expect(await paymentsOf(DOCS.offline)).toHaveLength(1);
});
