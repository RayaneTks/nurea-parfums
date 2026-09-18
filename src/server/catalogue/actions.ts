"use server";
import "server-only";
import {
  STORY_PATH_MESSAGE,
  addPerfumeMediaInput,
  convertImageInput,
  convertedImagePath,
  createBrandInput,
  createImageUploadUrlInput,
  createPerfumeInput,
  deleteBrandInput,
  deletePerfumeInput,
  parseUploadPath,
  removePerfumeMediaInput,
  reorderPerfumeMediaInput,
  republishBrandPerfumesInput,
  setBrandVisibilityInput,
  setPerfumeFeaturedInput,
  setPerfumeMediaLabelInput,
  setPerfumeStatusInput,
  setPerfumeStockInput,
  updateBrandInput,
  updatePerfumeInput,
} from "@/contracts/catalogue";
import { DomainError } from "@/domain/errors";
import { stockStatus } from "@/domain/stock";
import * as catalogueMedia from "@/server/catalogue/media";
import * as catalogueStock from "@/server/catalogue/stock";
import * as storage from "@/server/catalogue/storage";
import * as catalogueWriter from "@/server/catalogue/writer";
import { defineAction, withNotice } from "@/server/core/define-action";
import { inTransaction } from "@/server/db/transaction";

/**
 * Actions du module catalogue (04 §3.4, §12). Chaque écriture passe par UNE transaction ; `defineAction`
 * en déduit l'invalidation (04 §10.2) : `Brand`, `Perfume`, `PerfumePricing` ⇒ `gestion`, `admin-catalogue`
 * et le contrat vitrine `revalidateAdminCatalogue()` ; `PerfumeMedia` seul ⇒ `gestion` et
 * `admin-catalogue`, sans la vitrine (04 §10.1). Une suppression d'objet du bucket n'a lieu qu'APRÈS le
 * commit (`storage.commitThenRemoveObjects`).
 */

const notices = <T>(data: T, messages: readonly string[]) =>
  messages.length > 0 ? withNotice(data, messages.join(" ")) : data;

// ── Parfums ────────────────────────────────────────────────────────────────────

/** E19 « Ajouter au catalogue » : fiche et grille tarifaire en un enregistrement (A-6). */
export const createPerfumeAction = defineAction("catalogue.createPerfume", createPerfumeInput, async (input) => {
  const out = await inTransaction((tx) => catalogueWriter.createPerfume(tx, input));
  return notices(out.perfume, out.notices);
});

/** E19 « Enregistrer » (fiche + grille, A-6) et enregistrement automatique après envoi d'un visuel. Jamais le stock. */
export const updatePerfumeAction = defineAction("catalogue.updatePerfume", updatePerfumeInput, async (input) => {
  const out = await inTransaction((tx) => catalogueWriter.updatePerfume(tx, input));
  return notices(out.perfume, out.notices);
});

/** E19 « Supprimer le parfum » : visuel et planches story retirés du bucket après le commit. */
export const deletePerfumeAction = defineAction("catalogue.deletePerfume", deletePerfumeInput, (input) =>
  storage.commitThenRemoveObjects((tx) => catalogueWriter.deletePerfume(tx, input.id)),
);

/** E15 œil, E16 interrupteur « Visible sur la vitrine ». */
export const setPerfumeStatusAction = defineAction("catalogue.setPerfumeStatus", setPerfumeStatusInput, (input) =>
  inTransaction((tx) => catalogueWriter.setPerfumeStatus(tx, input)),
);

/** E15 « En avant », E16 « Mettre en avant · 1/2 ». */
export const setPerfumeFeaturedAction = defineAction("catalogue.setPerfumeFeatured", setPerfumeFeaturedInput, (input) =>
  inTransaction((tx) => catalogueWriter.setPerfumeFeatured(tx, input)),
);

/** S20 « Mettre le stock à 5 » : réglage absolu, `null` = non suivi (04 §11). */
export const setPerfumeStockAction = defineAction("catalogue.setPerfumeStock", setPerfumeStockInput, async (input) => {
  const out = await inTransaction((tx) => catalogueStock.setStock(tx, input.id, input.stock));
  return { id: out.id, stock: out.stock, stockStatus: stockStatus(out.stock) };
});

// ── Marques ────────────────────────────────────────────────────────────────────

/** E17 « Ajouter la marque », S05 « Créer la marque « … » » : l'équivalente existante est rendue avec une notice. */
export const createBrandAction = defineAction("catalogue.createBrand", createBrandInput, async (input) => {
  const { brand, created } = await inTransaction((tx) => catalogueWriter.createBrand(tx, input));
  const summary = { id: brand.id, name: brand.name, slug: brand.slug, catalogMode: brand.catalogMode, status: brand.status };
  return created ? summary : withNotice(summary, `${brand.name} existe déjà au catalogue : elle a été sélectionnée.`);
});

/** E17 « Enregistrer » : slug inchangé ; masquer ou passer en gamme complète masque les parfums (T14, réserve). */
export const updateBrandAction = defineAction("catalogue.updateBrand", updateBrandInput, (input) =>
  inTransaction((tx) => catalogueWriter.updateBrand(tx, input)),
);

