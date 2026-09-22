import { expect, test, type Page } from "@playwright/test";
import { routes } from "../../src/app-shell/routes";
import { eurFromWire, formatEur, type MoneyString } from "../../src/domain/money";
import { SEED } from "../fixtures/seed";
import { withE2eDb } from "../helpers/db";
import { waitForHydration } from "../helpers/hydration";
import { countTaps } from "../helpers/tap";
import { actionSheet, expectToast, openShell } from "./support-j8";
import { lineCard, openFresh, openSheet, tile, waitForComposer } from "./support-j9";

/**
 * Réglages (07 J15 ; 06 E08, S07, S21 ; 02 §5 N2 et N3) : ce qu'on règle ici se retrouve PROPOSÉ ailleurs —
 * la poche par défaut pré-sélectionnée dans le composeur (E11) et dans S02, le taux DZD proposé sur une
 * ligne sans tarif mémorisé. Chaque réglage s'enregistre au changement, sans bouton « Enregistrer ».
 *
 * Ce fichier écrit la ligne `Setting` UNIQUE, que la moitié des parcours d'encaissement lisent (le nom de la
 * poche est dans leurs CTA) : il tourne dans son propre projet Playwright, après tous les autres
 * (`playwright.config.ts`), et rend l'état d'origine — au besoin par la base, dans un `finally`.
 */

const POCKETS = { unassigned: SEED.pockets[0], cash: SEED.pockets[1], bank: SEED.pockets[2] } as const;

const NORA = SEED.customers.find((customer) => customer.fullName === "Nora Belkacem")?.id as string;

const settingsInDb = () =>
  withE2eDb(async (db) => {
    const row = await db.setting.findUnique({ where: { id: 1 }, select: { defaultPocketId: true, defaultExchangeRate: true } });
    return { defaultPocketId: row?.defaultPocketId ?? null, defaultExchangeRate: row?.defaultExchangeRate?.toString() ?? null };
  });

/** Filet de sécurité : l'état d'origine est rendu par la base même si l'écran a échoué en route. */
const restoreInDb = (defaultPocketId: string | null, defaultExchangeRate: string) =>
  withE2eDb((db) => db.setting.update({ where: { id: 1 }, data: { defaultPocketId, defaultExchangeRate }, select: { id: true } }));

/** À encaisser d'une fiche, en SQL sur la vue (03 §5.3) : le montant que S02 doit proposer. */
const dueInSql = (customerId: string) =>
  withE2eDb(async (db) => {
    const [row] = await db.$queryRawUnsafe<{ due: string }[]>(
      `SELECT COALESCE(SUM(due), 0)::numeric(12,2)::text AS due FROM "DocumentBalance" WHERE "customerId" = $1 AND status IN ('CONFIRMED', 'DELIVERED')`,
      customerId,
    );
    return (row?.due ?? "0.00") as MoneyString;
  });

/** La rangée « Poche par défaut : Espèces › » de E08 zone 1. */
const pocketRow = (page: Page, name: string) => page.getByRole("button", { name: `Poche par défaut : ${name}`, exact: true });

async function choosePocket(page: Page, name: string): Promise<void> {
  const sheet = openSheet(page);
  await expect(sheet.getByRole("heading", { name: "Poche par défaut", exact: true })).toBeVisible();
  const option = sheet.getByRole("button", { name, exact: true });
  await waitForHydration(option);
  await option.tap();
  await expect(sheet).toBeHidden();
}

