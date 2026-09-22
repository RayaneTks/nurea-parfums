import type { Metadata } from "next";
import { permanentRedirect } from "next/navigation";
import { routes } from "@/app-shell/routes";
import { parseComptaParams } from "@/contracts/compta";
import { ComptaPage } from "@/features/compta";
import { firstParam, type PageSearchParams } from "@/features/documents";

// E03 — Compta (06 E03, 07 J12).
export const metadata: Metadata = { title: "Compta" };

export default async function Page({ searchParams }: { searchParams: PageSearchParams }) {
  const params = await searchParams;
  // Ancien lien de ticket (06 §1.6) : `?sale=` n'est pas repris, la Compta s'ouvre nue. Une règle de
  // `next.config.mjs` bouclerait (Next recopie la query), d'où la redirection ici.
  if (firstParam(params.sale) !== undefined) permanentRedirect(routes.compta());
  return (
    <ComptaPage
      params={parseComptaParams({
        vue: firstParam(params.vue),
        periode: firstParam(params.periode),
        ref: firstParam(params.ref),
        q: firstParam(params.q),
        filtre: firstParam(params.filtre),
      })}
      docId={firstParam(params.doc)}
    />
  );
}
