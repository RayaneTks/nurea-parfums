import type { Metadata } from "next";
import { firstParam, type PageSearchParams } from "@/features/documents";
import { SettingsPage } from "@/features/settings";

// E08 — Réglages (06 E08, 07 J15).
export const metadata: Metadata = { title: "Réglages" };

export default async function Page({ searchParams }: { searchParams: PageSearchParams }) {
  const params = await searchParams;
  return <SettingsPage docId={firstParam(params.doc)} />;
}
