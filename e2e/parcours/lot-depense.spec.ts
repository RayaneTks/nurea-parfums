import { expect, test, type Page } from "@playwright/test";
import { routes } from "../../src/app-shell/routes";
import { formatEur, parseEurInput } from "../../src/domain/money";
import {
  A_RATTACHER_CUSTOMER,
  BATCHES,
  BATCH_DOCS,
  KNOWN_EXPENSE_LABEL,
} from "../fixtures/batches";
import { SEED } from "../fixtures/seed";
import { withE2eDb } from "../helpers/db";
import { waitForHydration } from "../helpers/hydration";
import { countTaps } from "../helpers/tap";
import { actionSheet, euros, expectToast, openShell } from "./support-j8";

/**
 * PC-08 — Suivre un lot : dépense et marge (06 §2 ; 02 §2 tâche n°8 : dépense ≤ 5 taps, marge d'un lot
 * visible en 2 taps ; 07 J13), et sa variante, l'écart du 17/09/2026 : ranger un document sans lot
 * depuis « À rattacher » en 3 taps, sans ouvrir une seule fiche.
 *
 * Ce que ces parcours protègent, ce sont les bugs de 01 §4.4 : la Marge nette du lot qui ne suivait pas
 * la dépense, une dépense impossible à dater, une suppression qui ne rendait pas l'argent, et un
 * document annulé rattaché mais invisible.
 */

const MARS = SEED.batch.id;

/** Montant tel que la tuile l'écrit : sans centimes (05 §2.2, `Money compact`). */
function eurosCompact(amount: string): string {
  const parsed = parseEurInput(amount);
  if (!parsed) throw new Error(`montant illisible « ${amount} »`);
  return formatEur(parsed, { compact: true });
}

/**
 * La Marge nette d'un lot, lue EN BASE par la définition de 03 §5.4 — jamais recalculée par le test :
 * « le chiffre affiché est confronté à la requête de 03 §5 exécutée sur la base de test » (04 §16.4).
 */
function margeNetteOf(batchId: string): Promise<string> {
  return withE2eDb(async (db) => {
    const [row] = await db.$queryRawUnsafe<{ marge: string }[]>(
      `WITH encaisse AS (
         SELECT COALESCE(SUM(m.amount), 0) AS v
         FROM "Payment" p
         JOIN "CashMovement" m ON m.id = p."movementId"
         JOIN "SaleDocument" d ON d.id = p."documentId"
         WHERE d."batchId" = $1
       ), couts AS (
         SELECT COALESCE(SUM(b.cost), 0) AS v
         FROM "DocumentBalance" b
         JOIN "SaleDocument" d ON d.id = b."documentId"
         WHERE d."batchId" = $1 AND d.status IN ('CONFIRMED', 'DELIVERED')
       ), depenses AS (
         SELECT COALESCE(SUM(-m.amount), 0) AS v
         FROM "CashMovement" m
         JOIN "BatchExpense" e ON e."movementId" = COALESCE(m."reversesId", m.id)
         WHERE m.kind = 'EXPENSE' AND e."batchId" = $1
       )
       SELECT (encaisse.v - couts.v - depenses.v)::numeric(12,2)::text AS marge
       FROM encaisse, couts, depenses`,
      batchId,
    );
    return row?.marge ?? "absente";
  });
}

/**
 * « Coûts d'achat » d'un lot : mêmes lignes que `coutsRowsSql` (03 §5.4) — documents ENGAGÉS,
 * coût inconnu compté 0. Dérivé de la base, jamais recopié de l'écran : d'autres jalons rattachent
 * des documents à ce même lot, et une valeur figée ici deviendrait fausse sans rien dire du sujet.
 */
function coutsOf(batchId: string, statuses = "('CONFIRMED','DELIVERED')"): Promise<string> {
  return withE2eDb(async (db) => {
    const [row] = await db.$queryRawUnsafe<{ couts: string }[]>(
      `SELECT COALESCE(SUM(b.cost), 0)::numeric(12,2)::text AS couts
       FROM "DocumentBalance" b
       WHERE b."batchId" = $1 AND b.status IN ${statuses}`,
      batchId,
    );
    return row?.couts ?? "0.00";
  });
}

