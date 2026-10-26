import "server-only";
import { DomainError } from "@/domain/errors";
import type { Tx } from "@/server/db/transaction";

/**
 * Seul fichier qui écrit `StockBottle` (docs/admin/desistements.md, test `table-ownership`).
 *
 * Un flacon en stock naît du désistement d'une commande confirmée, un par unité de chaque ligne non offerte.
 * Il est disponible tant qu'aucune ligne de vente ne le reprend (`soldLineId` NULL) : jamais un drapeau.
 * Il ne disparaît que par un geste : « Retirer du stock », ou la réactivation de sa commande d'origine.
 */

export const BOTTLE_NOT_FOUND = "Ce flacon n'est plus en stock. Recharge la liste pour la voir à jour.";
export const BOTTLE_SOLD = "Ce flacon a déjà été revendu : il ne peut plus être retiré du stock.";
export const BOTTLES_RESOLD =
  "Un flacon de cette commande a déjà été revendu : elle ne peut plus être réactivée. Crée plutôt une nouvelle commande.";

type DbDecimal = { toString(): string };

/** Ce qu'une ligne d'une commande désistée transmet à ses flacons. */
export type BottleSourceLine = {
  id: string;
  perfumeId: number | null;
  perfumeName: string;
  brandName: string | null;
  imageUrl: string | null;
  volumeMl: number | null;
  quantity: number;
  isGift: boolean;
  unitPriceEur: DbDecimal;
  unitCostDzd: DbDecimal | null;
  exchangeRate: DbDecimal | null;
  unitCostEur: DbDecimal | null;
};

/**
 * Passe en stock les flacons d'une commande désistée : un par unité de chaque ligne non offerte. Le prix
 * prévu est celui de la commande, le coût d'achat est copié tel quel. Rend le nombre de flacons créés.
 */
export async function stockWithdrawnLines(
  tx: Tx,
  input: { documentId: string; customer: string | null; lines: readonly BottleSourceLine[] },
): Promise<number> {
  const data = input.lines
    .filter((line) => !line.isGift)
    .flatMap((line) =>
      Array.from({ length: line.quantity }, () => ({
        perfumeId: line.perfumeId,
        perfumeName: line.perfumeName,
        brandName: line.brandName,
        imageUrl: line.imageUrl,
        volumeMl: line.volumeMl,
        unitCostDzd: line.unitCostDzd?.toString() ?? null,
        exchangeRate: line.exchangeRate?.toString() ?? null,
        unitCostEur: line.unitCostEur?.toString() ?? null,
        plannedPriceEur: line.unitPriceEur.toString(),
        sourceDocumentId: input.documentId,
        sourceLineId: line.id,
        sourceCustomer: input.customer,
        createdAt: tx.now,
      })),
    );
  if (data.length === 0) return 0;
  await tx.db.stockBottle.createMany({ data });
  return data.length;
}

export const BOTTLE_TAKEN =
  "Ce flacon vient d'être vendu ou retiré du stock : retire-le de la vente, puis choisis-en un autre dans « Déjà en stock ».";

/**
 * Une vente reprend des flacons en stock : chaque flacon est lié à sa ligne, en un ordre SQL conditionné à sa
 * disponibilité. Un flacon déjà repris (autre vente simultanée) ou retiré refuse toute la vente.
 */
export async function sellBottles(tx: Tx, sales: readonly { bottleId: string; lineId: string }[]): Promise<void> {
  for (const sale of sales) {
    const { count } = await tx.db.stockBottle.updateMany({
      where: { id: sale.bottleId, soldLineId: null },
      data: { soldLineId: sale.lineId },
    });
    if (count !== 1) throw new DomainError("CONFLICT", BOTTLE_TAKEN);
  }
}

/** Annuler une vente rend ses flacons au stock ; la réactiver ne les reprend pas (ils ont pu être revendus). */
export async function releaseSoldBottles(tx: Tx, lineIds: readonly string[]): Promise<void> {
  if (lineIds.length === 0) return;
  await tx.db.stockBottle.updateMany({ where: { soldLineId: { in: [...lineIds] } }, data: { soldLineId: null } });
}

/**
 * Réactiver une désistée : ses flacons encore disponibles quittent le stock. Refusé si l'un d'eux a été
 * revendu — la commande et la revente se disputeraient le même flacon. Le document est verrouillé par
 * l'appelant.
 */
export async function releaseWithdrawnBottles(tx: Tx, documentId: string): Promise<void> {
  const sold = await tx.db.stockBottle.count({ where: { sourceDocumentId: documentId, soldLineId: { not: null } } });
  if (sold > 0) throw new DomainError("CONFLICT", BOTTLES_RESOLD);
  await tx.db.stockBottle.deleteMany({ where: { sourceDocumentId: documentId, soldLineId: null } });
}

/**
 * « Retirer du stock » : flacon cassé, gardé ou offert hors vente. Un seul ordre SQL, conditionné à la
 * disponibilité : une revente simultanée ne peut pas perdre son flacon.
 */
export async function removeStockBottle(tx: Tx, bottleId: string): Promise<{ id: string; removed: boolean }> {
  const { count } = await tx.db.stockBottle.deleteMany({ where: { id: bottleId, soldLineId: null } });
  if (count === 1) return { id: bottleId, removed: true };
  const bottle = await tx.db.stockBottle.findUnique({ where: { id: bottleId }, select: { soldLineId: true } });
  if (!bottle) return { id: bottleId, removed: false };
  throw new DomainError("CONFLICT", BOTTLE_SOLD);
}
