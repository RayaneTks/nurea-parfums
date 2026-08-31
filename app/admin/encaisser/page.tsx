import type { Metadata } from "next";
import { CollectPage } from "@/features/collect";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "À encaisser",
  robots: { index: false, follow: false },
};

export default function Page() {
  return <CollectPage />;
}
