import type { SelectedCustomer } from "../../customers/CustomerCombobox";

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
  volumeMl: 30 | 50 | 100;
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
  /** Acompte initial — uniquement en mode create. `pocketId` : poche d'encaissement. */
  initialDeposit: { on: boolean; amount: string; method: string; pocketId: string | null } | null;
};

export const VOLUMES = [30, 50, 100] as const;
