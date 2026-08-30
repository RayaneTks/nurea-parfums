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

  return (
    <>
      <PerfumeForm perfumeId={id} />
      {/* La grille tarifaire est chargée côté serveur : elle vit sous le
          formulaire plutôt que dedans, pour ne pas dépendre de son état. */}
      <div className="admin-page-bottom-pad px-4">
        <PerfumePricingPanel perfumeId={perfumeId} initial={pricings} />
      </div>
    </>
  );
}
