/**
 * Contrat du module catalogue (04 §3.4, §12 ; 02 §4.5 ; écrans E15, E16, E17, E19, S05, S20).
 *
 * - Fiche parfum et grille tarifaire en UN enregistrement (A-6) : `createPerfumeInput` et
 *   `updatePerfumeInput` portent `pricing`, l'état cible complet de la grille 10 / 50 / 80 ml.
 * - Le stock n'est JAMAIS dans la fiche (01 §4.5, 04 §11) : `updatePerfumeInput` n'a pas de clé
 *   `stock`, une clé reçue en trop est ignorée ; le réglage absolu passe par `setPerfumeStockInput`.
 * - Les chemins de stockage sont décidés par le serveur (04 §12) : l'écran demande un envoi pour un
 *   usage et une extension, jamais pour un chemin ; l'original part sous `tmp/`, le serveur le convertit
 *   en WebP à son chemin définitif (décision du 17/09/2026) ; un visuel story ne se range que sous
 *   `stories/<perfumeId>/`, et ni son URL publique ni ses dimensions ne sont des entrées.
 *
 * Messages de publication : `src/domain/publication.ts` (mêmes phrases à l'écran et au serveur).
 */
import { z } from "zod";
import "./zod-fr";
import { PerfumeId } from "@/domain/ids";
import { eur, parseDzdInput, parseEurInput, parseRateInput, toDb, toWire, type MoneyString } from "@/domain/money";
import type { BrandCatalogMode, BrandPublicationState, PublicationStatus } from "@/domain/publication";
import { VOLUMES_ML, isVolumeMl, type VolumeMl } from "@/domain/sale-line";
import type { StockStatus } from "@/domain/stock";
import { STALE_ID_MESSAGE, confirmFlag, entityId, optionalText } from "./fields";

// ── Champs communs ─────────────────────────────────────────────────────────────

export const PUBLICATION_STATUSES = ["DRAFT", "PUBLISHED"] as const satisfies readonly PublicationStatus[];
export const CATALOG_MODES = ["CURATED", "COMPLETE"] as const satisfies readonly BrandCatalogMode[];

/** Identifiant entier d'un parfum (séquence PostgreSQL lue par la vitrine). */
export const perfumeId = z.number().refine((value) => PerfumeId.safeParse(value) !== null, STALE_ID_MESSAGE);

export const PERFUME_NAME_MESSAGE = "Saisis le nom du parfum.";

const perfumeName = z
  .string()
  .trim()
  .min(1, PERFUME_NAME_MESSAGE)
  .max(200, "Raccourcis ce nom : 200 caractères au plus.");

const brandName = z
  .string()
  .trim()
  .min(2, "Indique le nom de la marque (2 caractères au moins).")
  .max(120, "Raccourcis ce nom : 120 caractères au plus.");

export const IMAGE_URL_MESSAGE = "Ce visuel n'a pas une adresse valide : renvoie l'image.";

/** URL d'un visuel rendue par l'envoi (https), ou chemin hérité de la vitrine (`/…`) ; « » = sans visuel. */
function isImageAddress(value: string): boolean {
  return value === "" || /^https?:\/\/[^\s]+$/.test(value) || /^\/[^\s]*$/.test(value);
}

/** Visuel principal : « » = sans visuel (le parfum reste alors masqué, CHECK `perfume_publish_image_ck`). */
const imageField = z.string().trim().max(2048, IMAGE_URL_MESSAGE).refine(isImageAddress, IMAGE_URL_MESSAGE);

/**
 * Visuel facultatif (variante claire, logo) : vidé (`null` ou « ») → `null` ; absent → `undefined`
 * (dans une modification, un champ absent n'est pas touché).
 */
const optionalImageField = z
  .string()
  .nullable()
  .optional()
  .transform((value, ctx) => {
    if (value === undefined || value === null) return value;
    const text = value.trim();
    if (text === "") return null;
    if (text.length > 2048 || !isImageAddress(text)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: IMAGE_URL_MESSAGE });
      return z.NEVER;
    }
    return text;
  });

// ── Grille tarifaire (10 / 50 / 80 ml) ─────────────────────────────────────────

export const PRICING_VOLUME_MESSAGE = "Choisis un volume : 10, 50 ou 80 ml.";

