import type { Metadata } from "next";
import { BrandForm } from "@/features/catalogue";

export const metadata: Metadata = {
  title: "Modifier une marque",
  robots: { index: false, follow: false },
};

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <BrandForm brandId={id} />;
}
