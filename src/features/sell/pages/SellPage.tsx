import { Suspense } from "react";
import { PageScaffold } from "@/ui/patterns/PageScaffold";
import { SellPageClient } from "../components/SellPageClient";

export function SellPage() {
  return (
    <PageScaffold padding={4} ariaLabel="Vendre">
      <Suspense fallback={null}>
        <SellPageClient />
      </Suspense>
    </PageScaffold>
  );
}
