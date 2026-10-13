import "server-only";
import type { PerfumeResearchLookup } from "@/contracts/perfume-research";
import { cleNom } from "@/lib/nommage";
import { defineQuery } from "@/server/core/define-query";
import { db } from "@/server/db/client";

/** Le futur catalogue et la recherche ne reçoivent que les fiches validées, avec leur provenance. */
export const findResearch = defineQuery(async (input: PerfumeResearchLookup) =>
  db.perfumeResearchRecord.findMany({
    where: {
      brandKey: cleNom(input.brand),
      perfumeKey: cleNom(input.perfume),
      status: input.status,
    },
    orderBy: { reviewedAt: "desc" },
    take: 20,
    select: {
      id: true,
      brandName: true,
      perfumeName: true,
      line: true,
      sourceType: true,
      sourceUrl: true,
      rightsEvidence: true,
      retrievedAt: true,
      topNotes: true,
      heartNotes: true,
      baseNotes: true,
      universeCorrection: true,
      status: true,
      rightsConfirmed: true,
      reviewNotes: true,
      reviewedAt: true,
      reviewerId: true,
    },
  }),
);
