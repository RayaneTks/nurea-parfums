import { expect, test } from "@playwright/test";
import { routes, withSheet } from "../../src/app-shell/routes";
import { DOCS } from "../fixtures/documents";
import { SEED } from "../fixtures/seed";
import { waitForHydration } from "../helpers/hydration";
import { countTaps } from "../helpers/tap";
import { documentSheet } from "./support-j8";
import { chrono, cta, euros, openFresh, waitForComposer } from "./support-j9";

/**
 * « Refaire » (A-9, 06 S01 menu « ⋯ ») : la fiche d'une vente pré-remplit le composeur — lignes, client et lot encore
 * ouvert — pour relecture avant validation ; jamais ses paiements, sa livraison ni ses notes. Aucune écriture tant
 * que le CTA n'est pas touché.
 */

test("« Refaire » d'une vente : lignes, client et lot repris, paiements laissés de côté", async ({ page }, testInfo) => {
  const elise = SEED.customers[2];
  await openFresh(page, withSheet(routes.commandes(), { doc: DOCS.refaire }));
  const fiche = documentSheet(page);
  const menu = fiche.getByRole("button", { name: "Plus d'actions" });
  await waitForHydration(menu);

  const taps = countTaps(page);
  const stop = chrono(testInfo, "« Refaire » depuis la fiche");
  await taps.tap(menu, "menu ⋯");
  const sheet = page.locator('[data-vaul-drawer][data-state="open"]').last();
  await taps.tap(sheet.getByRole("button", { name: "Refaire", exact: true }), "Refaire");
  await page.waitForURL((url) => url.pathname === "/admin/vendre", { timeout: 60_000 });
  await waitForComposer(page);
  stop(taps.count);

  // Les deux lignes de la vente d'origine, à leurs prix, le client lié et le lot encore ouvert.
  await expect(page.locator("[data-edit-line]")).toHaveCount(2);
  await expect(page.getByLabel("Prix de Yara", { exact: true })).toHaveValue("60");
  await expect(page.getByLabel("Prix de N°5", { exact: true })).toHaveValue("140");
  await expect(page.getByRole("button", { name: `Client : ${elise.fullName}` })).toBeVisible();
  await expect(page.getByRole("button", { name: "Lot : Commande de mars" })).toBeVisible();
  await expect(page.getByRole("radio", { name: "Vente" })).toHaveAttribute("aria-checked", "true");

  // Le reçu proposé est le total : rien n'a été écrit, le paiement d'origine n'est pas repris.
  await expect(page.getByLabel("Reçu maintenant", { exact: true })).toHaveValue("260");
  await expect(cta(page)).toContainText(`Encaisser ${euros("260")}`);
  // Les paramètres d'URL sont consommés : un rechargement ne rejoue pas la reprise.
  await expect.poll(() => new URL(page.url()).search).toBe("");
});
