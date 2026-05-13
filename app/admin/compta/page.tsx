import type { Metadata } from "next";
import { NureaAccountingPage } from "@/components/admin/nurea/AccountingPage";

export const metadata: Metadata = {
  title: "Administration — Compta",
  robots: { index: false, follow: false },
};

export default function ComptaPage() {
  return <NureaAccountingPage />;
}
