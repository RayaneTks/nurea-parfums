import { assignSheet, batchSheet } from "@/server/batches/queries";
import { activePockets } from "@/server/treasury/queries";
import { AssignSheet } from "../components/AssignSheet";
import { BatchView } from "../components/BatchView";
import { BatchNotFound } from "../components/BatchNotFound";

/**
 * E06 — la fiche du lot, les poches du moment (S12), et — sous `?assigner=1` — les candidats de S13,
 * servis par le RSC de la page : la sheet ne lance aucune requête (06 S13, 04 §2.3). Les trois partent
 * en parallèle, et S13 est montée UNE fois, avec ses données : elle ne s'ouvre pas sur un vide.
 */
export async function BatchBlock({ id, assigner }: { id: string; assigner: boolean }) {
  const [data, pockets, assign] = await Promise.all([
    batchSheet(id),
    activePockets(),
    assigner ? assignSheet(id) : Promise.resolve(null),
  ]);
  if (!data) return <BatchNotFound />;
  return (
    <>
      <BatchView data={data} pockets={pockets} />
      {assign ? <AssignSheet data={assign} /> : null}
    </>
  );
}
