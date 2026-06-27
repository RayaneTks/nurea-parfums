"use client";

import { useCallback, useEffect, useState } from "react";

const KEY = "nurea-last-exchange-rate";
const DEFAULT_RATE = "277";

/**
 * Mémorise le dernier taux de change DZD→EUR utilisé (localStorage) pour
 * pré-remplir les nouvelles lignes commande/vente. Évite de retaper le taux.
 */
export function useLastExchangeRate(): { rate: string; remember: (r: string) => void } {
  const [rate, setRate] = useState(DEFAULT_RATE);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(KEY);
      if (stored && Number(stored) > 0) setRate(stored);
    } catch {
      /* ignore */
    }
  }, []);

  const remember = useCallback((r: string) => {
    const v = r.replace(",", ".").trim();
    if (!v || !(Number(v) > 0)) return;
    setRate(v);
    try {
      localStorage.setItem(KEY, v);
    } catch {
      /* ignore */
    }
  }, []);

  return { rate, remember };
}
