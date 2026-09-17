import "server-only";
import { toDb, type Dzd, type Eur, type Rate } from "@/domain/money";
import type { VolumeMl } from "@/domain/sale-line";
import type { Tx } from "@/server/db/transaction";

/**
 * Writer du catalogue (04 §4.3) : `Brand`, `Perfume` hors stock, `PerfumePricing`.
 *
 * PARTIEL (J5) : seul l'apprentissage des tarifs (N8) est livré, appelé par le writer `documents`.
 * Fiches parfum et marque, visibilité, mise en avant et grille tarifaire depuis la fiche : J11.
 * Le stock n'est jamais écrit ici : `src/server/catalogue/stock.ts` (04 §11).
 */

export type PricingMemory = {
  perfumeId: number;
  volumeMl: VolumeMl;
  unitPriceEur: Eur;
  /** null : coût inconnu sur cette ligne — la mémoire garde le dernier coût connu. */
  unitCostDzd: Dzd | null;
  /** null : taux absent sur cette ligne — la mémoire garde le dernier taux connu. */
  exchangeRate: Rate | null;
};

/**
 * Mémoire de prix apprenante (02 §5 N8, 03 `PerfumePricing`) : le dernier prix pratiqué pour
 * (parfum, volume) remplace le précédent — fin du `update: {}` de l'existant qui figeait la première
 * saisie (01 §4.1). Un coût ou un taux absent de la ligne n'efface pas celui qui est mémorisé : une
 * ligne « coût à compléter » ne doit pas vider le pré-remplissage de la suivante.
 * Appelé pour chaque ligne NON offerte d'un parfum du catalogue, créée ou dont le tarif a changé.
 */
export async function upsertPricing(tx: Tx, memory: PricingMemory): Promise<void> {
  const price = toDb(memory.unitPriceEur);
  const cost = memory.unitCostDzd === null ? null : toDb(memory.unitCostDzd);
  const rate = memory.exchangeRate === null ? null : toDb(memory.exchangeRate);
  await tx.db.perfumePricing.upsert({
    where: { perfumeId_volumeMl: { perfumeId: memory.perfumeId, volumeMl: memory.volumeMl } },
    create: {
      perfumeId: memory.perfumeId,
      volumeMl: memory.volumeMl,
      defaultUnitPriceEur: price,
      defaultUnitCostDzd: cost,
      defaultExchangeRate: rate,
    },
    update: {
      defaultUnitPriceEur: price,
      ...(cost === null ? {} : { defaultUnitCostDzd: cost }),
      ...(rate === null ? {} : { defaultExchangeRate: rate }),
    },
    select: { perfumeId: true },
  });
}
