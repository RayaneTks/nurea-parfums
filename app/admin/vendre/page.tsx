import type { Metadata } from "next";
import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { NureaSellPage } from "@/components/admin/nurea/SellPage";

export const metadata: Metadata = {
  title: "Administration — Vendre",
  robots: { index: false, follow: false },
};

function VendreFallback() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-20 text-neutral-500">
      <Loader2 className="h-6 w-6 animate-spin text-nurea-bordeaux" aria-hidden />
      <p className="text-[12px] uppercase tracking-wider">Chargement…</p>
    </div>
  );
}

export default function VendrePage() {
  return (
    <Suspense fallback={<VendreFallback />}>
      <NureaSellPage />
    </Suspense>
  );
}
