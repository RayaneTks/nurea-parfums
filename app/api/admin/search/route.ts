import { parseSearchParams } from "@/contracts/search";
import { defineReadRoute } from "@/server/core/define-read-route";
import { searchAdmin } from "@/server/search/queries";

/**
 * Recherche à la frappe (04 §3.5) : palette S17, sélecteur de client S06. Un GET annulable plutôt qu'une action :
 * une frappe débouncée ne doit ni attendre la précédente ni retarder une écriture. Jamais mise en cache.
 */
export const GET = defineReadRoute("search", async (request) => {
  const { q, scope } = parseSearchParams(request.nextUrl.searchParams);
  return searchAdmin(q, scope);
});
