import { Suspense } from "react";
import { PageScaffold } from "@/ui/patterns/PageScaffold";
import { Heading } from "@/ui/primitives/Heading";
import { Stack } from "@/ui/primitives/Stack";
import { Skeleton, SkeletonList } from "@/ui/primitives/Skeleton";
import { listSalesGroupedByCustomer } from "@/server/sales/queries";
import { treasurySummary, listMovements } from "@/server/treasury/queries";
import { ComptaWithTreasury } from "../components/ComptaWithTreasury";

type ComptaPageProps = {
  searchParams: Promise<{ q?: string }>;
};

/**
 * Squelette aux proportions de l'écran rendu : titre, bascule de vue, chiffres,
 * puis la liste. Il occupe la même place que le contenu, pour que l'arrivée des
 * données ne déplace rien.
 */
function ComptaFallback() {
  return (
    <Stack gap={4}>
      <div className="flex items-center justify-between gap-3">
        <Heading level={1}>Compta</Heading>
        <Skeleton width={160} height={36} className="rounded-full" />
      </div>
      <Skeleton height={52} className="rounded-[12px]" />
      <Skeleton height={44} className="rounded-[12px]" />
      <div className="grid grid-cols-2 gap-2">
        <Skeleton height={86} className="rounded-[14px]" />
        <Skeleton height={86} className="rounded-[14px]" />
      </div>
      <SkeletonList count={4} />
    </Stack>
  );
}

/**
 * Charge les données de la compta.
 *
 * Isolé dans son propre composant pour vivre sous une frontière `Suspense` :
 * la page attendait ses trois requêtes avant d'afficher quoi que ce soit, soit
 * plus de trois secondes d'écran vide alors que le premier pixel arrivait en
 * 50 ms. Le titre s'affiche désormais tout de suite, les chiffres suivent.
 */
async function ComptaContent({ query }: { query: string }) {
  const [data, treasury, movements] = await Promise.all([
    listSalesGroupedByCustomer({ q: query }),
    treasurySummary(),
    listMovements({ limit: 30 }),
  ]);

  return (
    <ComptaWithTreasury
      sales={data}
      initialQuery={query}
      treasury={treasury}
      movements={movements}
    />
  );
}

export async function ComptaPage({ searchParams }: ComptaPageProps) {
  const params = await searchParams;
  const query = (params.q ?? "").trim();

  return (
    <PageScaffold padding={4} ariaLabel="Compta">
      <Suspense key={query} fallback={<ComptaFallback />}>
        <ComptaContent query={query} />
      </Suspense>
    </PageScaffold>
  );
}
