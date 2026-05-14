import type { Metadata } from "next";
import { CustomerForm } from "@/components/admin/customers/CustomerForm";

export const metadata: Metadata = {
  title: "Nouveau client — Admin",
};

export default function NewCustomerPage() {
  return (
    <main
      id="main-content"
      className="flex-1 space-y-5 px-5 pt-2"
      style={{ paddingBottom: "var(--admin-scroll-bottom-pad)" }}
    >
      <header>
        <h1 className="text-2xl font-bold leading-tight tracking-tight text-neutral-900">
          Nouveau client
        </h1>
        <p className="mt-0.5 text-sm text-neutral-500">
          Seul le nom est obligatoire. Les autres champs aident l'historique et l'autocomplete.
        </p>
      </header>
      <CustomerForm mode="create" />
    </main>
  );
}
