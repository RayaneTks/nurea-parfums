"use client";

import { useCallback, useMemo, useReducer } from "react";
import type { SaleDetailRow } from "@/server/sales/queries";

export type TicketDraftLine = {
  /** id existant si ligne déjà persistée, sinon "new:N". */
  key: string;
  perfumeId: number | null;
  /** snapshot pour off-catalog ou pour affichage en view-mode. */
  snapshot: { name: string; brandName: string | null; image: string | null };
  quantity: number;
  volumeMl: 30 | 50 | 100 | null;
  unitPrice: string;
  unitCostDzd: string;
  exchangeRate: string;
};

export type TicketDraft = {
  customerId: string | null;
  customerName: string;
  notes: string;
  lines: TicketDraftLine[];
};

type Mode = "view" | "edit";

type Action =
  | { type: "ENTER_EDIT" }
  | { type: "EXIT_EDIT" }
  | { type: "SET_CUSTOMER"; customerId: string | null; customerName: string }
  | { type: "SET_CUSTOMER_NAME"; name: string }
  | { type: "SET_NOTES"; notes: string }
  | { type: "PATCH_LINE"; key: string; patch: Partial<TicketDraftLine> }
  | { type: "REMOVE_LINE"; key: string }
  | { type: "ADD_LINE"; line: TicketDraftLine }
  | { type: "QUANTITY_DELTA"; key: string; delta: number }
  | { type: "RESET"; draft: TicketDraft };

type State = {
  mode: Mode;
  draft: TicketDraft;
  initial: TicketDraft;
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "ENTER_EDIT":
      return { ...state, mode: "edit" };
    case "EXIT_EDIT":
      return { ...state, mode: "view", draft: state.initial };
    case "SET_CUSTOMER":
      return {
        ...state,
        draft: {
          ...state.draft,
          customerId: action.customerId,
          customerName: action.customerName,
        },
      };
    case "SET_CUSTOMER_NAME":
      return { ...state, draft: { ...state.draft, customerName: action.name } };
    case "SET_NOTES":
      return { ...state, draft: { ...state.draft, notes: action.notes } };
    case "PATCH_LINE":
      return {
        ...state,
        draft: {
          ...state.draft,
          lines: state.draft.lines.map((l) =>
            l.key === action.key ? { ...l, ...action.patch } : l,
          ),
        },
      };
    case "QUANTITY_DELTA":
      return {
        ...state,
        draft: {
          ...state.draft,
          lines: state.draft.lines.map((l) =>
            l.key === action.key
              ? { ...l, quantity: Math.max(1, l.quantity + action.delta) }
              : l,
          ),
        },
      };
    case "REMOVE_LINE":
      return {
        ...state,
        draft: {
          ...state.draft,
          lines: state.draft.lines.filter((l) => l.key !== action.key),
        },
      };
    case "ADD_LINE":
      return { ...state, draft: { ...state.draft, lines: [...state.draft.lines, action.line] } };
    case "RESET":
      return { mode: "view", draft: action.draft, initial: action.draft };
    default: {
      const _exhaustive: never = action;
      return state;
    }
  }
}

function isVolume(v: number | null): v is 30 | 50 | 100 {
  return v === 30 || v === 50 || v === 100;
}

function saleToDraft(sale: SaleDetailRow): TicketDraft {
  return {
    customerId: sale.customerId,
    customerName: sale.customerName ?? "",
    notes: sale.notes ?? "",
    lines: sale.items.map((it) => ({
      key: `id:${it.id}`,
      perfumeId: it.perfumeId,
      snapshot: {
        name: it.snapshot.name,
        brandName: it.snapshot.brandName,
        image: it.snapshot.image ?? null,
      },
      quantity: it.quantity,
      volumeMl: isVolume(it.volumeMl ?? null) ? (it.volumeMl as 30 | 50 | 100) : 100,
      unitPrice: it.unitPrice,
      unitCostDzd: it.unitCostDzd ?? "",
      exchangeRate: it.exchangeRate ?? "277",
    })),
  };
}

export type UseTicketEdit = {
  mode: Mode;
  draft: TicketDraft;
  isDirty: boolean;
  enterEdit: () => void;
  exitEdit: () => void;
  setCustomer: (customerId: string | null, customerName: string) => void;
  setCustomerName: (name: string) => void;
  setNotes: (notes: string) => void;
  patchLine: (key: string, patch: Partial<TicketDraftLine>) => void;
  quantityDelta: (key: string, delta: number) => void;
  removeLine: (key: string) => void;
  addLine: (line: TicketDraftLine) => void;
  reset: (draft: TicketDraft) => void;
  total: number;
};

function totalOf(lines: readonly TicketDraftLine[]): number {
  return lines.reduce((sum, l) => {
    const p = Number(l.unitPrice.replace(",", "."));
    return sum + (Number.isFinite(p) ? p * l.quantity : 0);
  }, 0);
}

export function useTicketEdit(sale: SaleDetailRow): UseTicketEdit {
  const [state, dispatch] = useReducer(reducer, sale, (s): State => {
    const draft = saleToDraft(s);
    return { mode: "view", draft, initial: draft };
  });

  const isDirty = useMemo(
    () => JSON.stringify(state.draft) !== JSON.stringify(state.initial),
    [state.draft, state.initial],
  );

  const total = useMemo(() => totalOf(state.draft.lines), [state.draft.lines]);

  return {
    mode: state.mode,
    draft: state.draft,
    isDirty,
    total,
    enterEdit: useCallback(() => dispatch({ type: "ENTER_EDIT" }), []),
    exitEdit: useCallback(() => dispatch({ type: "EXIT_EDIT" }), []),
    setCustomer: useCallback(
      (customerId, customerName) =>
        dispatch({ type: "SET_CUSTOMER", customerId, customerName }),
      [],
    ),
    setCustomerName: useCallback((name) => dispatch({ type: "SET_CUSTOMER_NAME", name }), []),
    setNotes: useCallback((notes) => dispatch({ type: "SET_NOTES", notes }), []),
    patchLine: useCallback(
      (key, patch) => dispatch({ type: "PATCH_LINE", key, patch }),
      [],
    ),
    quantityDelta: useCallback(
      (key, delta) => dispatch({ type: "QUANTITY_DELTA", key, delta }),
      [],
    ),
    removeLine: useCallback((key) => dispatch({ type: "REMOVE_LINE", key }), []),
    addLine: useCallback((line) => dispatch({ type: "ADD_LINE", line }), []),
    reset: useCallback((draft) => dispatch({ type: "RESET", draft }), []),
  };
}
