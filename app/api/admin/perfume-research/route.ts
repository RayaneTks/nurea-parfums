import { perfumeResearchLookupInput } from "@/contracts/perfume-research";
import { DomainError } from "@/domain/errors";
import { findResearch } from "@/server/perfume-research/queries";
import { defineReadRoute } from "@/server/core/define-read-route";

/** API privée de lecture : uniquement les notes vérifiées, avec la source et la preuve de droits. */
export const GET = defineReadRoute("perfumeResearch.lookup", async (request) => {
  const parsed = perfumeResearchLookupInput.safeParse({
    brand: request.nextUrl.searchParams.get("brand"),
    perfume: request.nextUrl.searchParams.get("perfume"),
    ...(request.nextUrl.searchParams.has("status") ? { status: request.nextUrl.searchParams.get("status") } : {}),
  });
  if (!parsed.success) throw new DomainError("VALIDATION", "Indique une marque et un parfum.", "brand");
  return findResearch(parsed.data);
});
