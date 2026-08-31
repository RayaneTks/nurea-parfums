import { PageScaffold } from "@/ui/patterns/PageScaffold";
import { Heading } from "@/ui/primitives/Heading";
import { Stack } from "@/ui/primitives/Stack";
import { CustomerForm } from "@/features/customers/components/CustomerForm";

export function CustomerCreatePage() {
  return (
    <PageScaffold padding={4} formScroll ariaLabel="Nouveau client">
      <Stack gap={4}>
        <header>
          <Heading level={1}>Nouveau client</Heading>
          <p className="mt-0.5 text-[13px] text-[var(--admin-text-muted)]">
            Le nom suffit. Le reste accélère les prochaines ventes.
          </p>
        </header>

        <CustomerForm mode="create" />
      </Stack>
    </PageScaffold>
  );
}
