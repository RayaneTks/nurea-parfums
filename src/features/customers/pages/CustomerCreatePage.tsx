import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageScaffold } from "@/ui/patterns/PageScaffold";
import { Heading } from "@/ui/primitives/Heading";
import { Stack } from "@/ui/primitives/Stack";
import { CustomerForm } from "@/components/admin/customers/CustomerForm";

export function CustomerCreatePage() {
  return (
    <PageScaffold padding={4} formScroll ariaLabel="Nouveau client">
      <Stack gap={4}>
        <Link
          href="/admin/clients"
          className="inline-flex w-fit items-center gap-1 text-[13px] text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] tap-scale"
        >
          <ArrowLeft size={14} aria-hidden />
          Clients
        </Link>

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