test("la poche par défaut choisie dans les Réglages est pré-sélectionnée dans le composeur et dans S02", async ({ page }, testInfo) => {
  testInfo.setTimeout(150_000);
  const before = await settingsInDb();
  expect(before.defaultPocketId, "le jeu part sur « Espèces »").toBe(POCKETS.cash.id);

  try {
    // 1. Réglages : la rangée dit la poche du moment, la sheet la change en 2 taps, sans bouton « Enregistrer ».
    await openShell(page, routes.reglages());
    const taps = countTaps(page);
    const row = pocketRow(page, POCKETS.cash.name);
    await waitForHydration(row);
    await taps.tap(row, "Poche par défaut");
    await choosePocket(page, POCKETS.bank.name);
    taps.expectAtMost(2);

    await expectToast(page, "Enregistré");
    await expect(pocketRow(page, POCKETS.bank.name)).toBeVisible();
    expect((await settingsInDb()).defaultPocketId).toBe(POCKETS.bank.id);

    // 2. E11 — le bloc Paiement d'une vente propose « Banque », et le CTA le dit.
    await openFresh(page, routes.vendre());
    await waitForComposer(page);
    await tile(page, "J'adore").tap();
    const chips = page.getByRole("group", { name: "Poche" });
    await expect(chips.getByRole("button", { name: POCKETS.bank.name, exact: true })).toHaveAttribute("aria-pressed", "true");
    await expect(chips.getByRole("button", { name: POCKETS.cash.name, exact: true })).toHaveAttribute("aria-pressed", "false");
    await expect(page.locator("[data-composer-cta]")).toContainText(POCKETS.bank.name);

    // 3. S02 — « Tout encaisser » depuis la fiche client : même poche proposée. Rien n'est encaissé.
    const due = await dueInSql(NORA);
    const amount = formatEur(eurFromWire(due));
    await openShell(page, routes.client(NORA));
    const collectCta = page.getByRole("button", { name: `Encaisser ${amount}`, exact: true });
    await waitForHydration(collectCta);
    await collectCta.tap();
    const collect = actionSheet(page, "Tout encaisser · Nora Belkacem");
    await expect(collect.getByRole("button", { name: `Encaisser ${amount} · ${POCKETS.bank.name}`, exact: true })).toBeVisible();
    await expect(collect.getByRole("group", { name: "Poche" }).getByRole("button", { name: POCKETS.bank.name, exact: true })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    // 4. Retour à « Espèces » par l'écran : le réglage se défait comme il s'est fait.
    await openShell(page, routes.reglages());
    const changed = pocketRow(page, POCKETS.bank.name);
    await waitForHydration(changed);
    await changed.tap();
    await choosePocket(page, POCKETS.cash.name);
    await expectToast(page, "Enregistré");
    await expect(pocketRow(page, POCKETS.cash.name)).toBeVisible();
    expect((await settingsInDb()).defaultPocketId).toBe(POCKETS.cash.id);
  } finally {
    await restoreInDb(before.defaultPocketId, before.defaultExchangeRate ?? "277");
  }
});

test("le taux DZD réglé dans les Réglages est proposé sur une ligne sans tarif mémorisé", async ({ page }) => {
  const before = await settingsInDb();

  try {
    await openShell(page, routes.reglages());
    const rate = page.getByLabel("Taux DZD par défaut", { exact: true });
    await waitForHydration(rate);
    await expect(rate).toHaveValue("277");
    // Une saisie s'enregistre quand on quitte le champ : pas de bouton, pas d'envoi à chaque frappe.
    await rate.fill("310");
    await rate.blur();
    await expectToast(page, "Enregistré");
    expect(Number((await settingsInDb()).defaultExchangeRate)).toBe(310);

    // « Mon Guerlain » n'a aucun tarif mémorisé : son taux est celui des Réglages, proposé — pas imposé.
    await openFresh(page, routes.vendre());
    await waitForComposer(page);
    await tile(page, "Mon Guerlain").tap();
    const card = lineCard(page, "Mon Guerlain");
    await card.getByRole("button", { name: /^Coût/ }).tap();
    await expect(card.getByLabel("Taux de Mon Guerlain", { exact: true })).toHaveValue("310");

    // Proposé, donc modifiable sur la ligne sans toucher au réglage.
    await card.getByLabel("Taux de Mon Guerlain", { exact: true }).fill("290");
    await expect(card.getByLabel("Taux de Mon Guerlain", { exact: true })).toHaveValue("290");
    expect(Number((await settingsInDb()).defaultExchangeRate)).toBe(310);

    // Un taux illisible ne part pas : le message du contrat s'affiche sous le champ, la valeur reste celle d'avant.
    await openShell(page, routes.reglages());
    const again = page.getByLabel("Taux DZD par défaut", { exact: true });
    await waitForHydration(again);
    await again.fill("0");
    await again.blur();
    await expect(page.getByText("Saisis un taux supérieur à 0 (ex. 277).", { exact: true })).toBeVisible();
    expect(Number((await settingsInDb()).defaultExchangeRate)).toBe(310);

    await again.fill("277");
    await again.blur();
    await expectToast(page, "Enregistré");
    expect(Number((await settingsInDb()).defaultExchangeRate)).toBe(277);
  } finally {
    await restoreInDb(before.defaultPocketId, before.defaultExchangeRate ?? "277");
  }
});

test("« Ordre des poches » ouvre S21 depuis les Réglages : « Monter » remonte la poche, le serveur renumérote", async ({ page }) => {
  const order = () =>
    withE2eDb((db) => db.pocket.findMany({ where: { isSystem: false, archived: false }, orderBy: { sortOrder: "asc" }, select: { name: true } }));
  const before = (await order()).map((pocket) => pocket.name);

  try {
    await openShell(page, routes.reglages());
    const row = page.getByRole("button", { name: "Ordre des poches", exact: true });
    await waitForHydration(row);
    await row.tap();
    const sheet = openSheet(page);
    await expect(sheet.getByRole("heading", { name: "Ordre des poches", exact: true })).toBeVisible();
    await expect(sheet.locator("[data-pocket-order]").first()).toHaveAttribute("data-pocket-order", before[0] as string);

    // La deuxième poche remonte : « Monter » est désactivé sur la première ligne, jamais sur la deuxième.
    const second = before[1] as string;
    await sheet.getByRole("button", { name: `Monter ${second}`, exact: true }).tap();
    await expect(sheet.locator("[data-pocket-order]").first()).toHaveAttribute("data-pocket-order", second);
    await expect.poll(async () => (await order()).map((pocket) => pocket.name)).toEqual([second, before[0], ...before.slice(2)]);
  } finally {
    // L'ordre d'origine, rendu par la base : aucun autre parcours ne doit hériter de ce remaniement.
    await withE2eDb(async (db) => {
      for (const [index, name] of before.entries()) await db.pocket.updateMany({ where: { name }, data: { sortOrder: index } });
    });
  }
});
