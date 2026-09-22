/**
 * Triggers de docs/refonte/03-MODELE-DONNEES.md §4.10 :
 * - écriture seule : DELETE et UPDATE (hors colonnes descriptives) refusés sur CashMovement,
 *   Payment et BatchExpense ;
 * - cohérence pièce ↔ mouvement, vérifiée au COMMIT : mouvement PAYMENT ou EXPENSE sans pièce,
 *   contre-passation incohérente, paiement de signe incohérent ;
 * - le geste « annuler un remboursement » (03 §4.4) : paiement d'entrée sur le mouvement positif
 *   qui contre-passe le REFUND, accepté.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  NOW,
  connectTestDatabase,
  insert,
  resetDatabase,
  type Row,
  type SqlRunner,
  type TestDatabase,
} from "./support/database";

let db: TestDatabase;

const POCKET = "pocket-cash";
const OTHER_POCKET = "pocket-bank";
const DOCUMENT = "doc-confirmed";
const BATCH = "batch-open";
const VALUE_DATE = "2026-09-01T10:00:00.000Z";

const APPEND_ONLY = "écriture seule";

beforeAll(async () => {
  db = await connectTestDatabase();
  await resetDatabase(db);
  await insert(db, "Pocket", { id: POCKET, name: "Espèces", kind: "CASH", updatedAt: NOW });
  await insert(db, "Pocket", { id: OTHER_POCKET, name: "Banque", kind: "BANK", updatedAt: NOW });
  await insert(db, "SaleDocument", {
    id: DOCUMENT,
    origin: "ORDER",
    status: "CONFIRMED",
    confirmedAt: NOW,
    updatedAt: NOW,
  });
  await insert(db, "Batch", { id: BATCH, name: "Lot de septembre", updatedAt: NOW });
});

afterAll(async () => {
  await resetDatabase(db);
  await db.$disconnect();
});

function movement(id: string, amount: string, kind: string, extra: Row = {}): Row {
  return { id, pocketId: POCKET, amount, kind, occurredAt: VALUE_DATE, ...extra };
}

/** Mouvement PAYMENT et sa pièce, comme le module encaissements les écrit (même transaction). */
async function writePayment(
  runner: SqlRunner,
  id: string,
  kind: "DEPOSIT" | "BALANCE" | "REFUND",
  amount: string,
  extra: Row = {},
): Promise<void> {
  await insert(runner, "CashMovement", movement(`mv-${id}`, amount, "PAYMENT", extra));
  await insert(runner, "Payment", { id, documentId: DOCUMENT, kind, movementId: `mv-${id}` });
}

async function exists(table: string, id: string): Promise<boolean> {
  const rows = await db.$queryRawUnsafe<{ n: number }[]>(`SELECT count(*)::int AS n FROM "${table}" WHERE id = '${id}'`);
  return rows[0]?.n === 1;
}

