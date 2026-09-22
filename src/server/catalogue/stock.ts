import "server-only";
import { DomainError } from "@/domain/errors";
import { applyDeliveredDelta, insufficientStock } from "@/domain/stock";
import type { Tx } from "@/server/db/transaction";

/**
 * Les SEULES écritures de `Perfume.stock` (03 §4.7, 04 §11, test `table-ownership`).
 *
 * - `applyDeliveredDeltas` : le stock suivi bouge du delta des quantités livrées, décidé par le writer
 *   `documents` (T1, T2, T3, T4, T4b, T5, T6).
 * - `setStock` : le réglage absolu du gérant (`setPerfumeStockAction`, J11).
 *
 * Toute écriture passe par Prisma : l'unité de travail inscrit `Perfume`, et `defineAction` en déduit
 * les tags du catalogue et `revalidateAdminCatalogue()` (contrat vitrine, 04 §10.2, §12). Le stock se lit
 * et s'écrit sous verrou `FOR UPDATE` de la ligne `Perfume` (rang 4, le dernier de l'ordre canonique :
 * le reprendre ici est toujours permis et sans effet s'il est déjà détenu) — jamais « lire puis réécrire »
 * hors verrou.
 */

/** Unités qui sortent (> 0) ou reviennent (< 0) pour un parfum. */
export type DeliveredDelta = { perfumeId: number; delta: number };

type StockUpdate = { perfumeId: number; stock: number; next: number };

type StockPlan = { reserves: string[]; updates: StockUpdate[] };

/** Agrège par parfum ; une ligne dont le parfum change apporte −livré sur l'ancien et +livré sur le nouveau. */
function aggregate(deltas: readonly DeliveredDelta[]): Map<number, number> {
  const byPerfume = new Map<number, number>();
  for (const { perfumeId, delta } of deltas) {
    if (!Number.isSafeInteger(delta)) throw new RangeError(`applyDeliveredDeltas : delta entier attendu, reçu ${delta}`);
    byPerfume.set(perfumeId, (byPerfume.get(perfumeId) ?? 0) + delta);
  }
  for (const [perfumeId, delta] of byPerfume) if (delta === 0) byPerfume.delete(perfumeId);
  return byPerfume;
}

async function plan(tx: Tx, deltas: readonly DeliveredDelta[]): Promise<StockPlan> {
  const byPerfume = aggregate(deltas);
  if (byPerfume.size === 0) return { reserves: [], updates: [] };
  const { perfumes } = await tx.lock({ perfumes: [...byPerfume.keys()] });
  // Non suivi (NULL) : aucune écriture automatique. Parfum disparu : sa ligne a perdu le lien.
  const tracked = perfumes.filter((p): p is { id: number; stock: number } => p.stock !== null);
  const needNames = tracked.some((p) => p.stock - (byPerfume.get(p.id) ?? 0) < 0);
  const names = needNames
    ? new Map(
        (await tx.db.perfume.findMany({ where: { id: { in: tracked.map((p) => p.id) } }, select: { id: true, name: true } })).map(
          (p) => [p.id, p.name],
        ),
      )
    : new Map<number, string>();

  const reserves: string[] = [];
  const updates: StockUpdate[] = [];
  for (const perfume of tracked) {
    const effect = applyDeliveredDelta({
      stock: perfume.stock,
      deliveredDelta: byPerfume.get(perfume.id) ?? 0,
      perfumeName: names.get(perfume.id) ?? "ce parfum",
    });
    if (effect.reserve) reserves.push(effect.reserve);
    if (effect.next !== null && effect.next !== perfume.stock) {
      updates.push({ perfumeId: perfume.id, stock: perfume.stock, next: effect.next });
    }
  }
  return { reserves, updates };
}

/**
 * Réserves de stock qu'un delta porterait, sans rien écrire. Un geste de statut les joint à celles de
 * la transition pour un seul dialogue (`assertTransition(…, { extraReserves })`, 04 §11).
 */
export async function stockReserves(tx: Tx, deltas: readonly DeliveredDelta[]): Promise<string[]> {
  return (await plan(tx, deltas)).reserves;
}

/**
 * Applique les deltas de quantités livrées. Si un stock suivi passerait sous zéro et que la réserve
 * n'est pas confirmée : `NeedsConfirmation` « Stock insuffisant », rien d'écrit ; confirmée, la fiche
 * est bornée à 0 (CHECK `perfume_stock_ck`).
 */
export async function applyDeliveredDeltas(
  tx: Tx,
  deltas: readonly DeliveredDelta[],
  options: { confirm: boolean },
): Promise<void> {
  const { reserves, updates } = await plan(tx, deltas);
  if (reserves.length > 0 && !options.confirm) throw insufficientStock(reserves);
  for (const { perfumeId, next } of updates) {
    await tx.db.perfume.update({ where: { id: perfumeId }, data: { stock: next }, select: { id: true } });
  }
}

export const STOCK_VALUE_MESSAGE = "Indique un stock de 0 ou plus, ou « Non suivi ».";

/** Réglage absolu du stock (geste dédié, 06 S20) ; `null` = non suivi. */
export async function setStock(tx: Tx, perfumeId: number, value: number | null): Promise<{ id: number; stock: number | null }> {
  if (value !== null && (!Number.isSafeInteger(value) || value < 0)) {
    throw new DomainError("VALIDATION", STOCK_VALUE_MESSAGE, "stock");
  }
  const { perfumes } = await tx.lock({ perfumes: [perfumeId] });
  const current = perfumes[0];
  if (!current) {
    throw new DomainError("NOT_FOUND", "Ce parfum n'existe plus. Il a peut-être été supprimé depuis un autre écran.");
  }
  if (current.stock !== value) {
    await tx.db.perfume.update({ where: { id: perfumeId }, data: { stock: value }, select: { id: true } });
  }
  return { id: perfumeId, stock: value };
}
