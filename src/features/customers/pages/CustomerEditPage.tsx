import { notFound } from "next/navigation";
import { PageScaffold } from "@/ui/patterns/PageScaffold";
import { Heading } from "@/ui/primitives/Heading";
import { Stack } from "@/ui/primitives/Stack";
import { CustomerForm } from "@/features/customers/components/CustomerForm";
import { getCustomerById } from "@/server/customers/queries";

export async function CustomerEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const customer = await getCustomerById(id);
  if (!customer) notFound();

  return (
    <PageScaffold padding={4} formScroll ariaLabel="Modifier client">
      <Stack gap={4}>
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
