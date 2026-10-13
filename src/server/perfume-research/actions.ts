"use server";
import "server-only";
import { reviewPerfumeResearchInput, stagePerfumeResearchInput } from "@/contracts/perfume-research";
import { requireSession } from "@/server/auth/session";
import { defineAction } from "@/server/core/define-action";
import { inTransaction } from "@/server/db/transaction";
import * as writer from "@/server/perfume-research/writer";

/** Import interne JSON : les fiches restent en attente jusqu'à vérification humaine. */
export const stagePerfumeResearchAction = defineAction(
  "perfumeResearch.stage",
  stagePerfumeResearchInput,
  (input) => inTransaction((tx) => writer.stageResearch(tx, input)),
);

/** Vérification admin : l'identité de session est enregistrée comme réviseur. */
export const reviewPerfumeResearchAction = defineAction(
  "perfumeResearch.review",
  reviewPerfumeResearchInput,
  async (input) => {
    const session = await requireSession();
    return inTransaction((tx) => writer.reviewResearch(tx, input, session.userId));
  },
);
