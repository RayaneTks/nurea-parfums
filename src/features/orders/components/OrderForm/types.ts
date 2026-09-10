import type { SelectedCustomer } from "@/features/customers/components/CustomerCombobox";

export type OrderFormLineSnapshot = {
  name: string;
  brandName: string;
  image: string | null;
};

export type OrderFormLine = {
  key: string;
  /** null = saisie libre (off-catalogue) — snapshot porte le nom/marque. */
  perfumeId: number | null;
  snapshot: OrderFormLineSnapshot;
  quantity: number;
  /*
   * `number` et non l'union des contenances proposées : le formulaire doit
   * pouvoir porter ce que la base contient, y compris une contenance héritée
   * qu'on n'a pas encore traduite. La normalisation se fait à l'écriture.
   */
  volumeMl: number;
  unitPrice: string;
  unitCostDzd: string;
  exchangeRate: string;
  note: string;
  /** Don : parfum offert (prix 0, coût compté). */
  isGift?: boolean;
};

export type OrderFormState = {
  customer: SelectedCustomer | null;
  customerName: string;
  deliveryAt: string; // datetime-local string
  notes: string;
  items: OrderFormLine[];
  /** Acompte initial — uniquement en mode create. */
  initialDeposit: { on: boolean; amount: string; method: string } | null;
};

export { VOLUMES_ML as VOLUMES, DEFAULT_VOLUME_ML } from "@/domain/volumes";
