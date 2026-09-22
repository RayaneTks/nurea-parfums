import { pickerCatalogue } from "@/server/catalogue/queries";
import { defineReadRoute, reply } from "@/server/core/define-read-route";

/**
 * Sélecteur de ligne (04 §3.5, §15 règle 9) : parfums de tous statuts et leur grille tarifaire par volume.
 * L'URL porte la version du catalogue fournie par le RSC (`pickerVersion()`) : tant qu'elle est courante,
 * la réponse est cachable par le navigateur ; une version périmée reçoit le contenu à jour, sans cache.
 */
export const GET = defineReadRoute("catalogue.picker", async (request) => {
  const catalogue = await pickerCatalogue();
  const requested = request.nextUrl.searchParams.get("v");
  return reply(catalogue, {
    cacheControl: requested === catalogue.version ? "private, max-age=31536000, immutable" : "private, no-store",
  });
});
