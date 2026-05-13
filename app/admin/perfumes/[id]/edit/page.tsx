import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminPerfumeEditPage } from "@/components/admin/AdminPerfumeEditPage";
import { PerfumePricingPanel } from "@/components/admin/pricing/PerfumePricingPanel";
import { listPricingsForPerfume } from "@/server/pricing/queries";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Modifier un parfum",
  robots: { index: false, follow: false },
};

type Params = Promise<{ id: string }>;

export default async function EditPerfumePage({ params }: { params: Params }) {
  const { id } = await params;
  const perfumeId = Number(id);
  if (!Number.isInteger(perfumeId) || perfumeId <= 0) notFound();

  const pricings = await listPricingsForPerfume(perfumeId);

  // AdminPerfumeForm wraps its own <main>. We render it then append the pricing panel
  // as sibling section below (within the page-level scroll container).
  return (
    <>
      <AdminPerfumeEditPage params={Promise.resolve({ id })} />
      <div className="px-5 pb-4 -mt-24">
        <PerfumePricingPanel perfumeId={perfumeId} initial={pricings} />
      </div>
    </>
  );
}
