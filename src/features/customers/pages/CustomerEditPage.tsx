import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PageScaffold } from "@/ui/patterns/PageScaffold";
import { Heading } from "@/ui/primitives/Heading";
import { Stack } from "@/ui/primitives/Stack";
import { CustomerForm } from "@/components/admin/customers/CustomerForm";
import { getCustomerById } from "@/server/customers/queries";

export async function CustomerEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const customer = await getCustomerById(id);
  if (!customer) notFound();

  return (
    <PageScaffold padding={4} formScroll ariaLabel="Modifier client">
      <Stack gap={4}>
        <Link
          href={`/admin/clients/${customer.id}`}
          className="inline-flex w-fit items-center gap-1 text-[13px] text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] tap-scale"
        >
          <ArrowLeft size={14} aria-hidden />
          Fiche client
        </Link>

        <header>
          <Heading level={1}>Modifier</Heading>
          <p className="mt-0.5 truncate text-[13px] text-[var(--admin-text-muted)]">
            {customer.fullName}
          </p>
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
      </Stack>
    </PageScaffold>
  );
}
