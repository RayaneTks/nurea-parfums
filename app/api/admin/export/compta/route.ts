import { EXPORT_PERIOD_MESSAGE, parseExportParams } from "@/contracts/compta";
import { DomainError } from "@/domain/errors";
import { defineReadRoute } from "@/server/core/define-read-route";
import { comptaCsv } from "@/server/export/compta-csv";

/**
 * Export CSV de la Compta (04 §3.5, 06 E03 « Exporter ») : `?du=AAAA-MM-JJ&au=AAAA-MM-JJ`, jours de Paris bornes
 * comprises — la période de l'écran ; sans paramètre, depuis le début. Un téléchargement est une réponse HTTP avec
 * `Content-Disposition`, d'où une route de lecture plutôt qu'une action. Jamais mis en cache.
 */
export const GET = defineReadRoute("export.compta", async (request) => {
  const params = parseExportParams({ du: request.nextUrl.searchParams.get("du"), au: request.nextUrl.searchParams.get("au") });
  if (!params) throw new DomainError("VALIDATION", EXPORT_PERIOD_MESSAGE, "du");
  const file = await comptaCsv(params.periode, params.range);
  return new Response(file.text, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${file.fileName}"`,
      "Cache-Control": "private, no-store",
    },
  });
});
