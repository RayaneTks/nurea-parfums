import type { Metadata } from "next";
import { BatchNewPage } from "@/features/batches";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Nouveau lot — Admin",
  robots: { index: false, follow: false },
};

export default function Page() {
  return <BatchNewPage />;
}