const pricingEntryInput = z
  .object({
    volumeMl: z.custom<VolumeMl>(isVolumeMl, PRICING_VOLUME_MESSAGE),
    /** Saisie clavier : « 120 », « 119,90 ». */
    unitPriceEur: z.string(),
    /** Coût d'achat en dinars ; vide = inconnu. */
    unitCostDzd: z.string().nullable().optional(),
    /** Dinars pour 1 € ; vide = le taux par défaut des réglages sera proposé à la vente. */
    exchangeRate: z.string().nullable().optional(),
  })
  .transform((entry, ctx) => {
    const issue = (path: string, message: string) => ctx.addIssue({ code: z.ZodIssueCode.custom, path: [path], message });
    let valid = true;

    const price = entry.unitPriceEur.trim() === "" ? null : parseEurInput(entry.unitPriceEur);
    if (price === null || eur.isZero(price)) {
      issue(
        "unitPriceEur",
        entry.unitPriceEur.trim() === "" || price !== null
          ? `Indique le prix du ${entry.volumeMl} ml, ou retire ce volume.`
          : "Saisis un prix en euros (ex. 120 ou 119,90).",
      );
      valid = false;
    }

    let cost: string | null = null;
    if ((entry.unitCostDzd ?? "").trim() !== "") {
      const parsed = parseDzdInput(entry.unitCostDzd as string);
      if (parsed === null) {
        issue("unitCostDzd", "Saisis un coût en dinars (ex. 9000).");
        valid = false;
      } else cost = toDb(parsed);
    }

    let rate: string | null = null;
    if ((entry.exchangeRate ?? "").trim() !== "") {
      const parsed = parseRateInput(entry.exchangeRate as string);
      if (parsed === null) {
        issue("exchangeRate", "Saisis un taux supérieur à 0 (ex. 277).");
        valid = false;
      } else rate = toDb(parsed);
    }

    if (!valid || price === null) return z.NEVER;
    return { volumeMl: entry.volumeMl, unitPriceEur: toWire(price), unitCostDzd: cost, exchangeRate: rate };
  });

/**
 * L'état cible COMPLET de la grille d'un parfum : un volume absent est retiré (« Retirer ce volume »,
 * E19). Rendue triée 10 · 50 · 80.
 */
export const pricingGridInput = z
  .array(pricingEntryInput)
  .max(VOLUMES_ML.length, "La grille compte trois volumes au plus : 10, 50 et 80 ml.")
  .superRefine((grid, ctx) => {
    const seen = new Set<number>();
    grid.forEach((entry, index) => {
      if (typeof entry?.volumeMl !== "number") return; // entrée déjà refusée
      if (seen.has(entry.volumeMl)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [index, "volumeMl"],
          message: `Le ${entry.volumeMl} ml apparaît deux fois : garde une seule ligne par volume.`,
        });
      }
      seen.add(entry.volumeMl);
    });
  })
  .transform((grid) => [...grid].sort((a, b) => a.volumeMl - b.volumeMl));

export type PricingGridData = z.output<typeof pricingGridInput>;
export type PricingEntryData = PricingGridData[number];

// ── Parfum ─────────────────────────────────────────────────────────────────────

/**
 * La marque d'une fiche parfum : existante (choisie dans S05), ou saisie (« Créer la marque « … » »),
 * résolue dans la même transaction par `resoudMarque` — une marque équivalente déjà au catalogue est
 * rattachée au lieu d'être dupliquée (02 §4.5).
 */
export const brandRef = z.discriminatedUnion(
  "kind",
  [
    z.object({ kind: z.literal("existing"), brandId: entityId }),
    z.object({ kind: z.literal("new"), name: brandName }),
  ],
  { errorMap: () => ({ message: "Choisis la marque." }) },
);

export type BrandRefData = z.output<typeof brandRef>;

/** Création (E19 « Ajouter au catalogue ») : visuel facultatif, un parfum sans visuel est enregistré masqué. */
export const createPerfumeInput = z.object({
  brand: brandRef,
  name: perfumeName,
  image: imageField.optional().default(""),
  imageLight: optionalImageField,
  /** Visibilité demandée ; rendue masquée si une règle de publication l'empêche (notice). */
  status: z.enum(PUBLICATION_STATUSES).optional().default("PUBLISHED"),
  pricing: pricingGridInput.optional().default([]),
});

