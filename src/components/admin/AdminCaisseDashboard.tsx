"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Loader2,
  Plus,
  Trash2,
  Receipt,
  Calculator,
  ClipboardList,
} from "lucide-react";
import { AdminNav } from "./AdminNav";
import { AdminToast, ToastType } from "./ui/AdminToast";
import { AdminButton } from "./ui/AdminButton";
import { AdminInput } from "./ui/AdminInput";

type SessionUser = { username: string; role: string };

type PerfumeOption = {
  id: number;
  name: string;
  slug: string;
  brand: { id: string; name: string };
};

type SaleLineRow = {
  id: string;
  perfumeId: number;
  buyPriceCents: number;
  sellPriceCents: number;
  quantity: number;
  perfume: PerfumeOption;
};

type CashSaleDto = {
  id: string;
  note: string | null;
  createdAt: string;
  lines: SaleLineRow[];
};

type CustomerOrderDto = {
  id: string;
  customerName: string;
  details: string;
  status: "PENDING" | "FULFILLED" | "CANCELLED";
  note: string | null;
  createdAt: string;
  updatedAt: string;
};

type Tab = "enregistrement" | "comptabilite" | "commandes";

type FormLine = {
  id: string;
  perfumeId: string;
  buyEuro: string;
  sellEuro: string;
  qty: string;
};

function readJsonSafe<T>(res: Response): Promise<T | null> {
  const ct = res.headers.get("content-type") ?? "";
  if (!ct.includes("application/json")) return Promise.resolve(null);
  return res.json().catch(() => null);
}

function parseEuroToCents(s: string): number | null {
  const t = s.trim().replace(/\s/g, "").replace(",", ".");
  if (!t) return null;
  const n = Number(t);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}

function formatEuroFromCents(cents: number): string {
  return (cents / 100).toLocaleString("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function lineTotals(centsBuy: number, centsSell: number, qty: number) {
  const revenue = centsSell * qty;
  const cost = centsBuy * qty;
  const margin = revenue - cost;
  return { revenue, cost, margin };
}

function newFormLine(): FormLine {
  return {
    id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()),
    perfumeId: "",
    buyEuro: "",
    sellEuro: "",
    qty: "1",
  };
}

function saleTotals(sale: CashSaleDto) {
  let revenue = 0;
  let cost = 0;
  for (const l of sale.lines) {
    const t = lineTotals(l.buyPriceCents, l.sellPriceCents, l.quantity);
    revenue += t.revenue;
    cost += t.cost;
  }
  return { revenue, cost, margin: revenue - cost };
}

