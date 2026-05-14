import type { Metadata } from "next";
import { SellPage } from "@/features/sell";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Vendre — Admin",
  robots: { index: false, follow: false },
};

export default function Page() {
  return <SellPage />;
}
