import { expect, test, type Page } from "@playwright/test";
import { routes } from "../../src/app-shell/routes";
import { comptaPeriodKey, exportComptaUrl, exportRangeOf, figurePeriodLabel } from "../../src/contracts/compta";
import { eur, eurFromWire, formatEur, parseEurInput, toWire, type MoneyString } from "../../src/domain/money";
import { COMPTA_DOCS, COMPTA_MONTH, JOURNAL_MONTH, NO_CASH_MONTH } from "../fixtures/compta";
import { SEED } from "../fixtures/seed";
import { chiffresCanoniques, shown } from "../helpers/chiffres";
import { withE2eDb } from "../helpers/db";
import { waitForHydration } from "../helpers/hydration";
import { countTaps } from "../helpers/tap";
import { margeNetteRow } from "../routes";
import { euros, openShell } from "./support-j8";

/**
 * PC-09 — Faire le bilan du mois (06 §2, 07 J12) : la compta du mois en 2 taps depuis l'Accueil provisoire (la
 * tuile « Encaissé » de E01 arrive à J14), chaque chiffre affiché confronté à la requête canonique de 03 §5
 * exécutée sur la base de test, le détail de la Marge nette (S19), l'export CSV recoupable avec l'écran, le net du
 * journal sur le mois entier, et l'archivage refusé avec sa raison.
 *
 * Les chiffres se lisent sur des mois où aucun autre parcours n'écrit (`e2e/fixtures/compta.ts`) : les gestes de
 * J8 encaissent aujourd'hui.
 */

const MONTH_REF = COMPTA_MONTH.ref();
const BANK = SEED.pockets[2].id;

/** Le montant affiché par `Money` (l'espace fine insécable de `formatEur`, sans le texte du lecteur d'écran). */
async function money(page: Page, selector: string): Promise<string> {
  return (await page.locator(`${selector} span[aria-hidden]`).first().innerText()).trim();
}

test("PC-09 : la compta du mois en 2 taps depuis l'Accueil, chiffres du mois = requête canonique", async ({ page }) => {
  await openShell(page, routes.accueil());
  const taps = countTaps(page);
  await taps.tap(page.getByRole("button", { name: "Rechercher" }), "Rechercher");
  const palette = page.getByRole("dialog", { name: "Recherche" });
  await taps.tap(palette.getByRole("button", { name: "Compta", exact: true }), "Aller à › Compta");
  taps.expectAtMost(2);

  await expect(page.getByRole("heading", { level: 1, name: "Compta" })).toBeVisible();
  await expect(page.locator("[data-sales-figures]")).toBeVisible();
  // Période Mois par défaut, et chaque chiffre de flux est daté du mois en cours (06 §1.7).
  const figures = page.locator("[data-sales-figures]");
  await expect(figures).toContainText(`Encaissé · ${figurePeriodLabel("mois", null)}`);
  await expect(figures).toContainText(`Marge nette · ${figurePeriodLabel("mois", null)}`);
  await expect(figures).toContainText(`Dépenses déduites · ${figurePeriodLabel("mois", null)}`);
  await expect(page.getByRole("group", { name: "Période" }).getByRole("button", { name: "Mois" })).toHaveAttribute("aria-pressed", "true");
  // Les montants du mois en cours bougent pendant la suite (les autres parcours encaissent aujourd'hui) : la
  // confrontation à la requête canonique se fait sur un mois passé, où personne n'écrit (test suivant).
  expect(await money(page, '[data-figure="encaisse"]')).toMatch(/€$/);
});

test("E03 d'un mois passé : Encaissé, Marge nette, dépenses, À encaisser et documents = requêtes canoniques", async ({ page }) => {
  const canonical = chiffresCanoniques(comptaPeriodKey({ periode: "mois", ref: MONTH_REF }));
  await openShell(page, routes.compta({ ref: MONTH_REF }));
  const figures = page.locator("[data-sales-figures]");
  await waitForHydration(page.getByRole("button", { name: margeNetteRow(MONTH_REF), exact: true }));

  await expect(figures).toContainText(`Encaissé · ${figurePeriodLabel("mois", MONTH_REF)}`);
  expect(await money(page, '[data-figure="encaisse"]')).toBe(shown(canonical.encaisse));
  expect(await money(page, '[data-figure="marge-nette"]')).toBe(shown(canonical.margeNette.value));
  expect(await money(page, '[data-figure="depenses"]')).toBe(shown(canonical.margeNette.expenses));
  await expect(figures.locator('[data-figure="marge-nette"]')).toContainText(`${(canonical.margeNette.percent ?? "").replace(/,0$/, "")} %`);

  // Les documents de la liste sont EXACTEMENT ceux que compte `documentsDeLaPeriode`.
  const rows = await page.locator("[data-compta-document]").evaluateAll((nodes) => nodes.map((node) => node.getAttribute("data-compta-document")));
  expect(new Set(rows)).toEqual(new Set(canonical.documentsDeLaPeriode.documentIds));
  // En-tête de lot sans montant (02 §4.3 : les montants d'un lot se lisent sur sa fiche), « Hors lot » en dernier.
  const sections = await page.locator("[data-period-documents] section h2").allInnerTexts();
  expect(sections[0]).toContain("Commande de mars");
  expect(sections.at(-1)).toContain("Hors lot");
  expect(sections.join(" | ")).not.toContain("€");
});

