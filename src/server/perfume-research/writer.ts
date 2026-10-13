import "server-only";
import { cleNom } from "@/lib/nommage";
import type { ReviewPerfumeResearchData, StagePerfumeResearchData } from "@/contracts/perfume-research";
import { DomainError } from "@/domain/errors";
import type { Tx } from "@/server/db/transaction";

/** Import JSON idempotent : une même marque, référence, URL et date ne crée qu'une ligne. */
export async function stageResearch(tx: Tx, input: StagePerfumeResearchData) {
  const rows = input.records.map((record) => ({
    brandName: record.brandName,
    perfumeName: record.perfumeName,
    brandKey: cleNom(record.brandName),
    perfumeKey: cleNom(record.perfumeName),
    line: record.line || null,
    sourceType: record.sourceType,
    sourceUrl: new URL(record.sourceUrl).toString(),
    rightsEvidence: record.rightsEvidence,
    retrievedAt: new Date(record.retrievedAt),
    topNotes: record.topNotes,
    heartNotes: record.heartNotes,
    baseNotes: record.baseNotes,
    universeCorrection: record.universeCorrection || null,
  }));
  const inserted = await tx.db.perfumeResearchRecord.createMany({ data: rows, skipDuplicates: true });
  return { staged: inserted.count, duplicates: rows.length - inserted.count };
}

/** Vérification humaine : seule une fiche en attente peut changer d'état, et le réviseur est journalisé. */
export async function reviewResearch(tx: Tx, input: ReviewPerfumeResearchData, reviewerId: string) {
  const updated = await tx.db.perfumeResearchRecord.updateMany({
    where: { id: input.id, status: "PENDING" },
    data: {
      status: input.status,
      rightsConfirmed: input.rightsConfirmed,
      reviewNotes: input.reviewNotes || null,
      reviewedAt: tx.now,
      reviewerId,
    },
  });
  if (updated.count !== 1) {
    throw new DomainError("CONFLICT", "Cette fiche n'est plus en attente. Recharge la liste avant de la vérifier.");
  }
  return tx.db.perfumeResearchRecord.findUniqueOrThrow({
    where: { id: input.id },
    select: { id: true, status: true, rightsConfirmed: true, reviewNotes: true, reviewedAt: true, reviewerId: true },
  });
}