/** « À encaisser » d'un lot : les documents ENGAGÉS seulement (03 §5.3). */
function aEncaisserOf(batchId: string): Promise<string> {
  return withE2eDb(async (db) => {
    const [row] = await db.$queryRawUnsafe<{ due: string }[]>(
      `SELECT COALESCE(SUM(b.due), 0)::numeric(12,2)::text AS due
       FROM "DocumentBalance" b JOIN "SaleDocument" d ON d.id = b."documentId"
       WHERE d."batchId" = $1 AND d.status IN ('CONFIRMED', 'DELIVERED')`,
      batchId,
    );
    return row?.due ?? "0.00";
  });
}

const expensesOf = (batchId: string) =>
  withE2eDb((db) =>
    db.batchExpense.findMany({
      where: { batchId },
      orderBy: [{ createdAt: "asc" }],
      select: {
        id: true,
        label: true,
        movement: { select: { amount: true, occurredAt: true, reversedBy: { select: { id: true } } } },
      },
    }),
  );

const batchOf = (documentId: string) =>
  withE2eDb(
    async (db) =>
      (await db.saleDocument.findUnique({ where: { id: documentId }, select: { batchId: true } }))?.batchId ?? null,
  );

/**
 * UNE tuile de chiffre, nommée. Une assertion portée sur la grille entière passerait sur n'importe
 * quelle tuile — et « Coûts d'achat » vaut parfois le même montant que « Marge nette ».
 */
const tile = (page: Page, label: string) => page.locator(`[data-kpi-tile="${label}"]`);

/** La rangée ENTIÈRE d'un lot sur E05 : la Marge nette y vit à droite, hors du lien (05 §3.1). */
const batchRow = (page: Page, batchId: string) => page.locator(`[data-batch-row="${batchId}"]`);