describe("écriture seule (nurea_append_only)", () => {
  beforeAll(async () => {
    await db.$transaction(async (tx) => {
      await writePayment(tx, "pay-append", "DEPOSIT", "50.00");
    });
    await db.$transaction(async (tx) => {
      await insert(tx, "CashMovement", movement("mv-exp-append", "-30.00", "EXPENSE"));
      await insert(tx, "BatchExpense", { id: "exp-append", batchId: BATCH, label: "Transport", movementId: "mv-exp-append" });
    });
  });

  describe("CashMovement", () => {
    it("refuse DELETE", async () => {
      await expect(db.$executeRawUnsafe(`DELETE FROM "CashMovement" WHERE id = 'mv-pay-append'`)).rejects.toThrow(APPEND_ONLY);
      expect(await exists("CashMovement", "mv-pay-append")).toBe(true);
    });

    it("refuse UPDATE du montant, de la date de valeur et de la poche", async () => {
      for (const set of [`amount = 60`, `"occurredAt" = now()`, `"pocketId" = '${OTHER_POCKET}'`]) {
        await expect(db.$executeRawUnsafe(`UPDATE "CashMovement" SET ${set} WHERE id = 'mv-pay-append'`)).rejects.toThrow(
          APPEND_ONLY,
        );
      }
    });

    it("accepte UPDATE du libellé", async () => {
      await expect(
        db.$executeRawUnsafe(`UPDATE "CashMovement" SET label = 'Acompte en espèces' WHERE id = 'mv-pay-append'`),
      ).resolves.toBe(1);
    });
  });

  describe("Payment", () => {
    it("refuse DELETE", async () => {
      await expect(db.$executeRawUnsafe(`DELETE FROM "Payment" WHERE id = 'pay-append'`)).rejects.toThrow(APPEND_ONLY);
      expect(await exists("Payment", "pay-append")).toBe(true);
    });

    it("refuse UPDATE de la nature", async () => {
      await expect(db.$executeRawUnsafe(`UPDATE "Payment" SET kind = 'BALANCE' WHERE id = 'pay-append'`)).rejects.toThrow(
        APPEND_ONLY,
      );
    });

    it("accepte UPDATE du moyen et de la note", async () => {
      await expect(
        db.$executeRawUnsafe(`UPDATE "Payment" SET method = 'espèces', note = 'Remis en main propre' WHERE id = 'pay-append'`),
      ).resolves.toBe(1);
    });
  });

  describe("BatchExpense", () => {
    it("refuse DELETE", async () => {
      await expect(db.$executeRawUnsafe(`DELETE FROM "BatchExpense" WHERE id = 'exp-append'`)).rejects.toThrow(APPEND_ONLY);
      expect(await exists("BatchExpense", "exp-append")).toBe(true);
    });

    it("refuse UPDATE du lot et de la date de création", async () => {
      await insert(db, "Batch", { id: "batch-other", name: "Lot d'octobre", updatedAt: NOW });
      for (const set of [`"batchId" = 'batch-other'`, `"createdAt" = now() - interval '1 day'`]) {
        await expect(db.$executeRawUnsafe(`UPDATE "BatchExpense" SET ${set} WHERE id = 'exp-append'`)).rejects.toThrow(
          APPEND_ONLY,
        );
      }
    });

    it("accepte UPDATE du libellé et des notes", async () => {
      await expect(
        db.$executeRawUnsafe(`UPDATE "BatchExpense" SET label = 'Transporteur', notes = 'DHL' WHERE id = 'exp-append'`),
      ).resolves.toBe(1);
    });
  });
});

describe("cohérence pièce ↔ mouvement, au COMMIT", () => {
  it("accepte un mouvement PAYMENT et son paiement écrits dans la même transaction", async () => {
    await expect(db.$transaction((tx) => writePayment(tx, "pay-ok", "BALANCE", "25.00"))).resolves.toBeUndefined();
    expect(await exists("Payment", "pay-ok")).toBe(true);
  });

  it("refuse au COMMIT un mouvement PAYMENT sans paiement, et n'écrit rien", async () => {
    let insertAccepted = false;
    await expect(
      db.$transaction(async (tx) => {
        await insert(tx, "CashMovement", movement("mv-orphan-payment", "40.00", "PAYMENT"));
        insertAccepted = true;
      }),
    ).rejects.toThrow("sans paiement");
    expect(insertAccepted).toBe(true);
    expect(await exists("CashMovement", "mv-orphan-payment")).toBe(false);
  });

  it("refuse au COMMIT un mouvement EXPENSE sans dépense, et n'écrit rien", async () => {
    await expect(
      db.$transaction((tx) => insert(tx, "CashMovement", movement("mv-orphan-expense", "-12.00", "EXPENSE"))),
    ).rejects.toThrow("sans dépense");
    expect(await exists("CashMovement", "mv-orphan-expense")).toBe(false);
  });

  it("refuse un paiement REFUND sur un mouvement positif", async () => {
    await expect(db.$transaction((tx) => writePayment(tx, "refund-positive", "REFUND", "15.00"))).rejects.toThrow(
      "signe cohérent",
    );
    expect(await exists("Payment", "refund-positive")).toBe(false);
  });

  it("refuse un paiement DEPOSIT sur un mouvement négatif", async () => {
    await expect(db.$transaction((tx) => writePayment(tx, "deposit-negative", "DEPOSIT", "-15.00"))).rejects.toThrow(
      "signe cohérent",
    );
  });

  it("refuse un paiement porté par un mouvement d'une autre nature", async () => {
    await expect(
      db.$transaction(async (tx) => {
        await insert(tx, "CashMovement", movement("mv-adjustment", "15.00", "ADJUSTMENT"));
        await insert(tx, "Payment", { id: "pay-on-adjustment", documentId: DOCUMENT, kind: "BALANCE", movementId: "mv-adjustment" });
      }),
    ).rejects.toThrow("signe cohérent");
  });

  it("refuse une dépense portée par un mouvement qui n'est pas une sortie EXPENSE", async () => {
    await expect(
      db.$transaction(async (tx) => {
        await insert(tx, "CashMovement", movement("mv-supplier", "-80.00", "SUPPLIER"));
        await insert(tx, "BatchExpense", { id: "exp-on-supplier", batchId: BATCH, label: "Douane", movementId: "mv-supplier" });
      }),
    ).rejects.toThrow("mouvement EXPENSE négatif");
  });
});

