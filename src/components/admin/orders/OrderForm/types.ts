import type { SelectedCustomer } from "../../customers/CustomerCombobox";
import type { PerfumePickerRow } from "@/lib/gestion/types";

export type OrderFormLine = {
  key: string;
  perfume: PerfumePickerRow;
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
  deliveryAt: string; // datetime-local string
  notes: string;
  items: OrderFormLine[];
  /** Acompte initial — uniquement en mode create. */
  initialDeposit: { on: boolean; amount: string; method: string } | null;
};

export const VOLUMES = [30, 50, 100] as const;
