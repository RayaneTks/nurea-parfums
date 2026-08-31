import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PerfumeForm } from "@/features/catalogue";
import { PerfumePricingPanel } from "@/features/catalogue/components/PerfumePricingPanel";
import { listPricingsForPerfume } from "@/server/pricing/queries";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Modifier un parfum",
  robots: { index: false, follow: false },
};

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const perfumeId = Number(id);
  if (!Number.isInteger(perfumeId) || perfumeId <= 0) notFound();

  const pricings = await listPricingsForPerfume(perfumeId);

  // La grille tarifaire est passée EN SLOT, pas empilée à côté du formulaire :
  // un écran ne rend qu'un seul bloc de niveau page.
  return (
    <PerfumeForm
      perfumeId={id}
      pricingSlot={<PerfumePricingPanel perfumeId={perfumeId} initial={pricings} />}
    />
  );
}