/** T14 — E15 œil, E17 interrupteur « Visible ». Rend `republishable` pour proposer « Republier ? ». */
export const setBrandVisibilityAction = defineAction("catalogue.setBrandVisibility", setBrandVisibilityInput, (input) =>
  inTransaction((tx) => catalogueWriter.updateBrand(tx, { id: input.id, status: input.status, confirm: input.confirm })),
);

/** « Republier les N parfums qui ont un visuel » (E15, E17). */
export const republishBrandPerfumesAction = defineAction(
  "catalogue.republishBrandPerfumes",
  republishBrandPerfumesInput,
  (input) => inTransaction((tx) => catalogueWriter.republishBrandPerfumes(tx, input.id)),
);

/** E17 « Supprimer la marque » : ses parfums avec elle ; logos, visuels et planches retirés après le commit. */
export const deleteBrandAction = defineAction("catalogue.deleteBrand", deleteBrandInput, (input) =>
  storage.commitThenRemoveObjects((tx) => catalogueWriter.deleteBrand(tx, input.id)),
);

// ── Images et visuels story ────────────────────────────────────────────────────
//
// Décision du 17/09/2026 (04 §12) : l'appareil envoie l'ORIGINAL sous `tmp/` par URL signée ; une action
// le convertit en WebP (`storage.convertUpload`), écrit le chemin définitif, l'URL est enregistrée, puis
// l'original est supprimé. Le geste de l'utilisateur ne change pas.

/** URL signée d'envoi direct de l'original (E19 visuel, E17 logo, E16 zone 7) : chemin `tmp/…` décidé par le serveur. */
export const createImageUploadUrlAction = defineAction(
  "catalogue.createImageUploadUrl",
  createImageUploadUrlInput,
  async (input) => {
    if (input.usage === "story") {
      const perfumeId = input.perfumeId as number;
      const perfume = await inTransaction((tx) =>
        tx.db.perfume.findUnique({ where: { id: perfumeId }, select: { id: true } }),
      );
      if (!perfume) throw new DomainError("NOT_FOUND", catalogueWriter.PERFUME_NOT_FOUND);
    }
    return storage.createImageUpload(input);
  },
);

/**
 * E19 visuel, E17 logo : l'original devient un WebP (portrait 1024 × 1536 ; logo jamais recadré), son URL
 * est rendue au formulaire, qui l'enregistre (`createPerfumeAction`, `updatePerfumeAction`, actions de
 * marque — la publication s'y décide, `publication.ts`). N'écrit rien en base ; l'original est supprimé.
 */
export const convertImageAction = defineAction("catalogue.convertImage", convertImageInput, (input) =>
  storage.thenRemoveUpload(input.source, async () => {
    const image = await storage.convertUpload(input.source, input.usage);
    return { url: image.url, width: image.width, height: image.height, bytes: image.bytes };
  }),
);

/**
 * E16 zone 7 : ranger un visuel déposé. L'original est converti en WebP (1920 px au plus, jamais recadré),
 * écrit sous `stories/<perfumeId>/`, rangé (URL recalculée, dimensions lues, rang calculé, 24 au plus) dans
 * une transaction, PUIS l'original est supprimé. Renvoyer la même `source` rend le visuel déjà rangé.
 */
export const addPerfumeMediaAction = defineAction("catalogue.addPerfumeMedia", addPerfumeMediaInput, (input) =>
  storage.thenRemoveUpload(input.source, async () => {
    const original = parseUploadPath(input.source);
    if (original === null) throw new DomainError("VALIDATION", STORY_PATH_MESSAGE, "source");
    const path = convertedImagePath(original);
    const existing = await inTransaction((tx) => catalogueMedia.mediaAtPathOrRoom(tx, { perfumeId: input.perfumeId, path }));
    if (existing) return existing;

    const image = await storage.convertUpload(input.source, "story");
    return inTransaction((tx) =>
      catalogueMedia.addMedia(tx, {
        perfumeId: input.perfumeId,
        path: image.path,
        url: image.url,
        label: input.label ?? null,
        width: image.width,
        height: image.height,
        bytes: image.bytes,
      }),
    );
  }),
);

/** Libellé libre d'un visuel story (« Story 9:16 », « Fond clair »). */
export const setPerfumeMediaLabelAction = defineAction(
  "catalogue.setPerfumeMediaLabel",
  setPerfumeMediaLabelInput,
  (input) => inTransaction((tx) => catalogueMedia.setMediaLabel(tx, input)),
);

/** Réordonner la galerie, en une transaction (identifiants inconnus ignorés). */
export const reorderPerfumeMediaAction = defineAction("catalogue.reorderPerfumeMedia", reorderPerfumeMediaInput, (input) =>
  inTransaction((tx) => catalogueMedia.reorderMedia(tx, input)),
);

/** E16 visionneuse « Retirer » : DELETE de la ligne, puis l'objet du bucket APRÈS le commit. */
export const removePerfumeMediaAction = defineAction("catalogue.removePerfumeMedia", removePerfumeMediaInput, (input) =>
  storage.commitThenRemoveObjects(async (tx) => {
    const out = await catalogueMedia.removeMedia(tx, input);
    return { data: { id: input.mediaId, removed: out.removed }, remove: out.url === null ? [] : [out.url] };
  }),
);
