import type { Metadata } from "next";
import { CustomersPage } from "@/features/customers";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Clients — Admin",
  robots: { index: false, follow: false },
};

type Params = { searchParams: Promise<{ q?: string; cursor?: string }> };

export default function Page(props: Params) {
  return <CustomersPage {...props} />;
}
