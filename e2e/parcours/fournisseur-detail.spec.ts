import { expect, test } from "@playwright/test";
import { routes } from "../../src/app-shell/routes";
import { withE2eDb } from "../helpers/db";
import { openFresh } from "./support-j9";

/**
 * Carnet fournisseur, « Voir le détail » (S27, docs/admin/dettes-fournisseur.md, 09/11/2026) : les parfums des
 * dettes notées, par client, avec leur coût en DA, puis l'addition à copier pour le fournisseur. La dette
 * cochée sur une commande montre ses parfums ; la dette tapée à la main va sous « Autres ».
 *
 * Le parcours change le Reste à payer que d'autres cas lisent : il tourne avec les réglages, seul.
 */

const PICKED_ID = "ce2edettedetailcochee0000";
const MANUAL_ID = "ce2edettedetailmain000000";

test.beforeEach(async () => {
  await withE2eDb(async (db) => {
    await db.supplierEntry.deleteMany({ where: { id: { in: [PICKED_ID, MANUAL_ID] } } });
    const document = await db.saleDocument.findFirstOrThrow({
      where: { status: { not: "CANCELLED" }, customerName: { not: null }, lines: { some: { unitCostDzd: { not: null } } } },
      orderBy: { id: "asc" },
      select: { id: true },
    });
    await db.supplierEntry.create({
      data: { id: PICKED_ID, kind: "DEBT", amountDzd: "19500.00", label: "Dette cochée", items: { create: { documentId: document.id, amountDzd: "0" } } },
    });
    await db.supplierEntry.create({ data: { id: MANUAL_ID, kind: "DEBT", amountDzd: "3000.00", label: "Transport du détail" } });
  });
});

test.afterEach(async () => {
  await withE2eDb((db) => db.supplierEntry.deleteMany({ where: { id: { in: [PICKED_ID, MANUAL_ID] } } }));
});

test("voir le détail du reste à payer et le copier", async ({ page }, testInfo) => {
  await openFresh(page, routes.fournisseur());
  const header = (await page.locator('[data-supplier-header="due"]').innerText()).split("\n").find((text) => /DA$/.test(text.trim())) ?? "";
  const remaining = header.replace(/\D/g, "");
  await page.getByRole("button", { name: "Voir le détail, parfum par parfum" }).click();

  const sheet = page.getByRole("dialog", { name: "Détail du reste à payer" });
  await expect(sheet.locator("[data-supplier-detail]")).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("detail-haut.png") });
  await sheet.locator("[data-supplier-detail-total]").scrollIntoViewIfNeeded();
  await expect(sheet.getByText("Transport du détail", { exact: true })).toBeVisible();
  await expect(sheet.getByText("Autres", { exact: true })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("detail-bas.png") });

  // Le texte copié : la feuille de partage n'existe pas ici, la copie prend le relais.
  await page.evaluate(() => {
    (window as unknown as { __copied: string }).__copied = "";
    Object.defineProperty(navigator, "share", { value: undefined, configurable: true });
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: async (text: string) => void ((window as unknown as { __copied: string }).__copied = text) },
      configurable: true,
    });
  });
  await sheet.getByRole("button", { name: "Copier le détail" }).click();
  const copied = await page.evaluate(() => (window as unknown as { __copied: string }).__copied);
  expect(copied).toContain("Autres\n");
  expect(copied).toContain("- Transport du détail 3000DA");
  await testInfo.attach("texte-copie", { body: copied, contentType: "text/plain" });
  // L'addition finale vaut le Reste à payer de l'en-tête.
  expect(copied).toMatch(new RegExp(`^\\d+(\\+\\d+)* = ${remaining} DA$`, "m"));
});
