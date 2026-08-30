import type { Metadata } from "next";
import { BrandForm } from "@/features/catalogue";

export const metadata: Metadata = {
  title: "Nouvelle marque",
  robots: { index: false, follow: false },
};

export default function Page() {
  return <BrandForm />;
}
