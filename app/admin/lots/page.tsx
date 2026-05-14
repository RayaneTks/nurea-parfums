import type { Metadata } from "next";
import { BatchesListPage } from "@/features/batches";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Lots — Admin",
  robots: { index: false, follow: false },
};

export default function Page() {
  return <BatchesListPage />;
}
