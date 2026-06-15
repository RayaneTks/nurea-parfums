import type { Metadata } from "next";
import { CustomerEditPage } from "@/features/customers/pages/CustomerEditPage";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Modifier client — Admin",
};

type Params = Promise<{ id: string }>;

export default function EditCustomerPage({ params }: { params: Params }) {
  return <CustomerEditPage params={params} />;
}
