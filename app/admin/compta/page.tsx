import type { Metadata } from "next";
import { ComptaPage } from "@/features/compta";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Compta — Admin",
  robots: { index: false, follow: false },
};

type Params = { searchParams: Promise<{ period?: string; q?: string }> };

export default function Page(props: Params) {
  return <ComptaPage {...props} />;
}