/**
 * Modification (E19 « Enregistrer », enregistrement automatique après envoi d'un visuel) : un champ
 * absent n'est pas touché ; `pricing` présent = grille cible complète. PAS de `stock` (04 §11) ni de
 * visibilité (geste dédié, `setPerfumeStatusInput`).
 */
export const updatePerfumeInput = z.object({
  id: perfumeId,
  brand: brandRef.optional(),
  name: perfumeName.optional(),
  image: imageField.optional(),
  imageLight: optionalImageField,
  pricing: pricingGridInput.optional(),
});

export const deletePerfumeInput = z.object({ id: perfumeId });

/** Visibilité en 1 tap (E15 œil, E16 interrupteur) : valeur cible, idempotente. */
export const setPerfumeStatusInput = z.object({ id: perfumeId, status: z.enum(PUBLICATION_STATUSES) });

/** Mise en avant (E15 « En avant », E16) : 2 au plus, parfum visible exigé. */
export const setPerfumeFeaturedInput = z.object({ id: perfumeId, featured: z.boolean() });

export const STOCK_INPUT_MESSAGE = "Indique un stock de 0 ou plus, ou « Non suivi ».";

/** Réglage absolu du stock (S20) ; `null` = non suivi. */
export const setPerfumeStockInput = z.object({
  id: perfumeId,
  stock: z
    .number({ invalid_type_error: STOCK_INPUT_MESSAGE })
    .int(STOCK_INPUT_MESSAGE)
    .min(0, STOCK_INPUT_MESSAGE)
    .max(99_999, "Indique un stock de 99 999 au plus.")
    .nullable(),
});

export type CreatePerfumeInput = z.input<typeof createPerfumeInput>;
export type CreatePerfumeData = z.output<typeof createPerfumeInput>;
export type UpdatePerfumeInput = z.input<typeof updatePerfumeInput>;
export type UpdatePerfumeData = z.output<typeof updatePerfumeInput>;
export type SetPerfumeStatusData = z.output<typeof setPerfumeStatusInput>;
export type SetPerfumeFeaturedData = z.output<typeof setPerfumeFeaturedInput>;
export type SetPerfumeStockData = z.output<typeof setPerfumeStockInput>;

// ── Marque ─────────────────────────────────────────────────────────────────────

/** Création (E17, S05 en mode marques) : une marque équivalente existante est rendue avec une notice. */
export const createBrandInput = z.object({
  name: brandName,
  catalogMode: z.enum(CATALOG_MODES).optional().default("CURATED"),
  status: z.enum(PUBLICATION_STATUSES).optional().default("PUBLISHED"),
  image: optionalImageField,
  imageLight: optionalImageField,
});

/**
 * Modification (E17). Le slug n'est JAMAIS une entrée : fixé à la création, stable au renommage.
 * Masquer ou passer en gamme complète masque les parfums (T14) : réserve à confirmer.
 */
export const updateBrandInput = z.object({
  id: entityId,
  name: brandName.optional(),
  catalogMode: z.enum(CATALOG_MODES).optional(),
  status: z.enum(PUBLICATION_STATUSES).optional(),
  image: optionalImageField,
  imageLight: optionalImageField,
  confirm: confirmFlag,
});

/** Visibilité d'une marque (E15 œil, E17 interrupteur), cascade T14 sur ses parfums. */
export const setBrandVisibilityInput = z.object({
  id: entityId,
  status: z.enum(PUBLICATION_STATUSES),
  confirm: confirmFlag,
});

/** « Republier les N parfums qui ont un visuel » (E15, E17 ; 06 F-4.5-06). */
export const republishBrandPerfumesInput = z.object({ id: entityId });

export const deleteBrandInput = z.object({ id: entityId });

export type CreateBrandData = z.output<typeof createBrandInput>;
export type UpdateBrandInput = z.input<typeof updateBrandInput>;
export type UpdateBrandData = z.output<typeof updateBrandInput>;
export type SetBrandVisibilityData = z.output<typeof setBrandVisibilityInput>;

// ── Envoi d'images (original sur un chemin temporaire, WebP converti par le serveur) ──

/**
 * Extensions d'un ORIGINAL envoyé par l'appareil. Le serveur convertit tout en WebP (décision du
 * 17/09/2026 : iOS Safari ne sait pas encoder le WebP) ; l'extension ne sert qu'à nommer l'original
 * temporaire, le format réel est lu dans les octets.
 */
