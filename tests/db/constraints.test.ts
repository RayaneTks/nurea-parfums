/**
 * Contraintes SQL de docs/refonte/03-MODELE-DONNEES.md §4.9 : chaque CHECK refuse une insertion
 * qui le viole, et l'erreur cite son NOM ; l'index unique partiel refuse une seconde poche système.
 *
 * Chaque cas viole UNE seule règle (sinon PostgreSQL pourrait citer une autre contrainte) ; la ligne
 * valide de chaque table est d'abord acceptée, preuve que le refus vient bien de la valeur fautive.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  NOW,
  connectTestDatabase,
  insert,
  insertSql,
  resetDatabase,
  type Row,
  type TestDatabase,
} from "./support/database";

let db: TestDatabase;

const BRAND_ID = "brand-fixture";
/** Hors de la plage de la séquence : les parfums valides des cas prennent 1, 2… sans collision. */
const PERFUME_ID = 1000;
const DOCUMENT_ID = "doc-fixture";
const POCKET_ID = "pocket-fixture";

beforeAll(async () => {
  db = await connectTestDatabase();
  await resetDatabase(db);
  await insert(db, "Brand", { id: BRAND_ID, name: "Dior", slug: "dior", image: "dior.webp", updatedAt: NOW });
  await insert(db, "Perfume", { id: PERFUME_ID, brandId: BRAND_ID, name: "Sauvage", image: "sauvage.webp", updatedAt: NOW });
  await insert(db, "SaleDocument", { id: DOCUMENT_ID, origin: "ORDER", status: "PENDING", updatedAt: NOW });
  await insert(db, "Pocket", { id: POCKET_ID, name: "Espèces", kind: "CASH", updatedAt: NOW });
});

afterAll(async () => {
  await resetDatabase(db);
  await db.$disconnect();
});

interface Violation {
  readonly constraint: string;
  readonly why: string;
  readonly row: Row;
}

interface TableCase {
  readonly table: string;
  /** Ligne valide ; chaque violation la surcharge. Une fonction rend des identifiants uniques. */
  readonly valid: (id: string) => Row;
  readonly violations: readonly Violation[];
}

let counter = 0;
const nextId = (prefix: string) => `${prefix}-${++counter}`;

