import Link from "next/link";
import { Plus, Boxes } from "lucide-react";
import { PageScaffold } from "@/ui/patterns/PageScaffold";
import { Stack } from "@/ui/primitives/Stack";
import { Heading } from "@/ui/primitives/Heading";
import { EmptyState } from "@/ui/primitives/EmptyState";
import { Button } from "@/ui/primitives/Button";
import { listBatches, listUnbatched } from "@/server/batches/queries";
import { BatchListRow } from "../components/BatchListRow";
import { UnbatchedSection } from "../components/UnbatchedSection";

export async function BatchesListPage({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string }>;
}) {
  const params = (await searchParams) ?? {};
  const query = (params.q ?? "").trim();
  const [batches, unbatched] = await Promise.all([listBatches(), listUnbatched(query)]);
  const openBatches = batches.filter((b) => b.status === "OPEN");
  const closedBatches = batches.filter((b) => b.status === "CLOSED");

  return (
    <PageScaffold padding={4} ariaLabel="Lots">
      <Stack gap={4}>
        <div className="flex items-center justify-between gap-3">
          <Heading level={1}>Lots</Heading>
          <Link href="/admin/lots/new" prefetch>
            <Button variant="primary" size="sm" leadingIcon={<Plus size={16} />}>
              Nouveau
            </Button>
          </Link>
        </div>

        {/*
          Ce qui reste à ranger passe AVANT les lots eux-mêmes.

          Un lot déjà constitué se consulte quand on en a besoin ; ce qui
          n'appartient à aucun lot, personne ne pense à aller le chercher. La
          seule place où cette liste sert à quelque chose est celle où le regard
          tombe en arrivant.
        */}
        <UnbatchedSection data={unbatched} initialQuery={query} />

        {batches.length === 0 ? (
          <EmptyState
            icon={Boxes}
            title="Aucun lot"
            description="Regroupe des ventes et ajoute des dépenses pour suivre la marge nette."
            action={
              <Link href="/admin/lots/new" prefetch>
                <Button variant="primary" leadingIcon={<Plus size={16} />}>
                  Créer un lot
                </Button>
              </Link>
            }
          />
        ) : (
          <Stack gap={4}>
            {openBatches.length > 0 ? (
              <Stack gap={2}>
                <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--admin-text-subtle)]">
                  Ouverts ({openBatches.length})
                </p>
                <Stack gap={2}>
                  {openBatches.map((b) => (
                    <BatchListRow key={b.id} batch={b} />
                  ))}
                </Stack>
              </Stack>
            ) : null}

            {closedBatches.length > 0 ? (
              <Stack gap={2}>
                <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--admin-text-subtle)]">
                  Clos ({closedBatches.length})
                </p>
                <Stack gap={2}>
                  {closedBatches.map((b) => (
                    <BatchListRow key={b.id} batch={b} />
                  ))}
                </Stack>
              </Stack>
            ) : null}
          </Stack>
        )}
      </Stack>
    </PageScaffold>
  );
}
