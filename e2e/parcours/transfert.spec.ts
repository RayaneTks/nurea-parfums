import { expect, test, type Page } from "@playwright/test";
import { routes } from "../../src/app-shell/routes";
import { SEED } from "../fixtures/seed";
import { withE2eDb } from "../helpers/db";
import { waitForHydration } from "../helpers/hydration";
import { countTaps } from "../helpers/tap";
import { euros, expectNoReload, expectToast, markDocument, openShell } from "./support-j8";

/**
 * PC-11 — Ranger l'argent (06 §2, 07 J12) : répartir le non attribué en 2 taps depuis E03, transférer entre deux
 * poches en 5 taps + saisie, annuler le transfert depuis le journal en 3 taps. Les soldes des deux poches sont à
 * jour SANS rechargement, et « Non attribué » ne passe jamais sous zéro.
 *
 * Fichier en série : ces trois gestes se suivent sur les mêmes poches (« Coffre » et « Compte pro », dédiées à ce
 * parcours) et sur « Non attribué », que le premier vide.
 */

test.describe.configure({ mode: "serial" });

const UNASSIGNED = SEED.pockets[0].id;
const COFFRE = SEED.pockets[3].id;
const COMPTE_PRO = SEED.pockets[4].id;

/** Solde d'une poche, par la définition de 03 §5.5 exécutée sur la base de test. */
function pocketBalance(id: string): Promise<string> {
  return withE2eDb(async (db) => {
    const [row] = await db.$queryRawUnsafe<{ balance: string }[]>(
      `SELECT (p."openingBalance" + COALESCE(SUM(m.amount), 0))::numeric(12,2)::text AS balance
       FROM "Pocket" p LEFT JOIN "CashMovement" m ON m."pocketId" = p.id WHERE p.id = $1 GROUP BY p.id`,
      id,
    );
    return row?.balance ?? "absente";
  });
}

function movements(pocketId: string) {
  return withE2eDb((db) =>
    db.cashMovement.findMany({
      where: { pocketId },
      orderBy: [{ createdAt: "asc" }],
      select: { id: true, kind: true, amount: true, transferGroupId: true, reversesId: true },
    }),
  );
}

const pocketRow = (page: Page, name: string) => page.locator(`[data-pocket-row="${name}"]`);
const sheet = (page: Page) => page.locator('[data-vaul-drawer][data-state="open"]').last();

test("« Non attribué » ne passe jamais sous zéro : une sortie au-delà de son solde est refusée, rien n'est écrit", async ({ page }) => {
  const before = await pocketBalance(UNASSIGNED);
  const written = (await movements(UNASSIGNED)).length;
  await openShell(page, routes.compta({ vue: "tresorerie" }));

  const open = page.getByRole("button", { name: "Nouveau mouvement", exact: true });
  await waitForHydration(open);
  await open.tap();
  const form = sheet(page);
  await expect(form.locator("[data-movement-sheet]")).toBeVisible();
  await form.getByRole("group", { name: "De" }).getByRole("button", { name: "Non attribué", exact: true }).tap();
  await form.getByRole("group", { name: "Vers" }).getByRole("button", { name: "Compte pro", exact: true }).tap();
  await form.getByLabel("Montant", { exact: true }).fill("500");

  // Le plafond dit ce qui est possible, et le CTA ne propose que de s'y ramener : aucune écriture possible.
  await expect(form).toContainText(`${euros(before)} au maximum`);
  await expect(form.locator("[data-movement-cta]")).toHaveText(`Ramener à ${euros(before)}`);
  await expect(form.getByRole("button", { name: /^Transférer 500/ })).toHaveCount(0);

  expect(await pocketBalance(UNASSIGNED)).toBe(before);
  expect(await movements(UNASSIGNED)).toHaveLength(written);
  expect(before.startsWith("-")).toBe(false);
});

