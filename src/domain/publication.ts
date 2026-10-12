/**
 * Règles de visibilité vitrine et de mise en avant (04 §12), écrites une fois.
 *
 * Le writer `catalogue` les applique, l'UI les appelle pour ses pré-contrôles (interrupteur
 * verrouillé, bascule optimiste) et affiche LES MÊMES messages : l'existant en avait trois
 * formulations divergentes (01 §4.5). Le CHECK `perfume_publish_image_ck` double la règle de
 * visuel en base ; « deux mises en avant au plus » est une règle de service (03 §4.9).
 *
 * Un parfum n'est jamais plus visible que sa marque : la vitrine ne lit que les parfums
 * PUBLISHED d'une marque PUBLISHED, avec un nom et un visuel. Le visuel de gamme complète les
 * flacons publiés en bas de la page marque.
 */

export type PublicationStatus = "DRAFT" | "PUBLISHED";
export type BrandCatalogMode = "CURATED" | "COMPLETE";

/** Emplacements de mise en avant de la vitrine (deux bandeaux). */
export const FEATURED_LIMIT = 2;

export type BrandPublicationState = {
  name: string;
  status: PublicationStatus;
  catalogMode: BrandCatalogMode;
  /** Visuel de gamme principal (thème sombre, facultatif). */
  image: string | null;
};

export type PublicationVerdict = { ok: true } | { ok: false; message: string };

const OK: PublicationVerdict = { ok: true };
const refuse = (message: string): PublicationVerdict => ({ ok: false, message });

/** Même prédicat que les CHECK : `btrim(image) <> ''`. Chaîne vide = sans visuel. */
export function hasVisual(image: string | null | undefined): boolean {
  return (image ?? "").trim() !== "";
}

/** Un parfum peut-il passer « Visible » ? Il lui faut un visuel et une marque visible. */
export function canPublishPerfume(
  perfume: { image: string | null },
  brand: BrandPublicationState,
): PublicationVerdict {
  if (!hasVisual(perfume.image)) return refuse("Ajoute un visuel pour publier ce parfum.");
  if (brand.status !== "PUBLISHED") return refuse(`Rends d'abord la marque ${brand.name} visible.`);
  return OK;
}

/** Une marque peut-elle passer « Visible » ? Le visuel de gamme est facultatif. */
export function canPublishBrand(_brand: { catalogMode: BrandCatalogMode; image: string | null }): PublicationVerdict {
  return OK;
}

/**
 * Mettre un parfum en avant. `featuredCount` compte les parfums DÉJÀ en avant, celui-ci
 * exclu : re-mettre en avant un parfum qui l'est déjà ne doit pas buter sur la limite.
 */
export function canFeaturePerfume(
  perfume: { status: PublicationStatus },
  featuredCount: number,
): PublicationVerdict {
  if (perfume.status !== "PUBLISHED") return refuse("Rends d'abord ce parfum visible pour le mettre en avant.");
  if (featuredCount >= FEATURED_LIMIT) {
    return refuse(`Les ${FEATURED_LIMIT} emplacements sont pris : retire d'abord un parfum.`);
  }
  return OK;
}

/** Ce que la vitrine affiche en carte individuelle (filtres de `catalogue-service.ts`). */
export function isPerfumeVisible(
  perfume: { name: string; image: string | null; status: PublicationStatus },
  brand: { status: PublicationStatus; catalogMode: BrandCatalogMode },
): boolean {
  return (
    perfume.status === "PUBLISHED" &&
    perfume.name.trim() !== "" &&
    hasVisual(perfume.image) &&
    brand.status === "PUBLISHED"
  );
}

/** Cascade T14 : masquer une marque masque tous ses parfums. */
export function brandHidesPerfumes(brand: { status: PublicationStatus; catalogMode: BrandCatalogMode }): boolean {
  return brand.status === "DRAFT";
}

/**
 * Statut et mise en avant réellement écrits pour un parfum créé ou modifié (hors bascule
 * explicite, qui se refuse avec `canPublishPerfume`). Un parfum qui ne peut pas être
 * visible est enregistré masqué, et masqué il perd sa mise en avant : plus d'emplacement
 * occupé par un parfum invisible (03 §6.1). `hiddenBecause` nourrit la notice
 * « Sauvage ajouté, masqué : … » (06 E19).
 */
export function settlePerfumePublication(
  requested: { status: PublicationStatus; isFeatured: boolean },
  perfume: { image: string | null },
  brand: BrandPublicationState,
): { status: PublicationStatus; isFeatured: boolean; hiddenBecause: string | null } {
  if (requested.status === "DRAFT") return { status: "DRAFT", isFeatured: false, hiddenBecause: null };
  const verdict = canPublishPerfume(perfume, brand);
  return verdict.ok
    ? { status: "PUBLISHED", isFeatured: requested.isFeatured, hiddenBecause: null }
    : { status: "DRAFT", isFeatured: false, hiddenBecause: verdict.message };
}
