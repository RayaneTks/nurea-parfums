import type { Metadata } from "next";
import { DashboardLanding } from "@/components/admin/nurea/DashboardLanding";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Tableau de bord — Admin",
};

export default function AdminHomePage() {
  // Auth enforced by middleware (/admin/* → /admin/login if no cookie).
  return <DashboardLanding />;
}
