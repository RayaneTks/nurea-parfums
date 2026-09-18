import "server-only";
import { Prisma } from "@prisma/client";
import { parsePeriod, type Period, type PeriodKey } from "@/contracts/chiffres";
import { exportFileName, type ExportRange } from "@/contracts/compta";
import { eurFromDb, toWire } from "@/domain/money";
import { parisDayKey } from "@/domain/periods";
import { encaisseRowsSql } from "@/server/chiffres/sql";
import { defineQuery } from "@/server/core/define-query";
import { db } from "@/server/db/client";

/**
 * Export CSV de la Compta pour le comptable (06 E03 « Exporter », 04 §3.5, 07 J12). Colonnes fixées par 07 J12 :
 * UNE LIGNE PAR PAIEMENT de la période — exactement les lignes de l'Encaissé (`encaisseRowsSql`, 03 §5.2) : la
 * somme de la colonne « Encaissé (€) » EST l'Encaissé de la période affiché à l'écran, fichier et écran se
 * recoupent (défaut de l'existant, 01 §4.3). Vocabulaire canonique (02 §6) : jamais « CA ».
 *
 * Format Excel français : BOM UTF-8 (accents), séparateur `;`, virgule décimale, fins de ligne CRLF.
 */

export const CSV_HEADERS = [
  "Date",
  "Document",
  "Client",
  "Nature",
  "Poche",
  "Moyen",
  "Encaissé (€)",
  "Total du document (€)",
] as const;

const BOM = "﻿";
const SEPARATOR = ";";
const PASSING_CUSTOMER = "Client de passage";

const MONTHS_SHORT = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."] as const;

export type ComptaCsvRow = {
  occurredAt: Date;
  origin: "ORDER" | "DIRECT_SALE";
  orderedAt: Date;
  customerName: string | null;
  paymentKind: "DEPOSIT" | "BALANCE" | "REFUND";
  /** Le mouvement contre-passe un paiement antérieur (annulation, 03 §4.4). */
  isReversal: boolean;
  pocketName: string;
  method: string | null;
  amount: string;
  total: string;
};

/**
 * Les paiements de la période, dans l'ordre des dates de valeur : les lignes de l'Encaissé, avec leur pièce, leur
 * document (total lu dans `DocumentBalance`), leur client et leur poche. Jamais de somme ici.
 */
export function comptaCsvSql(period: Period, now: Date): Prisma.Sql {
  return Prisma.sql`
    SELECT e."occurredAt", d.origin::text AS origin, d."orderedAt",
           COALESCE(c."fullName", d."customerName") AS "customerName",
           pay.kind::text AS "paymentKind", (m."reversesId" IS NOT NULL) AS "isReversal",
           po.name AS "pocketName", pay.method,
           e.amount::numeric(12,2)::text AS amount, b.total::text AS total
    FROM (${encaisseRowsSql({ period, now })}) e
    JOIN "CashMovement" m ON m.id = e."movementId"
    JOIN "Payment" pay ON pay."movementId" = e."movementId"
    JOIN "SaleDocument" d ON d.id = e."documentId"
    JOIN "DocumentBalance" b ON b."documentId" = d.id
    JOIN "Pocket" po ON po.id = e."pocketId"
    LEFT JOIN "Customer" c ON c.id = d."customerId"
    ORDER BY e."occurredAt", m."createdAt", e."movementId"`;
}

/** « 17/09/2026 » : le jour de Paris, lu par un tableur français. */
function csvDate(instant: Date): string {
  const [year, month, day] = parisDayKey(instant).split("-");
  return `${day}/${month}/${year}`;
}

/** « Commande du 12 sept. », « Vente du 3 août 2025 » (06 §1.7 ; l'année seulement hors de l'année en cours). */
export function documentLabel(origin: ComptaCsvRow["origin"], orderedAt: Date, now: Date = new Date()): string {
  const [year, month, day] = parisDayKey(orderedAt).split("-");
  const sameYear = year === parisDayKey(now).slice(0, 4);
  const noun = origin === "ORDER" ? "Commande" : "Vente";
  return `${noun} du ${Number(day)} ${MONTHS_SHORT[Number(month) - 1]}${sameYear ? "" : ` ${year}`}`;
}

/** Nature d'un paiement, lexique de 06 §1.7 (une annulation se nomme par ce qu'elle annule). */
export function paymentNature(row: Pick<ComptaCsvRow, "origin" | "paymentKind" | "isReversal">): string {
  if (row.isReversal) return row.paymentKind === "REFUND" ? "Paiement annulé" : "Remboursement annulé";
  switch (row.paymentKind) {
    case "DEPOSIT":
      return "Acompte";
    case "BALANCE":
      return row.origin === "ORDER" ? "Solde" : "Paiement";
    case "REFUND":
      return "Remboursement";
    default: {
      const exhaustive: never = row.paymentKind;
      throw new Error(`Nature de paiement inconnue : ${exhaustive as string}`);
    }
  }
}

/** « 1234,50 », « -40,00 » : montant exact, virgule décimale, sans séparateur de milliers. */
export function csvAmount(text: string): string {
  return toWire(eurFromDb(text)).replace(".", ",");
}

/** Un champ : entre guillemets s'il contient le séparateur, un guillemet ou un saut de ligne. */
export function csvField(value: string | null): string {
  const text = value ?? "";
  return /[";\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** Le fichier : BOM, en-têtes, une ligne par paiement. */
export function comptaCsvText(rows: readonly ComptaCsvRow[], now: Date = new Date()): string {
  const lines = rows.map((row) =>
    [
      csvDate(row.occurredAt),
      documentLabel(row.origin, row.orderedAt, now),
      row.customerName?.trim() ? row.customerName : PASSING_CUSTOMER,
      paymentNature(row),
      row.pocketName,
      row.method,
      csvAmount(row.amount),
      csvAmount(row.total),
    ]
      .map(csvField)
      .join(SEPARATOR),
  );
  return `${BOM}${[CSV_HEADERS.map(csvField).join(SEPARATOR), ...lines].join("\r\n")}\r\n`;
}

/**
 * Le fichier CSV d'une période (clé de `src/contracts/chiffres.ts`) : nom et contenu. Session exigée
 * (`defineQuery`), appelée par la route `GET /api/admin/export/compta`.
 */
export const comptaCsv = defineQuery(async (periode: PeriodKey, range: ExportRange): Promise<{ fileName: string; text: string }> => {
  const period = parsePeriod(periode);
  if (!period) throw new TypeError(`Export : période illisible « ${periode} ».`);
  const now = new Date();
  const rows = await db.$queryRaw<ComptaCsvRow[]>(comptaCsvSql(period, now));
  return { fileName: exportFileName(range), text: comptaCsvText(rows, now) };
});