export const IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "webp", "gif", "heic", "heif", "avif"] as const;
export type ImageExtension = (typeof IMAGE_EXTENSIONS)[number];

/** `parfum` → `perfumes/…`, `logo` → `brands/…`, `story` → `stories/<perfumeId>/…` (04 §12). */
export const IMAGE_USAGES = ["parfum", "logo", "story"] as const;
export type ImageUsage = (typeof IMAGE_USAGES)[number];

/** Usages convertis puis rendus par URL (le formulaire enregistre l'URL) ; `story` est rangé par `addPerfumeMediaInput`. */
export const CATALOGUE_IMAGE_USAGES = ["parfum", "logo"] as const satisfies readonly ImageUsage[];

/**
 * Dossier des originaux en attente de conversion : `tmp/<dossier définitif>/<horodatage>-<aléa>.<ext>`.
 * Rien ne les référence ; l'action de conversion les supprime, `scripts/storage-orphans.ts` retire ceux
 * de plus de 24 h (conversion jamais demandée).
 */
export const UPLOAD_FOLDER = "tmp";

/** Poids maximal d'un original (photo d'iPhone comprise) : refusé par l'appareil, revérifié par le serveur. */
export const MAX_IMAGE_BYTES = 12 * 1024 * 1024;

export const IMAGE_EXTENSION_MESSAGE = "Format non autorisé : jpg, png, webp, gif, heic, heif ou avif.";
export const STORY_NEEDS_PERFUME_MESSAGE = "Enregistre d'abord le parfum pour lui ajouter des visuels story.";
export const UPLOAD_PATH_MESSAGE = "Cette image ne vient pas d'un envoi de la gestion : envoie-la à nouveau.";
export const IMAGE_NOT_RECEIVED_MESSAGE = "Cette image n'est pas arrivée au stockage : envoie-la à nouveau.";
export const IMAGE_UNREADABLE_MESSAGE = "Format illisible : envoie une photo JPEG, PNG, WebP, GIF ou HEIC.";
export const IMAGE_TOO_HEAVY_MESSAGE = "Cette image dépasse 12 Mo : envoie une version plus légère.";
export const IMAGE_TOO_LARGE_MESSAGE = "Cette image dépasse 100 millions de pixels : envoie une version plus petite.";

const isImageExtension = (value: string): value is ImageExtension =>
  (IMAGE_EXTENSIONS as readonly string[]).includes(value);

/**
 * `extension` : « webp », « .HEIC » ou un nom de fichier entier — seule l'extension survit, le nom
 * d'origine est jeté (il pourrait contenir n'importe quoi).
 */
export const createImageUploadUrlInput = z
  .object({
    usage: z.enum(IMAGE_USAGES),
    perfumeId: perfumeId.optional(),
    extension: z.string().transform((value, ctx) => {
      const base = value.trim().split(/[/\\]/).pop() ?? "";
      const extension = (base.includes(".") ? base.slice(base.lastIndexOf(".") + 1) : base).toLowerCase();
      if (!isImageExtension(extension)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: IMAGE_EXTENSION_MESSAGE });
        return z.NEVER;
      }
      return extension;
    }),
  })
  .superRefine((input, ctx) => {
    if (input.usage === "story" && input.perfumeId === undefined) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["perfumeId"], message: STORY_NEEDS_PERFUME_MESSAGE });
    }
  });

export type CreateImageUploadUrlData = z.output<typeof createImageUploadUrlInput>;

const OBJECT_STAMP = /^\d{13}-[0-9a-f]{8}$/;

/** Dossier définitif d'un usage : `perfumes`, `brands` ou `stories/<perfumeId>`. */
function imageFolder(usage: ImageUsage, perfumeId: number | undefined): string {
  switch (usage) {
    case "parfum":
      return "perfumes";
    case "logo":
      return "brands";
    case "story": {
      if (perfumeId === undefined || PerfumeId.safeParse(perfumeId) === null) {
        throw new RangeError("imageFolder : un visuel story appartient à un parfum");
      }
      return `stories/${perfumeId}`;
    }
    default: {
      const _exhaustive: never = usage;
      return _exhaustive;
    }
  }
}

