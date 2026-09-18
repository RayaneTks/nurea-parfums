import { SEED, seedPerfumeId } from "./seed";

/**
 * Brouillons du composeur Vendre (06 E11, 07 J9) posés sur l'appareil avant l'ouverture d'un écran : « E11 avec un
 * brouillon d'une ligne, en mode Vente puis Commande » (06 §1.8). Même forme que `ComposerDraft`
 * (`src/features/sell/components/composer-model.ts`), écrite à la main : un test ne dépend pas du code qu'il éprouve.
 */

export const DRAFT_STORAGE_KEY = "nurea:brouillon:vendre";

const uuid = (n: number) => `e2e0d0c0-0000-4000-9000-${String(n).padStart(12, "0")}`;

type DraftOptions = {
  mode: "vente" | "commande";
  /** Client lié du jeu (prénom), sinon de passage. */
  customer?: "Fares";
  quantity?: number;
};

/** Un ticket d'une ligne « Asad 80 ml · 120 € », coût et taux mémorisés. */
export function composerDraft({ mode, customer, quantity = 1 }: DraftOptions) {
  const fares = SEED.customers[0];
  return {
    v: 1,
    id: uuid(1),
    mode,
    customer: customer ? { kind: "linked", id: fares.id, fullName: fares.fullName, contact: "06 12 34 56 78" } : { kind: "passing", name: "", contact: "" },
    lines: [
      {
        id: uuid(2),
        isNew: true,
        perfumeId: seedPerfumeId("Asad"),
        isOffCatalog: false,
        perfumeName: "Asad",
        brandName: "Lattafa",
        imageUrl: "/branding/monogram/np-circle-bordeaux.webp",
        volumeMl: 80,
        quantity,
        deliveredQuantity: 0,
        price: "120",
        isGift: false,
        lastPrice: "120",
        cost: "22000",
        rate: "277",
        note: "",
      },
    ],
    deliveryDay: null,
    deliveryTime: "",
    notes: "",
    batch: { kind: "auto" },
    received: null,
    pocketId: null,
    split: null,
    paymentIds: Array.from({ length: 10 }, (_, index) => uuid(10 + index)),
  };
}

/** Le contenu du stockage local tel que `useDraft` l'écrit (format 1, horodaté maintenant). */
export function storedDraft(value: unknown): Record<string, string> {
  return { [DRAFT_STORAGE_KEY]: JSON.stringify({ v: 1, savedAt: Date.now(), value }) };
}
