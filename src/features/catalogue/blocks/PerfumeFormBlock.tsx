import { Undo2 } from "lucide-react";
import { routes } from "@/app-shell/routes";
import { adminCatalogue, perfumeDuplicationDraft, perfumeSheet } from "@/server/catalogue/queries";
import { getSettings } from "@/server/settings/queries";
import { EmptyState } from "@/ui/primitives/EmptyState";
import { recentBrandIds } from "../components/catalogue-model";
import { LinkButton } from "../components/LinkButton";
import { PerfumeForm } from "../components/PerfumeForm";

function NotFound() {
  return (
    <EmptyState
      icon={Undo2}
      title="Ce parfum n'existe plus"
      description="Il a peut-être été supprimé depuis un autre écran."
      action={<LinkButton href={routes.catalogue()}>Retour au catalogue</LinkButton>}
    />
  );
}

/**
 * E19 — données du formulaire : marques (S05), taux par défaut (placeholder des tarifs), et selon le cas la
 * fiche à modifier ou le brouillon de duplication (marque et tarifs repris, 06 A12).
 */
export async function PerfumeFormBlock(props: { mode: "create"; duplicateId: number | null } | { mode: "edit"; id: number | null }) {
  if (props.mode === "edit") {
    if (props.id === null) return <NotFound />;
    const [sheet, catalogue, settings] = await Promise.all([perfumeSheet(props.id), adminCatalogue(), getSettings()]);
    if (!sheet) return <NotFound />;
    return (
      <PerfumeForm
        mode="edit"
        brands={catalogue.brands}
        recentBrandIds={recentBrandIds(catalogue.perfumes)}
        defaultExchangeRate={settings.defaultExchangeRate}
        initialPricing={sheet.pricing}
        perfume={{
          id: sheet.perfume.id,
          name: sheet.perfume.name,
          image: sheet.perfume.image,
          imageLight: sheet.perfume.imageLight,
          status: sheet.perfume.status,
          mediaCount: sheet.media.length,
          brand: sheet.perfume.brand,
        }}
      />
    );
  }

  const [catalogue, settings, draft] = await Promise.all([
    adminCatalogue(),
    getSettings(),
    props.duplicateId === null ? Promise.resolve(null) : perfumeDuplicationDraft(props.duplicateId),
  ]);
  const source = props.duplicateId === null ? undefined : catalogue.perfumes.find((perfume) => perfume.id === props.duplicateId);
  return (
    <PerfumeForm
      mode="create"
      brands={catalogue.brands}
      recentBrandIds={recentBrandIds(catalogue.perfumes)}
      defaultExchangeRate={settings.defaultExchangeRate}
      initialBrand={draft ? { kind: "existing", brand: draft.brand } : null}
      initialPricing={draft?.pricing ?? []}
      duplicatedFrom={draft && source ? source.name : null}
    />
  );
}
