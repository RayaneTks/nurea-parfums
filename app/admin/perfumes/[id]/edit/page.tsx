import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PerfumeForm } from "@/features/catalogue";
import { PerfumePricingPanel } from "@/features/catalogue/components/PerfumePricingPanel";
import { PerfumeMediaPanel } from "@/features/catalogue/components/PerfumeMediaPanel";
import { listPricingsForPerfume } from "@/server/pricing/queries";
import { listPerfumeMedia } from "@/server/catalogue/media";
import { prisma } from "@/lib/db/prisma";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, verifyAdminToken } from "@/lib/admin/session";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Modifier un parfum",
  robots: { index: false, follow: false },
};

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const perfumeId = Number(id);
  if (!Number.isInteger(perfumeId) || perfumeId <= 0) notFound();

  const [pricings, media, perfume, session] = await Promise.all([
    listPricingsForPerfume(perfumeId),
    listPerfumeMedia(perfumeId),
    prisma.perfume.findUnique({
      where: { id: perfumeId },
      select: { name: true, brand: { select: { name: true } } },
    }),
    /*
     * Le rôle est lu ICI parce que la galerie est un slot : `PerfumeForm`
     * calcule bien son propre `readOnly`, mais il ne traverse pas un nœud
     * React qu'on lui passe déjà construit. Sans cette lecture, un VIEWER
     * voyait « Ajouter des visuels » et « Retirer » — deux gestes que le
     * serveur refuse ensuite, ce qui est la pire façon de dire non.
     */
    cookies().then((c) => {
      const token = c.get(ADMIN_COOKIE)?.value;
      return token ? verifyAdminToken(token) : null;
    }),
  ]);
  if (!perfume) notFound();

  const readOnly = session?.role === "VIEWER";

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
          readOnly={readOnly}
        />
      }
      pricingSlot={<PerfumePricingPanel perfumeId={perfumeId} initial={pricings} />}
    />
  );
}
