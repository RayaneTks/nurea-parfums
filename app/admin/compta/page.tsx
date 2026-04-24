import type { Metadata } from "next";
import { ComptaView } from "@/components/admin/ComptaView";

export const metadata: Metadata = {
  title: "Administration — Compta",
  robots: { index: false, follow: false },
};

export default function ComptaPage() {
  return <ComptaView />;
}
