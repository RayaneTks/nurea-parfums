"use client";

import { useEffect, useState } from "react";
import type { PocketOption } from "./components/PocketSelector";

/**
 * Charge les poches actives (hors « Non attribué ») pour les sélecteurs de flux.
 * `enabled` = ne fetch que quand le sheet est ouvert.
 */
export function usePockets(enabled: boolean): { pockets: PocketOption[]; loading: boolean } {
  const [pockets, setPockets] = useState<PocketOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!enabled || loaded) return;
    setLoading(true);
    fetch("/api/admin/treasury/pockets", { credentials: "include" })
      .then((r) => (r.ok ? (r.json() as Promise<{ pockets?: PocketOption[] }>) : { pockets: [] }))
      .then((d) => {
        setPockets((d.pockets ?? []).filter((p) => !p.isSystem));
        setLoaded(true);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [enabled, loaded]);

  return { pockets, loading };
}
