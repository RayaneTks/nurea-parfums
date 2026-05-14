import type { Metadata } from "next";
import { BatchDetailPage } from "@/features/batches";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Lot — Admin",
  robots: { index: false, follow: false },
};

type Params = { params: Promise<{ id: string }> };

export default function Page(props: Params) {
  return <BatchDetailPage {...props} />;
}
