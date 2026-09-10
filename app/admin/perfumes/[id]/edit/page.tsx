import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PerfumeForm } from "@/features/catalogue";
import { PerfumePricingPanel } from "@/features/catalogue/components/PerfumePricingPanel";
import { PerfumeMediaPanel } from "@/features/catalogue/components/PerfumeMediaPanel";
import { listPricingsForPerfume } from "@/server/pricing/queries";
import { listPerfumeMedia } from "@/server/catalogue/media";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Modifier un parfum",
  robots: { index: false, follow: false },
};

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const perfumeId = Number(id);
  if (!Number.isInteger(perfumeId) || perfumeId <= 0) notFound();

  const [pricings, media, perfume] = await Promise.all([
    listPricingsForPerfume(perfumeId),
    listPerfumeMedia(perfumeId),
    prisma.perfume.findUnique({
      where: { id: perfumeId },
      select: { name: true, brand: { select: { name: true } } },
    }),
  ]);
  if (!perfume) notFound();

  // La grille tarifaire et la galerie sont passées EN SLOT, pas empilées à côté
  // du formulaire : un écran ne rend qu'un seul bloc de niveau page.
  return (
    <PerfumeForm
      perfumeId={id}
      mediaSlot={
        <PerfumeMediaPanel
          perfumeId={perfumeId}
          perfumeName={perfume.name}
          brandName={perfume.brand.name}
          initial={media}
        />
      }
      pricingSlot={<PerfumePricingPanel perfumeId={perfumeId} initial={pricings} />}
    />
  );
}