test("PC-11 : répartir le non attribué en 2 taps depuis la Trésorerie", async ({ page }) => {
  const amount = await pocketBalance(UNASSIGNED);
  expect(amount).not.toBe("0.00");
  await openShell(page, routes.compta({ vue: "tresorerie" }));
  await markDocument(page);

  const taps = countTaps(page);
  const repartir = page.getByRole("button", { name: "Répartir", exact: true });
  await waitForHydration(repartir);
  await taps.tap(repartir, "Répartir");
  const form = sheet(page);
  await expect(form.getByRole("heading", { name: "Répartir le non attribué" })).toBeVisible();
  await taps.tap(form.getByRole("button", { name: `Ranger ${euros(amount)} dans Espèces`, exact: true }), "CTA");
  taps.expectAtMost(2);

  await expectToast(page, `${euros(amount)} rangés dans Espèces`);
  await expect(page.locator("[data-unassigned]")).toHaveCount(0);
  await expect(pocketRow(page, "Non attribué")).toContainText(euros("0"));
  await expectNoReload(page);

  expect(await pocketBalance(UNASSIGNED)).toBe("0.00");
  const legs = (await movements(UNASSIGNED)).filter((movement) => movement.kind === "TRANSFER");
  expect(legs).toHaveLength(1);
  expect(legs[0]?.amount.toFixed(2)).toBe(`-${Number(amount).toFixed(2)}`);
});

test("PC-11 : transférer 300 € entre deux poches en 5 taps + saisie ; les deux soldes sont à jour sans rechargement", async ({ page }) => {
  expect(await pocketBalance(COFFRE)).toBe("500.00");
  await openShell(page, routes.compta({ vue: "tresorerie" }));
  await markDocument(page);

  const taps = countTaps(page);
  const coffre = page.getByRole("button", { name: "Poche Coffre", exact: true });
  await waitForHydration(coffre);
  await taps.tap(coffre, "poche Coffre");
  const pocket = sheet(page);
  await expect(pocket.locator("[data-pocket-sheet]")).toBeVisible();
  await taps.tap(pocket.getByRole("button", { name: "Transférer", exact: true }), "Transférer");
  const form = sheet(page);
  await expect(form.locator("[data-movement-sheet]")).toBeVisible();
  await taps.tap(form.getByRole("group", { name: "Vers" }).getByRole("button", { name: "Compte pro", exact: true }), "chip Compte pro");
  await form.getByLabel("Montant", { exact: true }).fill("300");
  await taps.tap(form.locator("[data-movement-cta]"), "CTA");
  taps.expectAtMost(5);

  await expectToast(page, `${euros("300")} transférés vers Compte pro`);
  // La fiche de la poche reste ouverte : son solde a suivi.
  await expect(sheet(page).locator("[data-pocket-balance]")).toContainText(euros("200"));
  await sheet(page).getByRole("button", { name: "Fermer", exact: true }).tap();
  await expect(pocketRow(page, "Coffre")).toContainText(euros("200"));
  await expect(pocketRow(page, "Compte pro")).toContainText(euros("300"));
  await expectNoReload(page);

  expect(await pocketBalance(COFFRE)).toBe("200.00");
  expect(await pocketBalance(COMPTE_PRO)).toBe("300.00");
});

test("« Annuler le transfert » depuis le journal remet les deux soldes, la paire se replie", async ({ page }) => {
  expect(await pocketBalance(COFFRE)).toBe("200.00");
  await openShell(page, routes.journal({ poche: COFFRE }));

  const taps = countTaps(page);
  const menu = page.getByRole("button", { name: "Actions : Transfert vers Compte pro", exact: true });
  await waitForHydration(menu);
  await taps.tap(menu, "menu du mouvement");
  await taps.tap(sheet(page).getByRole("button", { name: "Annuler le transfert", exact: true }), "Annuler le transfert");
  // La confirmation dit l'effet (06 S18) et porte le même libellé d'action, par-dessus la sheet du menu.
  await expect(page.getByText("Une écriture inverse est ajoutée à la même date sur les deux poches.")).toBeVisible();
  await taps.tap(page.getByRole("button", { name: "Annuler le transfert", exact: true }).last(), "Confirmer");
  taps.expectAtMost(3);

  await expectToast(page, "Transfert annulé");
  await expect(page.locator("[data-journal-pair]").first()).toContainText("Annulé · Transfert vers Compte pro");

  expect(await pocketBalance(COFFRE)).toBe("500.00");
  expect(await pocketBalance(COMPTE_PRO)).toBe("0.00");
  await openShell(page, routes.compta({ vue: "tresorerie" }));
  await expect(pocketRow(page, "Coffre")).toContainText(euros("500"));
  await expect(pocketRow(page, "Compte pro")).toContainText(euros("0"));
});
