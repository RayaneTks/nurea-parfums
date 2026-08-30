import type { Metadata } from "next";
import { CustomerCreatePage } from "@/features/customers/pages/CustomerCreatePage";

export const metadata: Metadata = {
  title: "Nouveau client",
};

export default function NewCustomerPage() {
  return <CustomerCreatePage />;
}
