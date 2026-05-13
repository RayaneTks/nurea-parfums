"use client";

import { use, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { OrderFullPageForm } from "./OrderFullPageForm";
import type { OrderRow } from "@/lib/gestion/types";

export function EditOrderClient({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [order, setOrder] = useState<OrderRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const r = await fetch(`/api/admin/orders/${id}`, { credentials: "include" });
      if (!r.ok) throw new Error("Erreur de chargement");
      const j = await r.json();
      setOrder(j.order);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  if (loading) return <div className="p-5 text-center text-[13px] text-admin-muted font-medium mt-10">Chargement de la commande...</div>;
  if (error) return <div className="p-5 text-center text-[13px] text-admin-danger mt-10">{error}</div>;

  return <OrderFullPageForm mode="edit" order={order} />;
}
