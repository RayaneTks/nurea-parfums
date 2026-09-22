/**
 * 3h — Stock (docs/refonte/03-MODELE-DONNEES.md §7.7) : `stock > 0` conservé ; `stock ≤ 0` → NULL
 * (« non suivi »), listé au rapport.
 *
 * L'ancienne colonne est `NOT NULL DEFAULT 0` et l'expand ne la rend pas nullable : la reprise lève donc
 * `NOT NULL` elle-même, dans sa transaction (le contract le fait aussi, sans effet s'il est déjà levé).
 * La conversion doit précéder le contract, dont `VALIDATE CONSTRAINT perfume_stock_ck` laisserait sinon
 * la contrainte `NOT VALID` à cause des stocks négatifs. La vitrine ne lit jamais `stock` (03 §6.1).
 */
import { lignes } from "../lib/base";
import { inscrireCorrespondances, type Contexte } from "./contexte";

export async function etape3hStock(ctx: Contexte): Promise<void> {
  const concernes = await lignes<{ parfum: number; nom: string; marque: string | null; stock: number }>(
    ctx.tx,
    `SELECT p.id AS parfum, p.name AS nom, b.name AS marque, p.stock
     FROM "Perfume" p LEFT JOIN "Brand" b ON b.id = p."brandId"
     WHERE p.stock <= 0 ORDER BY p.id`,
  );
  await ctx.tx.$executeRawUnsafe(`ALTER TABLE "Perfume" ALTER COLUMN "stock" DROP NOT NULL`);
  const n = await ctx.tx.$executeRawUnsafe(`UPDATE "Perfume" SET stock = NULL WHERE stock <= 0`);
  if (n !== concernes.length) throw new Error(`3h : ${n} stocks passés à NULL pour ${concernes.length} attendus.`);
  ctx.r4.stocksPassesANull.push(...concernes);
  await inscrireCorrespondances(
    ctx.tx,
    concernes.map((p) => ({
      oldTable: "Perfume",
      oldId: String(p.parfum),
      newTable: "Perfume",
      newId: String(p.parfum),
      note: `stock ${p.stock} → NULL (non suivi)`,
    })),
  );
}