const cases: readonly TableCase[] = [
  {
    table: "Brand",
    valid: (id) => ({ id, name: id, slug: id, catalogMode: "COMPLETE", status: "PUBLISHED", image: "logo.webp", updatedAt: NOW }),
    violations: [
      { constraint: "brand_complete_logo_ck", why: "gamme complète publiée sans logo", row: { image: null } },
      { constraint: "brand_complete_logo_ck", why: "gamme complète publiée au logo blanc", row: { image: "   " } },
    ],
  },
  {
    table: "Perfume",
    valid: (id) => ({ brandId: BRAND_ID, name: id, image: "p.webp", status: "PUBLISHED", stock: 3, updatedAt: NOW }),
    violations: [
      { constraint: "perfume_publish_image_ck", why: "publié sans visuel", row: { image: "" } },
      { constraint: "perfume_stock_ck", why: "stock négatif", row: { stock: -1 } },
    ],
  },
  {
    table: "PerfumePricing",
    valid: () => ({
      perfumeId: PERFUME_ID,
      volumeMl: 100,
      defaultUnitPriceEur: "95.00",
      defaultUnitCostDzd: "20000.00",
      defaultExchangeRate: "277.0000",
      updatedAt: NOW,
    }),
    violations: [
      { constraint: "pricing_volume_ck", why: "volume hors 30/50/100", row: { volumeMl: 75 } },
      { constraint: "pricing_amounts_ck", why: "prix négatif", row: { volumeMl: 30, defaultUnitPriceEur: "-1.00" } },
      { constraint: "pricing_amounts_ck", why: "coût DZD négatif", row: { volumeMl: 30, defaultUnitCostDzd: "-1.00" } },
      { constraint: "pricing_amounts_ck", why: "taux nul", row: { volumeMl: 30, defaultExchangeRate: "0" } },
    ],
  },
  {
    table: "SaleDocument",
    valid: (id) => ({ id, origin: "ORDER", status: "PENDING", updatedAt: NOW }),
    violations: [
      { constraint: "doc_confirmed_at_ck", why: "confirmé sans confirmedAt", row: { status: "CONFIRMED" } },
      { constraint: "doc_confirmed_at_ck", why: "en attente avec confirmedAt", row: { confirmedAt: NOW } },
      {
        constraint: "doc_delivered_at_ck",
        why: "livré sans deliveredAt",
        row: { origin: "DIRECT_SALE", status: "DELIVERED", confirmedAt: NOW },
      },
      { constraint: "doc_delivered_at_ck", why: "en attente avec deliveredAt", row: { deliveredAt: NOW } },
      { constraint: "doc_cancelled_at_ck", why: "annulé sans cancelledAt", row: { status: "CANCELLED" } },
      { constraint: "doc_cancelled_at_ck", why: "en attente avec cancelledAt", row: { cancelledAt: NOW } },
    ],
  },
  {
    table: "SaleLine",
    valid: (id) => ({
      id,
      documentId: DOCUMENT_ID,
      perfumeId: PERFUME_ID,
      perfumeName: "Sauvage",
      brandName: "Dior",
      volumeMl: 100,
      quantity: 2,
      deliveredQuantity: 1,
      unitPriceEur: "95.00",
      unitCostDzd: "20000.00",
      exchangeRate: "277.0000",
      unitCostEur: "72.20",
      updatedAt: NOW,
    }),
    violations: [
      { constraint: "line_quantity_ck", why: "quantité nulle", row: { quantity: 0, deliveredQuantity: 0 } },
      { constraint: "line_delivered_ck", why: "livré au-delà de la quantité", row: { deliveredQuantity: 3 } },
      { constraint: "line_delivered_ck", why: "livré négatif", row: { deliveredQuantity: -1 } },
      { constraint: "line_price_ck", why: "prix négatif", row: { unitPriceEur: "-1.00" } },
      { constraint: "line_gift_ck", why: "offert à prix non nul", row: { isGift: true, unitPriceEur: "10.00" } },
      { constraint: "line_volume_ck", why: "volume absent", row: { volumeMl: null } },
      { constraint: "line_volume_ck", why: "volume hors 30/50/100", row: { volumeMl: 75 } },
      { constraint: "line_cost_ck", why: "coût € négatif", row: { unitCostDzd: null, exchangeRate: null, unitCostEur: "-1.00" } },
      { constraint: "line_cost_ck", why: "coût DZD sans taux", row: { exchangeRate: null } },
      { constraint: "line_cost_ck", why: "coût DZD à taux nul", row: { exchangeRate: "0" } },
      { constraint: "line_cost_ck", why: "coût DZD sans coût €", row: { unitCostEur: null } },
      { constraint: "line_cost_ck", why: "coût DZD négatif", row: { unitCostDzd: "-1.00" } },
      { constraint: "line_name_ck", why: "nom blanc", row: { perfumeName: "  " } },
      { constraint: "line_off_catalog_ck", why: "hors catalogue lié à un parfum", row: { isOffCatalog: true } },
    ],
  },
  {
    table: "Pocket",
    valid: (id) => ({ id, name: id, kind: "BANK", updatedAt: NOW }),
    violations: [
      { constraint: "pocket_system_ck", why: "poche système d'une autre nature", row: { isSystem: true } },
      {
        constraint: "pocket_system_ck",
        why: "poche système archivée",
        row: { isSystem: true, kind: "UNASSIGNED", archived: true },
      },
    ],
  },
  {
    table: "CashMovement",
    valid: (id) => ({ id, pocketId: POCKET_ID, amount: "10.00", kind: "ADJUSTMENT" }),
    violations: [
      { constraint: "movement_nonzero_ck", why: "montant nul", row: { amount: "0" } },
      { constraint: "movement_transfer_ck", why: "transfert sans groupe", row: { kind: "TRANSFER" } },
      { constraint: "movement_transfer_ck", why: "groupe hors transfert", row: { transferGroupId: "groupe-1" } },
      { constraint: "movement_outflow_sign_ck", why: "paiement fournisseur entrant", row: { kind: "SUPPLIER" } },
      { constraint: "movement_outflow_sign_ck", why: "dépense entrante sans contre-passation", row: { kind: "EXPENSE" } },
    ],
  },
  {
    table: "Setting",
    valid: () => ({ id: 1, defaultExchangeRate: "277.0000", updatedAt: NOW }),
    violations: [
      { constraint: "setting_singleton_ck", why: "seconde ligne de réglages", row: { id: 2 } },
      { constraint: "setting_rate_ck", why: "taux nul", row: { id: 1, defaultExchangeRate: "0" } },
    ],
  },
];

