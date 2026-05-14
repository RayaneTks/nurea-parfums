import type { Metadata } from "next";
import { CustomerDetailPage } from "@/features/customers";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Client — Admin",
  robots: { index: false, follow: false },
};

type Params = { params: Promise<{ id: string }> };

export default function Page(props: Params) {
  return <CustomerDetailPage {...props} />;
}
