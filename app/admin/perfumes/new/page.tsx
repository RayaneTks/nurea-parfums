import type { Metadata } from "next";
import { PerfumeForm } from "@/features/catalogue";

export const metadata: Metadata = {
  title: "Nouveau parfum",
  robots: { index: false, follow: false },
};

export default function Page() {
  return <PerfumeForm />;
}
