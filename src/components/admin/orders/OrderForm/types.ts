import type { SelectedCustomer } from "../../customers/CustomerCombobox";

export type OrderFormLineSnapshot = {
  name: string;
  brandName: string;
  /** ID de la marque catalogue liée (si choisie via picker, même pour parfum hors catalogue). */
  brandId: string | null;
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
};

export type OrderFormState = {
  customer: SelectedCustomer | null;
  customerName: string;
  /** Contact libre : téléphone, Snapchat, Instagram… */
  customerContact: string;
  deliveryAt: string; // datetime-local string
  notes: string;
  items: OrderFormLine[];
  /** Acompte initial — uniquement en mode create. */
  initialDeposit: { on: boolean; amount: string; method: string } | null;
};

export const VOLUMES = [30, 50, 100] as const;
