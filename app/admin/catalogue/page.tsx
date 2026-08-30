import type { Metadata } from "next";
import { Suspense } from "react";
import { CataloguePage } from "@/features/catalogue";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Catalogue",
  robots: { index: false, follow: false },
};

export default function Page() {
  // `useSearchParams` dans l'arbre client impose une frontière Suspense
  // (CSR bailout) — voir CLAUDE.md.
  return (
    <Suspense fallback={null}>
      <CataloguePage />
    </Suspense>
  );
}
