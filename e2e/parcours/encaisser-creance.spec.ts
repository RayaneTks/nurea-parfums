import { expect, test } from "@playwright/test";
import { routes } from "../../src/app-shell/routes";
import { DOCS, PASSING } from "../fixtures/documents";
import { documentBalance, withE2eDb } from "../helpers/db";
import { waitForHydration } from "../helpers/hydration";
import { countTaps } from "../helpers/tap";
import { actionSheet, euros, expectToast, openShell } from "./support-j8";

/**
 * PC-02 — Encaisser une créance (06 §2 ; 02 §2 tâche n°2 : ≤ 4 taps depuis l'Accueil ; 07 J8). La tuile
 * « À encaisser » de l'Accueil arrive au jalon J14 : depuis l'Accueil, le chemin passe par la recherche
 * (« Aller à › À encaisser »), puis 2 taps sur la liste. « Tout encaisser » : un paiement par document, du plus
 * ancien au plus récent, en une transaction.
 */

const TOUT = [DOCS.toutA, DOCS.toutB, DOCS.toutC];

const paymentsOfTout = () =>
  withE2eDb((db) =>
    db.payment.findMany({
      where: { documentId: { in: TOUT } },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      select: { id: true, documentId: true, movement: { select: { amount: true } } },
    }),
  );

test("PC-02 : une créance encaissée en 4 taps depuis l'Accueil — 2 sur la liste À encaisser —, dû à 0", async ({ page }) => {
  await openShell(page, routes.accueil());
  const taps = countTaps(page);
  await taps.tap(page.getByRole("button", { name: "Rechercher" }), "Rechercher");
  const palette = page.getByRole("dialog", { name: "Recherche" });
  await taps.tap(palette.getByRole("button", { name: "À encaisser" }), "Aller à › À encaisser");
  await expect(page.getByRole("heading", { level: 1, name: "À encaisser" })).toBeVisible();

  const amount = page.getByRole("button", { name: `Encaisser ${euros("80")} · ${PASSING.creance}` });
  await waitForHydration(amount);
  await taps.tap(amount, "bouton-montant");
  const collect = actionSheet(page, `Encaisser · ${PASSING.creance}`);
  await expect(collect).toContainText(`total ${euros("100")}, payé ${euros("20")}`);
  await taps.tap(collect.getByRole("button", { name: `Encaisser ${euros("80")} · Espèces` }), "CTA");
  taps.expectAtMost(4);

  await expectToast(page, `${euros("80")} encaissés · Espèces`);
  await expect(page.getByRole("button", { name: `Encaisser ${euros("80")} · ${PASSING.creance}` })).toHaveCount(0);
  expect(await documentBalance(DOCS.creance)).toMatchObject({ paid: "100.00", due: "0.00" });
});

test("« Tout encaisser » d'un client à trois créances : 2 taps depuis À encaisser, un paiement par document, du plus ancien au plus récent", async ({ page }) => {
  const before = await paymentsOfTout();
  await openShell(page, routes.encaisser());
  const all = page.getByRole("button", { name: `Tout encaisser ${euros("120")}` });
  await waitForHydration(all);
  const taps = countTaps(page);
  await taps.tap(all, "Tout encaisser");
  const collect = actionSheet(page, `Tout encaisser · ${PASSING.tout}`);
  await expect(collect).toContainText("Réparti du plus ancien au plus récent");
  await taps.tap(collect.getByRole("button", { name: `Encaisser ${euros("120")} · Espèces` }), "CTA");
  taps.expectAtMost(2);
  await expectToast(page, `${euros("120")} encaissés · Espèces`);
  await expect(page.getByRole("button", { name: `Tout encaisser ${euros("120")}` })).toHaveCount(0);

  for (const id of TOUT) expect((await documentBalance(id))?.due).toBe("0.00");
  const known = new Set(before.map((payment) => payment.id));
  const written = (await paymentsOfTout()).filter((payment) => !known.has(payment.id));
  expect(written.map((payment) => [payment.documentId, payment.movement.amount.toFixed(2)])).toEqual([
    [DOCS.toutA, "50.00"],
    [DOCS.toutB, "40.00"],
    [DOCS.toutC, "30.00"],
  ]);
});