test("PC-08 : marge du lot visible en 2 taps, dépense ajoutée en 4 taps, tuiles à jour sans rechargement", async ({ page }) => {
  const lot = BATCHES.depense;
  const margeAvant = await margeNetteOf(lot.id);
  expect(margeAvant).toBe("150.00");

  // ── La marge du lot : 2 taps depuis l'Accueil (la tuile « Lots ouverts » de E01 arrive à J14).
  await openShell(page, routes.accueil());
  const lecture = countTaps(page);
  await lecture.tap(page.getByRole("button", { name: "Rechercher" }), "Rechercher");
  const palette = page.getByRole("dialog", { name: "Recherche" });
  await lecture.tap(palette.getByRole("button", { name: "Lots" }), "Aller à › Lots");
  await expect(page.getByRole("heading", { level: 1, name: "Lots" })).toBeVisible();

  // Elle se lit SUR LA LISTE, sans un tap de plus : c'est l'objectif « 0 tap » de 06 §2.
  const ligne = page.getByRole("link", { name: `${lot.name}, Marge nette du lot` });
  await waitForHydration(ligne);
  await expect(batchRow(page, lot.id)).toContainText(euros(margeAvant));
  lecture.expectAtMost(2);

  // ── La dépense : le lot, le CTA, le chip du libellé déjà saisi, le CTA de la sheet.
  const taps = countTaps(page);
  await taps.tap(ligne, lot.name);
  // Le nom du lot est le titre de l'écran ET son propre contrôle de renommage (E06 zone 1).
  await expect(page.getByRole("heading", { level: 1, name: new RegExp(lot.name) })).toBeVisible();
  await expect(tile(page, "Marge nette")).toContainText(eurosCompact(margeAvant));

  const ajouter = page.getByRole("button", { name: "Ajouter une dépense" });
  await waitForHydration(ajouter);
  await taps.tap(ajouter, "Ajouter une dépense");
  const sheet = actionSheet(page, "Ajouter une dépense");
  await expect(sheet).toBeVisible();

  // Le libellé déjà saisi ailleurs est proposé : on le touche, on ne le retape pas (A10).
  await taps.tap(sheet.getByRole("button", { name: KNOWN_EXPENSE_LABEL, exact: true }), "chip Transport");
  await expect(sheet.getByLabel("Libellé", { exact: true })).toHaveValue(KNOWN_EXPENSE_LABEL);

  // La date vaut « Aujourd'hui » et la poche est celle que l'app propose : rien à toucher (N2).
  await expect(sheet.getByRole("button", { name: "Aujourd'hui", exact: true })).toHaveAttribute("aria-pressed", "true");
  await sheet.getByLabel("Montant", { exact: true }).fill("60");

  await taps.tap(sheet.getByRole("button", { name: `Ajouter ${euros("60")} · Espèces` }), "CTA");
  taps.expectAtMost(4);
  await expectToast(page, "Dépense ajoutée");

  // ── Les tuiles suivent, sans rechargement : principe 6 de 02.
  const margeApres = await margeNetteOf(lot.id);
  expect(margeApres).toBe("90.00");
  await expect(tile(page, "Marge nette")).toContainText(eurosCompact(margeApres));
  await expect(tile(page, "Dépenses")).toContainText(eurosCompact("60"));
  await expect(page.locator("[data-batch-view]")).toContainText(KNOWN_EXPENSE_LABEL);

  const written = (await expensesOf(lot.id)).find((expense) => expense.label === KNOWN_EXPENSE_LABEL);
  expect(written?.movement.amount.toFixed(2)).toBe("-60.00");

  // ── La supprimer (confirmation qui dit où l'argent revient) rétablit la Marge nette.
  const suppression = countTaps(page);
  await suppression.tap(page.getByRole("button", { name: /^Actions : Transport du / }), "menu de la dépense");
  const menu = actionSheet(page, KNOWN_EXPENSE_LABEL);
  await suppression.tap(menu.getByRole("button", { name: "Supprimer", exact: true }), "Supprimer");
  const dialog = page.getByRole("dialog", { name: `Supprimer « ${KNOWN_EXPENSE_LABEL} » ?` });
  await expect(dialog).toContainText("reviennent dans Espèces");
  await suppression.tap(dialog.getByRole("button", { name: "Supprimer", exact: true }), "confirmer");
  suppression.expectAtMost(3);

  await expect(tile(page, "Marge nette")).toContainText(eurosCompact(margeAvant));
  await expect(tile(page, "Dépenses")).toContainText(eurosCompact("0"));
  expect(await margeNetteOf(lot.id)).toBe(margeAvant);
  // La pièce reste, contre-passée : c'est ce qui garde le lot insupprimable (02 §4.4, 03 §4.4).
  expect((await expensesOf(lot.id)).some((expense) => expense.movement.reversedBy !== null)).toBe(true);
});

test("PC-08 variante : un document sans lot se range en 3 taps depuis « À rattacher », sans ouvrir de fiche", async ({ page }) => {
  expect(await batchOf(BATCH_DOCS.aRattacher)).toBeNull();

  await openShell(page, routes.lots());
  const zone = page.locator("[data-unbatched]");
  await expect(zone).toBeVisible();

  // Une commande LIVRÉE sans lot y figure, en tête : c'est l'envoi terminé qu'on veut rattacher pour
  // lui imputer transport et douane (06 E05 zone 0). Elle est visible sans rien déplier.
  const cible = page.getByRole("button", { name: new RegExp(`^Choisir le lot de ${A_RATTACHER_CUSTOMER}`) });
  await waitForHydration(cible);
  await expect(zone).toContainText("Livrée");

  // 1 tap pour arriver sur E05 (« Tous les lots » de E01 à J14), puis 2 ici : 3 au total (06 §2).
  const taps = countTaps(page);
  await taps.tap(cible, "rangée Lot");
  const picker = actionSheet(page, "Lot");
  await expect(picker).toBeVisible();
  // Un lot CLOS ne s'y propose pas : le serveur y refuserait le rattachement (03 T13).
  await expect(picker.getByRole("button", { name: new RegExp(BATCHES.closed.name) })).toHaveCount(0);
  // « Sans lot » non plus : le document n'en a pas, l'option ne discriminerait rien (05 §5.3).
  await expect(picker.getByRole("button", { name: "Sans lot", exact: true })).toHaveCount(0);

  await taps.tap(picker.getByRole("button", { name: new RegExp(BATCHES.rangement.name) }).first(), BATCHES.rangement.name);
  taps.expectAtMost(2);

  await expectToast(page, `Rattaché à ${BATCHES.rangement.name}`);
  // La ligne quitte la section sans attendre le rafraîchissement (05 §5.2).
  await expect(page.getByRole("button", { name: new RegExp(`^Choisir le lot de ${A_RATTACHER_CUSTOMER}`) })).toHaveCount(0);
  expect(await batchOf(BATCH_DOCS.aRattacher)).toBe(BATCHES.rangement.id);

  // Et il apparaît sur la fiche du lot.
  await page.goto(routes.lot(BATCHES.rangement.id));
  await expect(page.locator("[data-batch-view]")).toContainText(A_RATTACHER_CUSTOMER);
});