test("S19 : Encaissé − coûts − dépenses = Marge nette affichée ; le lien mène aux documents au coût à compléter", async ({ page }) => {
  const canonical = chiffresCanoniques(comptaPeriodKey({ periode: "mois", ref: MONTH_REF }));
  await openShell(page, routes.compta({ ref: MONTH_REF }));
  const open = page.getByRole("button", { name: margeNetteRow(MONTH_REF), exact: true });
  await waitForHydration(open);
  await open.tap();

  const sheet = page.locator("[data-marge-nette-sheet]");
  await expect(sheet).toBeVisible();
  const line = async (name: string) => money(page, `[data-marge-line="${name}"]`);
  const encaisse = eurFromWire(canonical.encaisse);
  const costs = eurFromWire(canonical.margeNette.costs);
  const expenses = eurFromWire(canonical.margeNette.expenses);
  expect(await line("encaisse")).toBe(formatEur(encaisse));
  expect(await line("couts")).toBe(formatEur(costs));
  expect(await line("depenses")).toBe(formatEur(expenses));
  // L'équation de l'écran est celle de la définition (03 §5.4).
  expect(await line("marge")).toBe(formatEur(eur.sub(eur.sub(encaisse, costs), expenses)));
  expect(await line("marge")).toBe(shown(canonical.margeNette.value));

  // « n documents au coût à compléter, comptés 0 € » ouvre EXACTEMENT cet ensemble, période gardée.
  expect(canonical.coutACompleter.count).toBeGreaterThan(0);
  await expect(sheet.locator("[data-unknown-cost]")).toContainText(`${canonical.coutACompleter.count} document`);
  await sheet.locator("[data-unknown-cost]").tap();
  await expect(page).toHaveURL(new RegExp(`filtre=cout-a-completer`));
  await expect(page).toHaveURL(new RegExp(`ref=${MONTH_REF}`));
  const filtered = await page.locator("[data-compta-document]").evaluateAll((nodes) => nodes.map((node) => node.getAttribute("data-compta-document")));
  expect(new Set(filtered)).toEqual(new Set(canonical.coutACompleter.documentIds));
  await expect(page.getByRole("button", { name: "Retirer le filtre Coût à compléter" })).toBeVisible();
});

test("S19 : pas de pourcentage quand l'Encaissé de la période est nul", async ({ page }) => {
  const ref = NO_CASH_MONTH.ref();
  const canonical = chiffresCanoniques(comptaPeriodKey({ periode: "mois", ref }));
  expect(canonical.encaisse).toBe("0.00");
  await openShell(page, routes.compta({ ref }));
  const open = page.getByRole("button", { name: margeNetteRow(ref), exact: true });
  await waitForHydration(open);
  await open.tap();
  const sheet = page.locator("[data-marge-nette-sheet]");
  await expect(sheet.locator('[data-marge-line="couts"]')).toContainText(formatEur(eurFromWire(canonical.margeNette.costs)));
  await expect(sheet.locator('[data-marge-line="marge"]')).not.toContainText("%");
});

