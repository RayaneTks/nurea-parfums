import { expect, test } from "@playwright/test";
import { routes } from "../../src/app-shell/routes";
import { withE2eDb } from "../helpers/db";
import { expectToast } from "./support-j8";
import { openFresh, openSheet } from "./support-j9";

/**
 * Carnet fournisseur, « Marquer remboursée » (docs/admin/dettes-fournisseur.md, décidé le 25/10/2026) :
 * toucher une dette, la marquer remboursée, lire « Remboursée le … » et le Reste à payer qui baisse ;
 * puis annuler le remboursement. Aucun mouvement d'argent n'est écrit.
 *
 * Le parcours change le Reste à payer que d'autres cas lisent : il tourne avec les réglages, seul
 * (`playwright.config.ts`), sur une dette qu'il crée et efface lui-même.
 */

const DEBT_ID = "ce2edetterembourser00000";
const LABEL = "Dette à rembourser";

const settlementOf = () =>
  withE2eDb((db) => db.supplierEntry.findFirst({ where: { settlesEntryId: DEBT_ID }, select: { id: true, amountDzd: true, kind: true } }));

test.beforeEach(async () => {
  await withE2eDb(async (db) => {
    await db.supplierEntry.deleteMany({ where: { id: DEBT_ID } });
    await db.supplierEntry.create({ data: { id: DEBT_ID, kind: "DEBT", amountDzd: "12500.00", label: LABEL } });
  });
});

test.afterEach(async () => {
  await withE2eDb((db) => db.supplierEntry.deleteMany({ where: { id: DEBT_ID } }));
});

test("marquer une dette remboursée, puis annuler le remboursement", async ({ page }) => {
  const movements = await withE2eDb((db) => db.cashMovement.count());
  await openFresh(page, routes.fournisseur({ ligne: DEBT_ID }));

  const sheet = openSheet(page);
  await expect(sheet.locator('[data-supplier-line="DEBT"]')).toBeVisible();
  await sheet.getByRole("button", { name: "Marquer remboursée", exact: true }).click();
  await expectToast(page, "Dette marquée remboursée");
  await expect(sheet.locator("[data-supplier-settled]")).toContainText("Remboursée le");

  const payment = await settlementOf();
  expect(payment).toMatchObject({ kind: "PAYMENT" });
  expect(payment?.amountDzd.toString()).toBe("12500");
  expect(await withE2eDb((db) => db.cashMovement.count())).toBe(movements);

  // Le carnet le dit en toutes lettres : la dette remboursée, et la ligne de remboursement.
  await page.keyboard.press("Escape");
  const ledger = page.locator("[data-supplier-ledger]");
  await expect(ledger.getByRole("button").filter({ hasText: LABEL })).toContainText("Dette remboursée");
  await expect(ledger.getByRole("button").filter({ hasText: "Remboursement" }).first()).toBeVisible();

  // Annuler le remboursement : le versement part au bout du filet, la dette redevient à payer.
  await page.goto(routes.fournisseur({ ligne: DEBT_ID }));
  await openSheet(page).getByRole("button", { name: "Annuler le remboursement", exact: true }).click();
  await expectToast(page, "Remboursement annulé");
  await expect.poll(settlementOf, { timeout: 15_000 }).toBeNull();
});