test("« À rattacher » ne cache jamais son compte : la liste est bornée, le reste est nommé et se déplie", async ({ page }) => {
  await openShell(page, routes.lots());
  const zone = page.locator("[data-unbatched]");
  await expect(zone).toBeVisible();

  // Le jeu de test porte beaucoup de documents sans lot : la zone est bornée pour laisser voir les LOTS.
  const total = await withE2eDb((db) => db.saleDocument.count({ where: { batchId: null, status: { not: "CANCELLED" } } }));
  expect(total).toBeGreaterThan(4);

  // L'en-tête dit le compte RÉEL, et la légende dit ce qui n'est pas montré.
  await expect(zone.getByRole("heading", { name: new RegExp(`À rattacher.*${total}`) })).toBeVisible();
  const deplier = page.getByRole("button", { name: `Afficher les ${total - 4} autres` });
  await expect(deplier).toBeVisible();
  await expect(zone.getByRole("button", { name: /^Choisir le lot de / })).toHaveCount(4);

  // Les lots restent atteignables sans déplier : c'est le sujet de l'écran.
  await expect(page.getByRole("heading", { name: /^Ouverts/ })).toBeVisible();

  await deplier.click();
  await expect(zone.getByRole("button", { name: /^Choisir le lot de / })).toHaveCount(total);
  await expect(page.getByRole("button", { name: /^Afficher les / })).toHaveCount(0);
});

test("E06 : une commande en attente est listée hors des chiffres, une annulée est repliée, la suppression refusée dit pourquoi", async ({ page }) => {
  await openShell(page, routes.lot(MARS));
  const fiche = page.locator("[data-batch-view]");
  await expect(fiche).toBeVisible();

  // La commande en attente est là, annoncée comme telle : rattachée dès sa création (écart du 17/09/2026).
  await expect(fiche).toContainText("Amine Ould");
  await expect(fiche).toContainText("En attente");

  // Son total (110 €) n'entre ni dans « À encaisser » ni dans « Coûts d'achat » : elle n'est pas engagée.
  expect(await aEncaisserOf(MARS)).toBe("0.00");
  await expect(tile(page, "À encaisser")).toContainText(eurosCompact("0"));
  // Le chiffre affiché est celui de la requête canonique…
  const coutsEngages = await coutsOf(MARS);
  await expect(tile(page, "Coûts d'achat")).toContainText(eurosCompact(coutsEngages));
  // …et la commande en attente en est bien exclue : l'inclure changerait le total.
  const coutsAvecEnAttente = await coutsOf(MARS, "('PENDING','CONFIRMED','DELIVERED')");
  expect(Number(coutsAvecEnAttente)).toBeGreaterThan(Number(coutsEngages));
  await expect(tile(page, "Coûts d'achat")).not.toContainText("110");

  // L'annulée vit dans une sous-section repliée : sans elle, elle resterait rattachée et invisible.
  const annules = page.getByRole("button", { name: /^Annulés/ });
  await waitForHydration(annules);
  await annules.click();
  await expect(fiche).toContainText("Samir Touati");

  // Le lot porte des documents ET une dépense : la suppression est refusée, avec son décompte.
  await page.getByRole("button", { name: "Plus d'actions" }).click();
  const actions = actionSheet(page, "Actions");
  await expect(actions.getByRole("button", { name: /^Supprimer le lot/ })).toHaveCount(0);
  await expect(actions).toContainText("Impossible :");
  await expect(actions).toContainText("Clôture-le plutôt.");
  expect(await batchOf(BATCH_DOCS.cancelled)).toBe(MARS);
});