test("export CSV : BOM, « ; », aucun en-tête « CA », et Σ « Encaissé (€) » = l'Encaissé de la période, sur trois périodes", async ({ page }) => {
  // Sans partage de fichiers (ordinateur), « Exporter » télécharge le fichier de la période affichée.
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "canShare", { value: undefined, configurable: true });
    Object.defineProperty(navigator, "share", { value: undefined, configurable: true });
  });
  await openShell(page, routes.compta({ ref: MONTH_REF }));
  const button = page.getByRole("button", { name: "Exporter", exact: true });
  await waitForHydration(button);
  const [download] = await Promise.all([page.waitForEvent("download", { timeout: 30_000 }), button.tap()]);
  const range = exportRangeOf({ periode: "mois", ref: MONTH_REF });
  expect(download.suggestedFilename()).toBe(`compta-${range?.du}-au-${range?.au}.csv`);
  const text = await readDownload(download);
  expect(text.startsWith("﻿")).toBe(true);
  const header = text.slice(1).split("\r\n")[0] ?? "";
  expect(header).toBe("Date;Document;Client;Nature;Poche;Moyen;Encaissé (€);Total du document (€)");
  expect(text).not.toMatch(/\bCA\b/);
  expect(sumEncaisse(text)).toBe(chiffresCanoniques(comptaPeriodKey({ periode: "mois", ref: MONTH_REF })).encaisse);
  // Le fichier se recoupe avec l'écran : sa somme est le chiffre affiché.
  expect(await money(page, '[data-figure="encaisse"]')).toBe(shown(sumEncaisse(text)));

  // Deux autres périodes, par la même route de lecture : la période de l'écran voyage en `du`/`au`.
  for (const periode of ["semaine", "jour"] as const) {
    const screen = { periode, ref: MONTH_REF } as const;
    const response = await page.request.get(exportComptaUrl(exportRangeOf(screen)));
    expect(response.ok(), periode).toBe(true);
    expect(response.headers()["content-type"]).toContain("text/csv");
    expect(sumEncaisse(await response.text()), periode).toBe(chiffresCanoniques(comptaPeriodKey(screen)).encaisse);
  }
});

test("Journal : avec 45 mouvements dans le mois, le « Net du mois » affiché est la somme SQL des 45", async ({ page }) => {
  const month = JOURNAL_MONTH.key();
  const sql = await withE2eDb(async (db) => {
    const [row] = await db.$queryRawUnsafe<{ n: number; net: string }[]>(
      `SELECT count(*)::int AS n, COALESCE(SUM(amount), 0)::numeric(12,2)::text AS net FROM "CashMovement"
       WHERE "occurredAt" >= nurea_period_start('month', ($1 || '-01')::date::timestamptz)
         AND "occurredAt" <  nurea_period_end('month', ($1 || '-01')::date::timestamptz)`,
      month,
    );
    return row as { n: number; net: string };
  });
  expect(sql.n).toBe(45);

  await openShell(page, routes.journal({ mois: month }));
  await expect(page.locator("[data-journal]")).toBeVisible();
  expect(await money(page, "[data-net-du-mois]")).toBe(formatEur(eurFromWire(sql.net as never), { signed: true }));
  expect(await page.locator("[data-journal-entry]").count()).toBe(45);
});

test("Archiver une poche à solde non nul : entrée désactivée avec « Solde non nul : transfère d'abord xx € »", async ({ page }) => {
  const balance = await withE2eDb(async (db) => {
    const [row] = await db.$queryRawUnsafe<{ balance: string }[]>(
      `SELECT (p."openingBalance" + COALESCE(SUM(m.amount), 0))::numeric(12,2)::text AS balance
       FROM "Pocket" p LEFT JOIN "CashMovement" m ON m."pocketId" = p.id WHERE p.id = $1 GROUP BY p.id`,
      BANK,
    );
    return (row as { balance: string }).balance;
  });
  expect(parseEurInput(balance)).not.toBeNull();
  await openShell(page, routes.compta({ vue: "tresorerie" }));
  const pocket = page.getByRole("button", { name: "Poche Banque", exact: true });
  await waitForHydration(pocket);
  await pocket.tap();
  const sheet = page.locator('[data-vaul-drawer][data-state="open"]').last();
  await expect(sheet.locator("[data-archive-pocket]")).toBeDisabled();
  await expect(sheet.locator("[data-archive-reason]")).toHaveText(`Solde non nul : transfère d'abord ${euros(balance)}`);
});

test("ancien lien de ticket : /admin/compta?sale=… ouvre la Compta nue", async ({ page }) => {
  await page.goto(`${routes.compta()}?sale=${COMPTA_DOCS.sale}`);
  // `?sale=` n'est pas repris (06 §1.6) : la page redirige vers l'adresse nue.
  await expect(page).toHaveURL(new RegExp(`${routes.compta()}$`));
  await waitForHydration(page.locator("[data-tabbar] a").first());
  await expect(page.getByRole("heading", { level: 1, name: "Compta" })).toBeVisible();
});

/** Σ de la colonne « Encaissé (€) » (avant-dernière), virgule décimale : la somme du fichier. */
function sumEncaisse(text: string): MoneyString {
  const lines = text.replace(/^﻿/, "").split("\r\n").filter((line) => line !== "");
  const amounts = lines.slice(1).map((line) => {
    // Le champ « Client » peut porter des guillemets et un « ; » : on lit les colonnes depuis la fin.
    const fields = line.split(";");
    const raw = fields[fields.length - 2] ?? "0";
    return parseEurInput(raw.replace(",", "."), { signed: true }) ?? eur.zero;
  });
  return toWire(eur.sum(amounts));
}

async function readDownload(download: import("@playwright/test").Download): Promise<string> {
  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks).toString("utf8");
}
