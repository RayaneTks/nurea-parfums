import type { Metadata } from "next";
import { DashboardPage } from "@/features/dashboard";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Tableau de bord",
  robots: { index: false, follow: false },
};

export default function Page() {
  return <DashboardPage />;
}