describe("contre-passation", () => {
  beforeAll(async () => {
    await insert(db, "CashMovement", movement("mv-original", "15.00", "ADJUSTMENT"));
  });

  const incoherent: readonly { why: string; row: Row }[] = [
    { why: "montant non opposé", row: movement("mv-rev-amount", "-10.00", "ADJUSTMENT", { reversesId: "mv-original" }) },
    {
      why: "autre date de valeur",
      row: movement("mv-rev-date", "-15.00", "ADJUSTMENT", { reversesId: "mv-original", occurredAt: "2026-09-02T10:00:00.000Z" }),
    },
    {
      why: "autre poche",
      row: movement("mv-rev-pocket", "-15.00", "ADJUSTMENT", { reversesId: "mv-original", pocketId: OTHER_POCKET }),
    },
    {
      why: "autre nature",
      row: movement("mv-rev-kind", "-15.00", "TRANSFER", { reversesId: "mv-original", transferGroupId: "groupe-rev" }),
    },
  ];

  for (const { why, row } of incoherent) {
    it(`refuse au COMMIT une contre-passation incohérente : ${why}`, async () => {
      await expect(db.$transaction((tx) => insert(tx, "CashMovement", row))).rejects.toThrow("doit reprendre nature, poche et date");
      expect(await exists("CashMovement", String(row.id))).toBe(false);
    });
  }

  it("accepte la contre-passation cohérente (même nature, poche et date, montant opposé)", async () => {
    await expect(
      db.$transaction((tx) => insert(tx, "CashMovement", movement("mv-rev-ok", "-15.00", "ADJUSTMENT", { reversesId: "mv-original" }))),
    ).resolves.toBe(1);
  });

  it("accepte l'annulation d'un remboursement : paiement d'entrée sur le mouvement positif qui contre-passe le REFUND", async () => {
    const document = "doc-refund-cancel";
    await insert(db, "SaleDocument", { id: document, origin: "ORDER", status: "CONFIRMED", confirmedAt: NOW, updatedAt: NOW });
    const pay = async (runner: SqlRunner, id: string, kind: string, amount: string, extra: Row = {}) => {
      await insert(runner, "CashMovement", movement(`mv-${id}`, amount, "PAYMENT", extra));
      await insert(runner, "Payment", { id, documentId: document, kind, movementId: `mv-${id}` });
    };

    await db.$transaction((tx) => pay(tx, "rc-deposit", "DEPOSIT", "50.00"));
    await db.$transaction((tx) => pay(tx, "rc-refund", "REFUND", "-20.00"));
    await expect(
      db.$transaction((tx) => pay(tx, "rc-refund-cancel", "BALANCE", "20.00", { reversesId: "mv-rc-refund" })),
    ).resolves.toBeUndefined();

    const [balance] = await db.$queryRawUnsafe<{ paid: string }[]>(
      `SELECT paid::text AS paid FROM "DocumentBalance" WHERE "documentId" = '${document}'`,
    );
    expect(balance?.paid).toBe("50.00");
  });

  it("refuse un paiement REFUND sur le mouvement positif qui contre-passe un remboursement", async () => {
    await expect(
      db.$transaction(async (tx) => {
        await insert(tx, "CashMovement", movement("mv-refund-2", "-5.00", "PAYMENT"));
        await insert(tx, "Payment", { id: "refund-2", documentId: DOCUMENT, kind: "REFUND", movementId: "mv-refund-2" });
      }),
    ).resolves.toBeUndefined();
    await expect(
      db.$transaction(async (tx) => {
        await insert(tx, "CashMovement", movement("mv-refund-2-cancel", "5.00", "PAYMENT", { reversesId: "mv-refund-2" }));
        await insert(tx, "Payment", {
          id: "refund-2-cancel",
          documentId: DOCUMENT,
          kind: "REFUND",
          movementId: "mv-refund-2-cancel",
        });
      }),
    ).rejects.toThrow("signe cohérent");
  });
});