function InnerCaisse() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [tab, setTab] = useState<Tab>("enregistrement");
  const [perfumes, setPerfumes] = useState<PerfumeOption[]>([]);
  const [perfSearch, setPerfSearch] = useState("");
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [formLines, setFormLines] = useState<FormLine[]>([newFormLine()]);
  const [saleNote, setSaleNote] = useState("");
  const [submittingSale, setSubmittingSale] = useState(false);

  const [sales, setSales] = useState<CashSaleDto[]>([]);
  const [salesLoading, setSalesLoading] = useState(false);
  const [summary, setSummary] = useState<{
    kpis: {
      saleCount: number;
      unitsSold: number;
      revenueEuros: number;
      costEuros: number;
      marginNetEuros: number;
      marginRate: number;
    };
    orders: { pending: number; fulfilled: number };
  } | null>(null);

  const [orders, setOrders] = useState<CustomerOrderDto[]>([]);
  const [orderFilter, setOrderFilter] = useState<"ALL" | CustomerOrderDto["status"]>("ALL");
  const [ordersLoading, setOrdersLoading] = useState(false);

  const [orderForm, setOrderForm] = useState({ customerName: "", details: "", note: "" });
  const [submittingOrder, setSubmittingOrder] = useState(false);

  const [actionMsg, setActionMsg] = useState<{ type: ToastType; text: string } | null>(null);

  const [deleteSaleId, setDeleteSaleId] = useState<string | null>(null);
  const [deleteOrderId, setDeleteOrderId] = useState<string | null>(null);
  const [pendingOrderPatch, setPendingOrderPatch] = useState<Set<string>>(new Set());

  const canEdit = user?.role !== "VIEWER";

  const refreshSessionAndPerfumes = useCallback(async () => {
    setIsLoading(true);
    setLoadErr(null);
    try {
      const s = await fetch("/api/admin/session", { credentials: "include", cache: "no-store" });
      if (!s.ok) throw new Error("Session invalide.");
      const sj = (await s.json()) as { user?: SessionUser };
      setUser(sj.user ?? null);

      const p = await fetch("/api/admin/caisse/parfums", { credentials: "include", cache: "no-store" });
      if (!p.ok) {
        const j = await readJsonSafe<{ error?: string }>(p);
        throw new Error(j?.error ?? "Impossible de charger les parfums.");
      }
      const pj = (await p.json()) as { perfumes: PerfumeOption[] };
      setPerfumes(pj.perfumes ?? []);
    } catch (e) {
      setLoadErr(e instanceof Error ? e.message : "Erreur de chargement");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadSummary = useCallback(async () => {
    try {
      const r = await fetch("/api/admin/caisse/summary", { credentials: "include", cache: "no-store" });
      const j = await readJsonSafe<{
        kpis: {
          saleCount: number;
          unitsSold: number;
          revenueEuros: number;
          costEuros: number;
          marginNetEuros: number;
          marginRate: number;
        };
        orders: { pending: number; fulfilled: number };
      }>(r);
      if (r.ok && j) setSummary(j);
    } catch {
      /* silencieux : KPI secondaires */
    }
  }, []);

  const loadSales = useCallback(async () => {
    setSalesLoading(true);
    try {
      const r = await fetch("/api/admin/caisse/ventes?limit=50", { credentials: "include", cache: "no-store" });
      const j = await readJsonSafe<{ sales?: CashSaleDto[] }>(r);
      if (!r.ok) {
        setActionMsg({ type: "error", text: j && "error" in j ? String((j as { error: string }).error) : "Liste des ventes indisponible." });
        return;
      }
      setSales(j?.sales ?? []);
    } finally {
      setSalesLoading(false);
    }
  }, []);

  const loadOrders = useCallback(async () => {
    setOrdersLoading(true);
    try {
      const q =
        orderFilter === "ALL" ? "" : `?status=${orderFilter}`;
      const r = await fetch(`/api/admin/caisse/commandes${q}`, { credentials: "include", cache: "no-store" });
      const j = await readJsonSafe<{ orders?: CustomerOrderDto[] }>(r);
      if (!r.ok) {
        setActionMsg({ type: "error", text: "Liste des commandes indisponible." });
        return;
      }
      setOrders(j?.orders ?? []);
    } finally {
      setOrdersLoading(false);
    }
  }, [orderFilter]);

  useEffect(() => {
    refreshSessionAndPerfumes();
  }, [refreshSessionAndPerfumes]);

  useEffect(() => {
    if (tab === "comptabilite") {
      loadSummary();
      loadSales();
    }
  }, [tab, loadSummary, loadSales]);

  useEffect(() => {
    if (tab === "commandes") {
      loadOrders();
    }
  }, [tab, loadOrders]);

  const filteredPerfumes = useMemo(() => {
    const q = perfSearch.trim().toLowerCase();
    if (!q) return perfumes;
    return perfumes.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.brand.name.toLowerCase().includes(q),
    );
  }, [perfumes, perfSearch]);

  const draftTotals = useMemo(() => {
    let revenue = 0;
    let cost = 0;
    for (const row of formLines) {
      const pid = Number(row.perfumeId);
      if (!Number.isFinite(pid) || pid <= 0) continue;
      const b = parseEuroToCents(row.buyEuro);
      const s = parseEuroToCents(row.sellEuro);
      const q = Math.round(Number(row.qty));
      if (b === null || s === null || !Number.isFinite(q) || q < 1) continue;
      revenue += s * q;
      cost += b * q;
    }
    const margin = revenue - cost;
    const rate = revenue > 0 ? margin / revenue : 0;
    return { revenue, cost, margin, rate };
  }, [formLines]);

  async function submitSale() {
    if (!canEdit) return;
    const lines: { perfumeId: number; buyPriceCents: number; sellPriceCents: number; quantity: number }[] = [];
    for (const row of formLines) {
      const perfumeId = Number(row.perfumeId);
      const buyPriceCents = parseEuroToCents(row.buyEuro);
      const sellPriceCents = parseEuroToCents(row.sellEuro);
      const quantity = Math.round(Number(row.qty));
      if (!Number.isFinite(perfumeId) || perfumeId <= 0) {
        setActionMsg({ type: "error", text: "Choisissez un parfum pour chaque ligne." });
        return;
      }
      if (buyPriceCents === null || sellPriceCents === null) {
        setActionMsg({ type: "error", text: "Renseignez des prix valides (€) pour chaque ligne." });
        return;
      }
      if (!Number.isFinite(quantity) || quantity < 1) {
        setActionMsg({ type: "error", text: "La quantité doit être au moins 1." });
        return;
      }
      lines.push({ perfumeId, buyPriceCents, sellPriceCents, quantity });
    }
    if (lines.length === 0) {
      setActionMsg({ type: "error", text: "Ajoutez au moins une ligne complète." });
      return;
    }

    setSubmittingSale(true);
    const r = await fetch("/api/admin/caisse/ventes", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        lines,
        note: saleNote.trim() || null,
      }),
    });
    const j = await readJsonSafe<{ error?: string; sale?: CashSaleDto }>(r);
    setSubmittingSale(false);
    if (!r.ok) {
      setActionMsg({ type: "error", text: j?.error ?? "Enregistrement impossible." });
      return;
    }
    setActionMsg({ type: "success", text: "Vente enregistrée." });
    setFormLines([newFormLine()]);
    setSaleNote("");
    loadSummary();
    if (tab === "comptabilite") loadSales();
  }

  async function confirmDeleteSale(id: string) {
    if (!canEdit) return;
    const r = await fetch(`/api/admin/caisse/ventes/${id}`, { method: "DELETE", credentials: "include" });
    const j = await readJsonSafe<{ error?: string }>(r);
    setDeleteSaleId(null);
    if (!r.ok) {
      setActionMsg({ type: "error", text: j?.error ?? "Suppression impossible." });
      return;
    }
    setActionMsg({ type: "success", text: "Vente supprimée." });
    setSales((prev) => prev.filter((s) => s.id !== id));
    loadSummary();
  }

  async function submitOrder() {
    if (!canEdit) return;
    const customerName = orderForm.customerName.trim();
    const details = orderForm.details.trim();
    if (!customerName || !details) {
      setActionMsg({ type: "error", text: "Renseignez le nom et le détail de la commande." });
      return;
    }
    setSubmittingOrder(true);
    const r = await fetch("/api/admin/caisse/commandes", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerName,
        details,
        note: orderForm.note.trim() || null,
      }),
    });
    const j = await readJsonSafe<{ error?: string; order?: CustomerOrderDto }>(r);
    setSubmittingOrder(false);
    if (!r.ok) {
      setActionMsg({ type: "error", text: j?.error ?? "Enregistrement impossible." });
      return;
    }
    if (j?.order) setOrders((prev) => [j.order!, ...prev]);
    setActionMsg({ type: "success", text: "Commande enregistrée." });
    setOrderForm({ customerName: "", details: "", note: "" });
    loadSummary();
  }

  async function patchOrderStatus(id: string, status: CustomerOrderDto["status"]) {
    if (!canEdit) return;
    setPendingOrderPatch((prev) => new Set(prev).add(id));
    const r = await fetch(`/api/admin/caisse/commandes/${id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const j = await readJsonSafe<{ error?: string; order?: CustomerOrderDto }>(r);
    setPendingOrderPatch((prev) => {
      const n = new Set(prev);
      n.delete(id);
      return n;
    });
    if (!r.ok) {
      setActionMsg({ type: "error", text: j?.error ?? "Mise à jour impossible." });
      return;
    }
    if (j?.order) {
      setOrders((prev) => prev.map((o) => (o.id === id ? j.order! : o)));
    }
    setActionMsg({ type: "success", text: "Statut mis à jour." });
    loadSummary();
  }

  async function confirmDeleteOrder(id: string) {
    if (!canEdit) return;
    const r = await fetch(`/api/admin/caisse/commandes/${id}`, { method: "DELETE", credentials: "include" });
    const j = await readJsonSafe<{ error?: string }>(r);
    setDeleteOrderId(null);
    if (!r.ok) {
      setActionMsg({ type: "error", text: j?.error ?? "Suppression impossible." });
      return;
    }
    setOrders((prev) => prev.filter((o) => o.id !== id));
    setActionMsg({ type: "success", text: "Commande supprimée." });
    loadSummary();
  }

  const statusLabel: Record<CustomerOrderDto["status"], string> = {
    PENDING: "En attente",
    FULFILLED: "Traitée",
    CANCELLED: "Annulée",
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 selection:bg-blue-500/30">
      <AdminNav />

      <main className="mx-auto max-w-4xl px-5 pt-8 pb-32">
        <div className="mb-8">
          <h1 className="text-[28px] font-bold tracking-tight text-zinc-100">Caisse</h1>
          <p className="mt-1 text-[14px] text-zinc-400">
            Enregistrez les ventes, consultez la comptabilité et suivez les commandes clients.
          </p>
        </div>

        <div className="relative mb-8 flex gap-1 border border-zinc-800 bg-zinc-900/50 p-1">
          <button
            type="button"
            onClick={() => setTab("comptabilite")}
            className={`relative flex min-h-[44px] flex-1 items-center justify-center gap-2 text-sm font-semibold transition-all duration-200 ${
              tab === "comptabilite" ? "bg-zinc-800 text-white shadow-lg" : "text-zinc-500 [@media(hover:hover)]:hover:text-zinc-300"
            }`}
          >
            <Calculator className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
            Comptabilité
          </button>
          <button
            type="button"
            onClick={() => setTab("enregistrement")}
            className={`relative flex min-h-[44px] flex-1 items-center justify-center gap-2 text-sm font-semibold transition-all duration-200 ${
              tab === "enregistrement" ? "bg-zinc-800 text-white shadow-lg" : "text-zinc-500 [@media(hover:hover)]:hover:text-zinc-300"
            }`}
          >
            <Receipt className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
            Enregistrement
          </button>
          <button
            type="button"
            onClick={() => setTab("commandes")}
            className={`relative flex min-h-[44px] flex-1 items-center justify-center gap-2 text-sm font-semibold transition-all duration-200 ${
              tab === "commandes" ? "bg-zinc-800 text-white shadow-lg" : "text-zinc-500 [@media(hover:hover)]:hover:text-zinc-300"
            }`}
          >
            <ClipboardList className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
            Commandes
          </button>
        </div>

        {loadErr && (
          <div className="mb-6 flex items-start gap-3 border border-red-500/20 bg-red-500/10 p-4">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
            <div className="flex-1">
              <p className="text-sm font-bold text-red-500">Erreur de chargement</p>
              <p className="mt-0.5 text-[13px] text-red-400/80">{loadErr}</p>
              <button
                type="button"
                onClick={refreshSessionAndPerfumes}
                className="mt-3 text-[12px] font-bold uppercase tracking-wider text-red-500 transition-colors [@media(hover:hover)]:hover:text-red-400"
              >
                Réessayer
              </button>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="flex flex-col items-center justify-center gap-4 py-20 text-zinc-500">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            <p className="font-medium">Chargement…</p>
          </div>
        ) : tab === "enregistrement" ? (
          <section className="space-y-6">
            <AdminInput
              label="Filtrer les parfums"
              isSearch
              value={perfSearch}
              onChange={(e) => setPerfSearch(e.target.value)}
              onClear={() => setPerfSearch("")}
              placeholder="Marque ou parfum…"
            />

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-zinc-100">Lignes de vente</h2>
                {canEdit && (
                  <AdminButton
                    type="button"
                    variant="outline"
                    size="sm"
                    leftIcon={Plus}
                    onClick={() => setFormLines((prev) => [...prev, newFormLine()])}
                  >
                    Ajouter une ligne
                  </AdminButton>
                )}
              </div>

              {formLines.map((row, idx) => (
                <div
                  key={row.id}
                  className="space-y-3 border border-zinc-800 bg-zinc-900/40 p-4"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                      Ligne {idx + 1}
                    </span>
                    {canEdit && formLines.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setFormLines((prev) => prev.filter((l) => l.id !== row.id))}
                        className="flex h-11 w-11 shrink-0 items-center justify-center text-zinc-500 transition-colors [@media(hover:hover)]:hover:bg-zinc-800 [@media(hover:hover)]:hover:text-red-400"
                        aria-label="Retirer la ligne"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  <label className="block">
                    <span className="mb-1.5 block text-[13px] font-medium text-zinc-400">Parfum</span>
                    <select
                      className="block w-full min-h-[48px] appearance-none border border-zinc-800 bg-zinc-900/50 px-4 text-[15px] text-zinc-100 transition-all duration-200 focus-visible:border-blue-500/50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/10 disabled:opacity-40"
                      value={row.perfumeId}
                      onChange={(e) =>
                        setFormLines((prev) =>
                          prev.map((l) => (l.id === row.id ? { ...l, perfumeId: e.target.value } : l)),
                        )
                      }
                      disabled={!canEdit}
                    >
                      <option value="">Choisir…</option>
                      {filteredPerfumes.map((p) => (
                        <option key={p.id} value={String(p.id)}>
                          {p.brand.name} — {p.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <div className="grid gap-3 sm:grid-cols-3">
                    <AdminInput
                      label="Prix d’achat (€)"
                      inputMode="decimal"
                      value={row.buyEuro}
                      onChange={(e) =>
                        setFormLines((prev) =>
                          prev.map((l) => (l.id === row.id ? { ...l, buyEuro: e.target.value } : l)),
                        )
                      }
                      disabled={!canEdit}
                      placeholder="0,00"
                    />
                    <AdminInput
                      label="Prix de vente (€)"
                      inputMode="decimal"
                      value={row.sellEuro}
                      onChange={(e) =>
                        setFormLines((prev) =>
                          prev.map((l) => (l.id === row.id ? { ...l, sellEuro: e.target.value } : l)),
                        )
                      }
                      disabled={!canEdit}
                      placeholder="0,00"
                    />
                    <AdminInput
                      label="Quantité"
                      inputMode="numeric"
                      value={row.qty}
                      onChange={(e) =>
                        setFormLines((prev) =>
                          prev.map((l) => (l.id === row.id ? { ...l, qty: e.target.value } : l)),
                        )
                      }
                      disabled={!canEdit}
                    />
                  </div>

                  {(() => {
                    const b = parseEuroToCents(row.buyEuro);
                    const s = parseEuroToCents(row.sellEuro);
                    const q = Math.round(Number(row.qty));
                    if (b === null || s === null || !Number.isFinite(q) || q < 1) return null;
                    const { margin, revenue } = lineTotals(b, s, q);
                    return (
                      <p className="text-[13px] text-zinc-400">
                        Marge ligne :{" "}
                        <span className="font-semibold text-emerald-400/90">
                          {formatEuroFromCents(margin)} €
                        </span>
                        <span className="text-zinc-600"> · </span>
                        CA ligne :{" "}
                        <span className="font-medium text-zinc-300">{formatEuroFromCents(revenue)} €</span>
                      </p>
                    );
                  })()}
                </div>
              ))}
            </div>

            <div className="border border-zinc-800 bg-zinc-900/30 p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-zinc-500">Synthèse brouillon</p>
              <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                <div className="flex justify-between gap-4 border-b border-zinc-800/80 py-2 sm:border-0">
                  <dt className="text-zinc-500">Chiffre d’affaires</dt>
                  <dd className="font-semibold text-zinc-100">{formatEuroFromCents(draftTotals.revenue)} €</dd>
                </div>
                <div className="flex justify-between gap-4 border-b border-zinc-800/80 py-2 sm:border-0">
                  <dt className="text-zinc-500">Coût d’achat</dt>
                  <dd className="font-semibold text-zinc-100">{formatEuroFromCents(draftTotals.cost)} €</dd>
                </div>
                <div className="flex justify-between gap-4 border-b border-zinc-800/80 py-2 sm:border-0">
                  <dt className="text-zinc-500">Marge nette</dt>
                  <dd className="font-semibold text-emerald-400/90">{formatEuroFromCents(draftTotals.margin)} €</dd>
                </div>
                <div className="flex justify-between gap-4 py-2">
                  <dt className="text-zinc-500">Taux de marge</dt>
                  <dd className="font-semibold text-zinc-100">
                    {(draftTotals.rate * 100).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} %
                  </dd>
                </div>
              </dl>
            </div>

            <label className="block">
              <span className="mb-1.5 block text-[13px] font-medium text-zinc-400">Note (optionnel)</span>
              <textarea
                className="min-h-[88px] w-full resize-y border border-zinc-800 bg-zinc-900/50 px-4 py-3 text-[15px] text-zinc-100 placeholder:text-zinc-600 transition-all duration-200 focus-visible:border-blue-500/50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/10 disabled:opacity-40"
                value={saleNote}
                onChange={(e) => setSaleNote(e.target.value)}
                disabled={!canEdit}
                placeholder="Référence interne, contexte…"
                maxLength={2000}
              />
            </label>

            {canEdit && (
              <AdminButton type="button" onClick={submitSale} isLoading={submittingSale}>
                Enregistrer la vente
              </AdminButton>
            )}
            {!canEdit && (
              <p className="text-sm text-zinc-500">Lecture seule : connectez-vous avec un compte éditeur pour enregistrer.</p>
            )}
          </section>
        ) : tab === "comptabilite" ? (
          <section className="space-y-8">
            {summary && (
              <div>
                <h2 className="mb-4 text-lg font-bold text-zinc-100">Indicateurs (toutes périodes)</h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="border border-zinc-800 bg-zinc-900/40 p-4">
                    <p className="text-xs font-bold uppercase tracking-wider text-zinc-500">Chiffre d’affaires</p>
                    <p className="mt-2 text-2xl font-bold text-zinc-100">
                      {summary.kpis.revenueEuros.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                    </p>
                  </div>
                  <div className="border border-zinc-800 bg-zinc-900/40 p-4">
                    <p className="text-xs font-bold uppercase tracking-wider text-zinc-500">Coût d’achat</p>
                    <p className="mt-2 text-2xl font-bold text-zinc-100">
                      {summary.kpis.costEuros.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                    </p>
                  </div>
                  <div className="border border-zinc-800 bg-zinc-900/40 p-4">
                    <p className="text-xs font-bold uppercase tracking-wider text-zinc-500">Marge nette</p>
                    <p className="mt-2 text-2xl font-bold text-emerald-400/90">
                      {summary.kpis.marginNetEuros.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                    </p>
                  </div>
                  <div className="border border-zinc-800 bg-zinc-900/40 p-4">
                    <p className="text-xs font-bold uppercase tracking-wider text-zinc-500">Taux de marge</p>
                    <p className="mt-2 text-2xl font-bold text-zinc-100">
                      {(summary.kpis.marginRate * 100).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} %
                    </p>
                  </div>
                  <div className="border border-zinc-800 bg-zinc-900/40 p-4">
                    <p className="text-xs font-bold uppercase tracking-wider text-zinc-500">Unités vendues</p>
                    <p className="mt-2 text-2xl font-bold text-zinc-100">{summary.kpis.unitsSold}</p>
                  </div>
                  <div className="border border-zinc-800 bg-zinc-900/40 p-4">
                    <p className="text-xs font-bold uppercase tracking-wider text-zinc-500">Nombre de ventes</p>
                    <p className="mt-2 text-2xl font-bold text-zinc-100">{summary.kpis.saleCount}</p>
                  </div>
                </div>
                <p className="mt-3 text-[13px] text-zinc-500">
                  Commandes en attente : {summary.orders.pending} · Traitées : {summary.orders.fulfilled}
                </p>
              </div>
            )}

            <div>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-lg font-bold text-zinc-100">Ventes enregistrées</h2>
                <AdminButton type="button" variant="outline" size="sm" onClick={() => { loadSales(); loadSummary(); }} disabled={salesLoading}>
                  Actualiser
                </AdminButton>
              </div>

              {salesLoading ? (
                <div className="flex justify-center py-12 text-zinc-500">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : sales.length === 0 ? (
                <p className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-6 text-sm text-zinc-400">
                  Aucune vente pour l’instant. Passez à l’onglet Enregistrement pour saisir une première vente.
                </p>
              ) : (
                <ul className="space-y-4">
                  {sales.map((sale) => {
                    const t = saleTotals(sale);
                    return (
                      <li key={sale.id} className="border border-zinc-800 bg-zinc-900/40 p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-zinc-200">
                              {new Date(sale.createdAt).toLocaleString("fr-FR", {
                                dateStyle: "short",
                                timeStyle: "short",
                              })}
                            </p>
                            {sale.note && (
                              <p className="mt-1 text-[13px] text-zinc-500">{sale.note}</p>
                            )}
                          </div>
                          {canEdit && (
                            <button
                              type="button"
                              onClick={() => setDeleteSaleId(sale.id)}
                              className="flex h-11 min-w-[44px] items-center justify-center gap-2 border border-zinc-800 px-3 text-sm text-red-400 transition-colors [@media(hover:hover)]:hover:bg-red-500/10"
                              aria-label="Supprimer cette vente"
                            >
                              <Trash2 className="h-4 w-4" />
                              <span className="hidden sm:inline">Supprimer</span>
                            </button>
                          )}
                        </div>
                        <ul className="mt-3 space-y-2 border-t border-zinc-800/80 pt-3">
                          {sale.lines.map((l) => {
                            const lt = lineTotals(l.buyPriceCents, l.sellPriceCents, l.quantity);
                            return (
                              <li key={l.id} className="text-[13px] text-zinc-400">
                                <span className="font-medium text-zinc-200">
                                  {l.perfume.brand.name} — {l.perfume.name}
                                </span>
                                <span className="text-zinc-600"> · </span>
                                {l.quantity} × {formatEuroFromCents(l.sellPriceCents)} €
                                <span className="text-zinc-600"> · </span>
                                marge {formatEuroFromCents(lt.margin)} €
                              </li>
                            );
                          })}
                        </ul>
                        <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-1 border-t border-zinc-800/80 pt-3 text-[13px]">
                          <div>
                            <dt className="inline text-zinc-500">CA </dt>
                            <dd className="inline font-semibold text-zinc-200">{formatEuroFromCents(t.revenue)} €</dd>
                          </div>
                          <div>
                            <dt className="inline text-zinc-500">Coût </dt>
                            <dd className="inline font-semibold text-zinc-200">{formatEuroFromCents(t.cost)} €</dd>
                          </div>
                          <div>
                            <dt className="inline text-zinc-500">Marge </dt>
                            <dd className="inline font-semibold text-emerald-400/90">{formatEuroFromCents(t.margin)} €</dd>
                          </div>
                        </dl>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </section>
        ) : (
          <section className="space-y-8">
            <div>
              <h2 className="mb-4 text-lg font-bold text-zinc-100">Nouvelle commande</h2>
              <div className="space-y-4 border border-zinc-800 bg-zinc-900/40 p-4">
                <AdminInput
                  label="Nom du client"
                  value={orderForm.customerName}
                  onChange={(e) => setOrderForm((f) => ({ ...f, customerName: e.target.value }))}
                  disabled={!canEdit}
                  placeholder="Prénom et nom"
                />
                <label className="block">
                  <span className="mb-1.5 block text-[13px] font-medium text-zinc-400">Détail de la commande</span>
                  <textarea
                    className="min-h-[120px] w-full resize-y border border-zinc-800 bg-zinc-900/50 px-4 py-3 text-[15px] text-zinc-100 placeholder:text-zinc-600 transition-all duration-200 focus-visible:border-blue-500/50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/10 disabled:opacity-40"
                    value={orderForm.details}
                    onChange={(e) => setOrderForm((f) => ({ ...f, details: e.target.value }))}
                    disabled={!canEdit}
                    placeholder="Parfums souhaités, quantités, contraintes…"
                  />
                </label>
                <AdminInput
                  label="Note interne (optionnel)"
                  value={orderForm.note}
                  onChange={(e) => setOrderForm((f) => ({ ...f, note: e.target.value }))}
                  disabled={!canEdit}
                />
                {canEdit && (
                  <AdminButton type="button" onClick={submitOrder} isLoading={submittingOrder}>
                    Enregistrer la commande
                  </AdminButton>
                )}
              </div>
            </div>

            <div>
              <h2 className="mb-4 text-lg font-bold text-zinc-100">Liste des commandes</h2>
              <div className="mb-4 flex flex-wrap gap-2">
                {(["ALL", "PENDING", "FULFILLED", "CANCELLED"] as const).map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setOrderFilter(f)}
                    className={`min-h-[44px] px-4 text-sm font-semibold transition-all duration-200 ${
                      orderFilter === f
                        ? "bg-zinc-100 text-zinc-900"
                        : "border border-zinc-800 bg-zinc-900/50 text-zinc-400 [@media(hover:hover)]:hover:text-zinc-200"
                    }`}
                  >
                    {f === "ALL" ? "Toutes" : statusLabel[f]}
                  </button>
                ))}
              </div>

              {ordersLoading ? (
                <div className="flex justify-center py-12 text-zinc-500">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : orders.length === 0 ? (
                <p className="border border-zinc-800 bg-zinc-900/30 p-6 text-sm text-zinc-400">
                  Aucune commande avec ce filtre. Enregistrez une commande ci-dessus ou changez le filtre.
                </p>
              ) : (
                <ul className="space-y-4">
                  {orders.map((o) => (
                    <li key={o.id} className="border border-zinc-800 bg-zinc-900/40 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-zinc-100">{o.customerName}</p>
                          <p className="mt-1 text-[13px] text-zinc-500">
                            {new Date(o.createdAt).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          {canEdit && (
                            <select
                              className="min-h-[44px] min-w-[140px] border border-zinc-800 bg-zinc-950 px-3 text-sm text-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                              value={o.status}
                              onChange={(e) =>
                                patchOrderStatus(o.id, e.target.value as CustomerOrderDto["status"])
                              }
                              disabled={pendingOrderPatch.has(o.id)}
                              aria-label="Statut de la commande"
                            >
                              <option value="PENDING">{statusLabel.PENDING}</option>
                              <option value="FULFILLED">{statusLabel.FULFILLED}</option>
                              <option value="CANCELLED">{statusLabel.CANCELLED}</option>
                            </select>
                          )}
                          {!canEdit && (
                            <span className="text-sm text-zinc-400">{statusLabel[o.status]}</span>
                          )}
                          {canEdit && (
                            <button
                              type="button"
                              onClick={() => setDeleteOrderId(o.id)}
                              className="flex h-11 w-11 items-center justify-center text-zinc-500 [@media(hover:hover)]:hover:bg-zinc-800 [@media(hover:hover)]:hover:text-red-400"
                              aria-label="Supprimer la commande"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </div>
                      <p className="mt-3 whitespace-pre-wrap text-sm text-zinc-300">{o.details}</p>
                      {o.note && (
                        <p className="mt-2 text-[13px] text-zinc-500">
                          <span className="font-medium text-zinc-600">Note :</span> {o.note}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        )}
      </main>

      {actionMsg && (
        <AdminToast type={actionMsg.type} message={actionMsg.text} onClose={() => setActionMsg(null)} />
      )}

      {deleteSaleId && (
        <div className="fixed inset-0 z-[150] flex items-end justify-center bg-black/80 backdrop-blur-sm sm:items-center sm:p-4">
          <div className="w-full border-t border-zinc-800 bg-zinc-900 p-6 sm:max-w-sm sm:border sm:p-6">
            <h3 className="text-lg font-bold text-zinc-100">Supprimer cette vente ?</h3>
            <p className="mt-2 text-sm text-zinc-400">Cette action retire la vente de la comptabilité. Irréversible.</p>
            <div className="mt-6 flex flex-col gap-2">
              <AdminButton variant="danger" onClick={() => confirmDeleteSale(deleteSaleId)}>
                Supprimer
              </AdminButton>
              <AdminButton variant="ghost" onClick={() => setDeleteSaleId(null)}>
                Annuler
              </AdminButton>
            </div>
          </div>
        </div>
      )}

      {deleteOrderId && (
        <div className="fixed inset-0 z-[150] flex items-end justify-center bg-black/80 backdrop-blur-sm sm:items-center sm:p-4">
          <div className="w-full border-t border-zinc-800 bg-zinc-900 p-6 sm:max-w-sm sm:border sm:p-6">
            <h3 className="text-lg font-bold text-zinc-100">Supprimer cette commande ?</h3>
            <p className="mt-2 text-sm text-zinc-400">Irréversible.</p>
            <div className="mt-6 flex flex-col gap-2">
              <AdminButton variant="danger" onClick={() => confirmDeleteOrder(deleteOrderId)}>
                Supprimer
              </AdminButton>
              <AdminButton variant="ghost" onClick={() => setDeleteOrderId(null)}>
                Annuler
              </AdminButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function AdminCaisseDashboard() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-zinc-950 text-zinc-500">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          <p className="font-medium">Chargement de la caisse…</p>
        </div>
      }
    >
      <InnerCaisse />
    </Suspense>
  );
}