describe("CHECK de 03 §4.9", () => {
  for (const { table, valid, violations } of cases) {
    describe(table, () => {
      it("accepte la ligne valide de référence", async () => {
        await expect(insert(db, table, valid(nextId(table)))).resolves.toBe(1);
      });

      for (const { constraint, why, row } of violations) {
        it(`${constraint} refuse : ${why}`, async () => {
          await expect(insert(db, table, { ...valid(nextId(table)), ...row })).rejects.toThrow(constraint);
        });
      }
    });
  }

  it("movement_outflow_sign_ck refuse une contre-passation sortante d'un paiement fournisseur", async () => {
    await insert(db, "CashMovement", { id: "supplier-out", pocketId: POCKET_ID, amount: "-40.00", kind: "SUPPLIER" });
    await expect(
      insert(db, "CashMovement", {
        id: "supplier-reversal",
        pocketId: POCKET_ID,
        amount: "-40.00",
        kind: "SUPPLIER",
        reversesId: "supplier-out",
      }),
    ).rejects.toThrow("movement_outflow_sign_ck");
  });

  it("movement_not_self_ck refuse un mouvement qui se contre-passe lui-même", async () => {
    await expect(
      insert(db, "CashMovement", { id: "self", pocketId: POCKET_ID, amount: "10.00", kind: "ADJUSTMENT", reversesId: "self" }),
    ).rejects.toThrow("movement_not_self_ck");
  });

  it("toutes les contraintes de 03 §4.9 existent et sont validées", async () => {
    const rows = await db.$queryRawUnsafe<{ conname: string; convalidated: boolean }[]>(
      `SELECT conname, convalidated FROM pg_constraint
       WHERE contype = 'c' AND connamespace = 'public'::regnamespace ORDER BY conname`,
    );
    const expected = [
      ...new Set([...cases.flatMap((c) => c.violations.map((v) => v.constraint)), "movement_not_self_ck"]),
    ].sort();
    expect(rows.map((r) => r.conname)).toEqual(expected);
    expect(rows.filter((r) => !r.convalidated)).toEqual([]);
  });
});

/**
 * Pour une violation d'unicité, Prisma ne relaie que le DETAIL (« Key (…) already exists »), sans le
 * nom de l'index : l'insertion est rejouée dans un bloc qui ré-émet l'erreur avec ce nom.
 */
function reportingUniqueIndexName(statement: string): string {
  return `DO $$
DECLARE violated text;
BEGIN
  ${statement};
EXCEPTION WHEN unique_violation THEN
  GET STACKED DIAGNOSTICS violated = CONSTRAINT_NAME;
  RAISE EXCEPTION 'unique_violation : %', violated;
END $$`;
}

describe("index unique partiel pocket_single_system_uq", () => {
  it("accepte une poche système, en refuse une seconde, et laisse libres les poches ordinaires", async () => {
    await insert(db, "Pocket", { id: "system-1", name: "Non attribué", kind: "UNASSIGNED", isSystem: true, updatedAt: NOW });
    const duplicate = insertSql("Pocket", {
      id: "system-2",
      name: "Non attribué (doublon)",
      kind: "UNASSIGNED",
      isSystem: true,
      updatedAt: NOW,
    });
    await expect(db.$executeRawUnsafe(reportingUniqueIndexName(duplicate))).rejects.toThrow(
      "unique_violation : pocket_single_system_uq",
    );
    expect(await db.$queryRawUnsafe(`SELECT id FROM "Pocket" WHERE "isSystem"`)).toEqual([{ id: "system-1" }]);
    await expect(insert(db, "Pocket", { id: "ordinary-2", name: "Banque", kind: "BANK", updatedAt: NOW })).resolves.toBe(1);
  });
});