/**
 * Le chemin temporaire de l'ORIGINAL, fabriqué par le serveur : `tmp/<dossier>/<horodatage ms>-<8 hexa>.<ext>`
 * (horodatage-aléa de la production depuis `77985aa`). `stamp` est fourni par `storage.ts` (horloge et
 * aléa), pour que la forme et ses vérifications (`parseUploadPath`, `isStoryPathOf`) vivent au même endroit.
 */
export function buildUploadPath(
  input: { usage: ImageUsage; perfumeId?: number; extension: ImageExtension },
  stamp: string,
): string {
  if (!OBJECT_STAMP.test(stamp)) throw new RangeError(`buildUploadPath : horodatage-aléa attendu, reçu « ${stamp} »`);
  return `${UPLOAD_FOLDER}/${imageFolder(input.usage, input.perfumeId)}/${stamp}.${input.extension}`;
}

/** Un original envoyé, tel que son chemin le décrit. */
export type UploadedOriginal = {
  path: string;
  usage: ImageUsage;
  /** Parfum d'un visuel story ; `null` pour un visuel de parfum ou un logo. */
  perfumeId: number | null;
  stamp: string;
  extension: ImageExtension;
};

const UPLOAD_PATH = new RegExp(
  `^${UPLOAD_FOLDER}/(perfumes|brands|stories/([1-9]\\d{0,9}))/(\\d{13}-[0-9a-f]{8})\\.(${IMAGE_EXTENSIONS.join("|")})$`,
);

/**
 * L'original désigné par ce chemin s'il a EXACTEMENT la forme que le serveur délivre, sinon `null` (autre
 * dossier, `..`, sous-dossier, requête, extension inconnue). Seule porte d'entrée d'une lecture ou d'une
 * suppression d'original : un chemin arbitraire offrirait la lecture et la suppression de n'importe quel objet.
 */
export function parseUploadPath(path: string): UploadedOriginal | null {
  const match = UPLOAD_PATH.exec(path);
  if (!match) return null;
  const [, folder, perfume, stamp, extension] = match as unknown as [string, string, string | undefined, string, ImageExtension];
  if (folder === "perfumes") return { path, usage: "parfum", perfumeId: null, stamp, extension };
  if (folder === "brands") return { path, usage: "logo", perfumeId: null, stamp, extension };
  const perfumeId = PerfumeId.safeParse(Number(perfume));
  return perfumeId === null ? null : { path, usage: "story", perfumeId, stamp, extension };
}

/** Vrai si `path` est un original délivré pour cet usage (et ce parfum, pour un visuel story). */
export function isUploadFor(path: string, usage: ImageUsage, perfumeId?: number): boolean {
  const original = parseUploadPath(path);
  return original !== null && original.usage === usage && (usage !== "story" || original.perfumeId === perfumeId);
}

/**
 * Chemin définitif du WebP converti : même dossier, même horodatage-aléa, extension `webp`. Déterministe :
 * renvoyer la même demande réécrit le même objet, jamais un second (idempotence).
 */
export function convertedImagePath(original: UploadedOriginal): string {
  return `${imageFolder(original.usage, original.perfumeId ?? undefined)}/${original.stamp}.webp`;
}

const STORY_FILE = new RegExp(`^\\d{13}-[0-9a-f]{8}\\.(${IMAGE_EXTENSIONS.join("|")})$`);

/**
 * Vrai si `path` est exactement un chemin définitif de visuel story de ce parfum :
 * `stories/<perfumeId>/<horodatage>-<aléa>.<ext>`, sans `..` ni sous-dossier. Raison : ce chemin finit un
 * jour dans une suppression d'objet (04 §12).
 */
export function isStoryPathOf(perfume: number, path: string): boolean {
  const prefix = `stories/${perfume}/`;
  return !path.includes("..") && path.startsWith(prefix) && STORY_FILE.test(path.slice(prefix.length));
}

/**
 * E19 visuel, E17 logo : l'original envoyé sous `tmp/` devient un WebP (portrait 1024 × 1536 pour un
 * parfum ; logo jamais recadré), dont l'URL publique est rendue au formulaire, qui l'enregistre.
 */
export const convertImageInput = z
  .object({
    usage: z.enum(CATALOGUE_IMAGE_USAGES),
    source: z.string().trim().max(300, UPLOAD_PATH_MESSAGE),
  })
  .superRefine((input, ctx) => {
    if (!isUploadFor(input.source, input.usage)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["source"], message: UPLOAD_PATH_MESSAGE });
    }
  });

