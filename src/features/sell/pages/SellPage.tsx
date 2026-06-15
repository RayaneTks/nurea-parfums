import { Suspense } from "react";
import { SellPageClient } from "../components/SellPageClient";

export function SellPage() {
  return (
    <Suspense fallback={null}>
      <SellPageClient />
    </Suspense>
  );
}
