import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCustomerById } from "@/server/customers/queries";
import { CustomerForm } from "@/components/admin/customers/CustomerForm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Modifier client — Admin",
};

type Params = Promise<{ id: string }>;

export default async function EditCustomerPage({ params }: { params: Params }) {
  const { id } = await params;
  const customer = await getCustomerById(id);
  if (!customer) notFound();

  return (
    <main
      id="main-content"
      className="flex-1 space-y-5 px-5 pt-2"
      style={{ paddingBottom: "var(--admin-scroll-bottom-pad)" }}
    >
      <header>
        <h1 className="text-2xl font-bold leading-tight tracking-tight text-neutral-900">
          Modifier {customer.fullName}
        </h1>
      </header>
      <CustomerForm
        mode="edit"
        initial={{
          id: customer.id,
          fullName: customer.fullName,
          phoneE164: customer.phoneE164,
          snapchat: customer.snapchat,
          whatsappE164: customer.whatsappE164,
          address: customer.address,
          notes: customer.notes,
        }}
      />
    </main>
  );
}