export type ConvertImageData = z.output<typeof convertImageInput>;

// ── Visuels story ──────────────────────────────────────────────────────────────

export const MAX_MEDIA_PER_PERFUME = 24;
export const MAX_MEDIA_MESSAGE = `Maximum ${MAX_MEDIA_PER_PERFUME} visuels par parfum. Supprime-en un avant d'en ajouter.`;
export const STORY_PATH_MESSAGE = "Ce visuel ne vient pas d'un envoi de cette fiche : ajoute-le à nouveau depuis la fiche du parfum.";
export const MEDIA_NOT_FOUND_MESSAGE = "Ce visuel n'existe plus. Recharge la fiche du parfum.";

const mediaLabel = z
  .string()
  .trim()
  .max(80, "Raccourcis ce libellé : 80 caractères au plus.")
  .nullable()
  .transform((value) => (value === "" ? null : value));

/**
 * Ranger un visuel déposé (E16 zone 7) : `source` est l'original envoyé sous `tmp/stories/<perfumeId>/`,
 * vérifié strictement ; le serveur le convertit en WebP (1920 px au plus, jamais recadré), en lit les
 * dimensions et le poids, recalcule l'URL et le rang — rien de tout cela n'est reçu.
 */
export const addPerfumeMediaInput = z
  .object({
    perfumeId,
    source: z.string().trim().max(300, STORY_PATH_MESSAGE),
    label: optionalText(80),
  })
  .superRefine((input, ctx) => {
    if (!isUploadFor(input.source, "story", input.perfumeId)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["source"], message: STORY_PATH_MESSAGE });
    }
  });

/** Libellé libre (« Story 9:16 », « Fond clair ») ; `null` ou « » l'efface. */
export const setPerfumeMediaLabelInput = z.object({ perfumeId, mediaId: entityId, label: mediaLabel });

/** Ordre de la galerie : identifiants inconnus ignorés, visuels omis rangés après, dans leur ordre. */
export const reorderPerfumeMediaInput = z.object({
  perfumeId,
  orderedIds: z.array(entityId).max(100, "Réordonne 100 visuels au plus à la fois."),
});

export const removePerfumeMediaInput = z.object({ perfumeId, mediaId: entityId });

export type AddPerfumeMediaData = z.output<typeof addPerfumeMediaInput>;
export type SetPerfumeMediaLabelData = z.output<typeof setPerfumeMediaLabelInput>;
export type ReorderPerfumeMediaData = z.output<typeof reorderPerfumeMediaInput>;
export type RemovePerfumeMediaData = z.output<typeof removePerfumeMediaInput>;

// ── Sorties d'écriture ─────────────────────────────────────────────────────────

export type PerfumeSummary = {
  id: number;
  brandId: string;
  name: string;
  status: PublicationStatus;
  isFeatured: boolean;
};

export type BrandSummary = {
  id: string;
  name: string;
  /** Valeur publique de `?maison=` : lecture seule, stable au renommage. */
  slug: string;
  catalogMode: BrandCatalogMode;
  status: PublicationStatus;
};

export type BrandWrite = {
  brand: BrandSummary;
  /** Parfums visibles masqués par la cascade T14 de cet enregistrement. */
  hiddenPerfumes: number;
  /** Parfums masqués qui ont un visuel et pourraient être republiés (dialogue « Republier ? »). */
  republishable: number;
};

export type BrandRepublication = { brandId: string; republished: number };

export type PerfumeDeletion = { id: number; deleted: boolean };
export type BrandDeletion = { id: string; deleted: boolean; perfumes: number };

export type StockSetting = { id: number; stock: number | null; stockStatus: StockStatus };

export type ImageUploadTicket = {
  /**
   * Chemin TEMPORAIRE de l'original (`tmp/…`), décidé par le serveur ; à renvoyer tel quel comme `source`
   * à `convertImageAction` ou `addPerfumeMediaAction`.
   */
  path: string;
  signedUrl: string;
  token: string;
};

/** Le WebP écrit à son chemin définitif (visuel du parfum ou logo) : URL à enregistrer sur la fiche. */
export type ConvertedImage = {
  url: string;
  width: number;
  height: number;
  bytes: number;
};

export type PerfumeMediaItem = {
  id: string;
  url: string;
  label: string | null;
  width: number;
  height: number;
  bytes: number;
  sortOrder: number;
  /** ISO 8601. */
  createdAt: string;
};

export type MediaRemoval = { id: string; removed: boolean };

// ── Lectures ───────────────────────────────────────────────────────────────────

/** Une rangée de tarifs, dans l'ordre 10 · 50 · 80 (E16 zone 4, E19 zone 3). */
export type PricingRow = {
  volumeMl: VolumeMl;
  unitPriceEur: MoneyString;
  /** Dinars, chaîne décimale exacte (« 9000.00 »), ou null. */
  unitCostDzd: string | null;
  /** Taux, chaîne décimale exacte (« 277.00 »), ou null. */
  exchangeRate: string | null;
  /** Légende « coût 9 000 DA (32,49 €) » : null si le coût ou le taux manque. */
  unitCostEur: MoneyString | null;
};

export type BrandState = BrandPublicationState & { id: string };

/** Ligne de E15 (onglet Parfums, En avant). */
export type AdminPerfumeRow = {
  id: number;
  name: string;
  image: string;
  imageLight: string | null;
  status: PublicationStatus;
  isFeatured: boolean;
  stock: number | null;
  stockStatus: StockStatus;
  /** Légende « · 2 visuels story » (écart du 17/09/2026). */
  mediaCount: number;
  /** De quoi appeler `canPublishPerfume` avant l'aller-retour (œil optimiste). */
  brand: BrandState;
  /** `cleNom` du nom et de la marque, séparés d'une espace : recherche insensible aux accents. */
  searchKey: string;
  /** ISO 8601 : ordre « derniers modifiés d'abord » de l'existant. */
  updatedAt: string;
};

/** Ligne de E15 (onglet Marques). */
export type AdminBrandRow = BrandState & {
  slug: string;
  imageLight: string | null;
  perfumeCount: number;
  publishedCount: number;
  /** Parfums masqués avec un visuel : « Republier aussi ses 8 parfums qui ont un visuel ? ». */
  republishableCount: number;
  searchKey: string;
};

/** L'instantané admin du catalogue (tag `admin-catalogue`, 04 §10.1, §12). */
export type AdminCatalogue = {
  brands: AdminBrandRow[];
  perfumes: AdminPerfumeRow[];
  featured: { count: number; limit: number };
};

/** E16 — fiche parfum en consultation. */
export type PerfumeSheet = {
  perfume: {
    id: number;
    name: string;
    image: string;
    imageLight: string | null;
    status: PublicationStatus;
    isFeatured: boolean;
    stock: number | null;
    stockStatus: StockStatus;
    brand: BrandState & { slug: string };
  };
  pricing: PricingRow[];
  /** « Vendu 12 fois · dernier le 14 sept. » : documents non annulés ; `lastSoldAt` null si jamais vendu. */
  activity: { units: number; documents: number; lastSoldAt: string | null };
  media: PerfumeMediaItem[];
  featured: { count: number; limit: number };
};

/** « Dupliquer » (E16 → E19 `?dupliquer=<id>`) : marque et tarifs repris, nom et visuels vides. */
export type PerfumeDuplicationDraft = {
  brand: BrandState;
  pricing: PricingRow[];
};

/** E17 — marque en modification. */
export type BrandSheet = {
  brand: BrandState & { slug: string; imageLight: string | null };
  perfumeCount: number;
  publishedCount: number;
  republishableCount: number;
};

/** Accueil (E01) et chips de E15 : deux ensembles DISTINCTS, jamais « bas » qui inclut « rupture » (04 §11). */
export type StockAlerts = {
  threshold: number;
  out: { count: number; perfumeIds: number[] };
  low: { count: number; perfumeIds: number[] };
};

/** Sélecteur de ligne (S05, E11) : tous statuts, grille par volume. */
export type PickerPerfume = {
  id: number;
  name: string;
  brandName: string;
  image: string;
  status: PublicationStatus;
  stock: number | null;
  stockStatus: StockStatus;
  searchKey: string;
  pricing: PricingRow[];
};

export type PickerCatalogue = {
  /** Empreinte du contenu : change si et seulement si le sélecteur change (`GET /api/admin/picker?v=`). */
  version: string;
  perfumes: PickerPerfume[];
};
