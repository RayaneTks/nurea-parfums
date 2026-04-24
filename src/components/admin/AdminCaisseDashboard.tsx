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
      /* KPI secondaires */
    }
  }, []);

  const loadSales = useCallback(async () => {
    setSalesLoading(true);
    try {
      const r = await fetch("/api/admin/caisse/ventes?limit=50", { credentials: "include", cache: "no-store" });
      const j = await readJsonSafe<{ sales?: CashSaleDto[]; error?: string }>(r);
      if (!r.ok) {
        setActionMsg({ type: "error", text: j?.error ?? "Liste des ventes indisponible." });
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
      const q = orderFilter === "ALL" ? "" : `?status=${orderFilter}`;
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
      (p) => p.name.toLowerCase().includes(q) || p.brand.name.toLowerCase().includes(q),
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
    const j = await readJsonSafe<{ error?: string }>(r);
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

  const caisseTabs: { id: Tab; label: string; icon: typeof Receipt }[] = [
    { id: "comptabilite", label: "Comptabilité", icon: Calculator },
    { id: "enregistrement", label: "Enregistrement", icon: Receipt },
    { id: "commandes", label: "Commandes", icon: ClipboardList },
  ];

  return (
    <main className="mx-auto max-w-lg px-4 pb-6 pt-5 sm:px-5 sm:pt-6">
      <div className="mb-6">
        <h1 className="font-[family-name:var(--font-serif)] text-[30px] font-normal leading-tight tracking-tight text-[var(--admin-text)]">
          Caisse
        </h1>
        <p className="mt-2 text-[14px] leading-snug text-[var(--admin-muted)]">
          Ventes, marges et commandes clients.
        </p>
      </div>

      <div
        className="mb-6 flex border border-[var(--admin-border)] bg-[var(--admin-surface)] p-1"
        role="tablist"
        aria-label="Sections caisse"
      >
        {caisseTabs.map(({ id, label, icon: Icon }) => {
          const active = tab === id;
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={active}
              aria-controls={`caisse-panel-${id}`}
              id={`caisse-tab-${id}`}
              onClick={() => setTab(id)}
              className={`flex min-h-[48px] min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-1 text-[11px] font-semibold transition-colors duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--admin-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--admin-ring-offset)] sm:flex-row sm:text-xs ${
                active ? "bg-[var(--admin-elevated)] text-[var(--admin-text)]" : "text-[var(--admin-muted)] hover:text-[var(--admin-text)]"
              }`}
            >
              <Icon className="h-[18px] w-[18px] shrink-0 opacity-90" strokeWidth={active ? 2.2 : 1.7} aria-hidden />
              <span className="truncate">{label}</span>
            </button>
          );
        })}
      </div>

      {loadErr && (
        <div className="mb-6 flex items-start gap-3 border border-[rgba(224,122,122,0.35)] bg-[rgba(224,122,122,0.08)] p-4" role="alert">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-[var(--admin-danger)]" aria-hidden />
          <div className="flex-1">
            <p className="text-sm font-semibold text-[var(--admin-danger)]">Erreur de chargement</p>
            <p className="mt-0.5 text-[13px] text-[var(--admin-muted)]">{loadErr}</p>
            <button
              type="button"
              onClick={refreshSessionAndPerfumes}
              className="mt-3 text-[12px] font-bold uppercase tracking-wider text-[var(--admin-accent)] underline decoration-[var(--admin-border)] underline-offset-4"
            >
              Réessayer
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex flex-col items-center justify-center gap-4 py-20 text-[var(--admin-muted)]">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--admin-accent)]" aria-hidden />
          <p className="font-medium">Chargement…</p>
        </div>
      ) : (
        <>
          {tab === "enregistrement" && (
            <section id="caisse-panel-enregistrement" role="tabpanel" aria-labelledby="caisse-tab-enregistrement" className="space-y-6">
              <AdminInput
                label="Filtrer les parfums"
                isSearch
                value={perfSearch}
                onChange={(e) => setPerfSearch(e.target.value)}
                onClear={() => setPerfSearch("")}
                placeholder="Marque ou parfum…"
                autoComplete="off"
              />

              <div className="space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-base font-semibold text-[var(--admin-text)]">Lignes de vente</h2>
                  {canEdit && (
                    <AdminButton
                      type="button"
                      variant="outline"
                      size="sm"
                      leftIcon={Plus}
                      onClick={() => setFormLines((prev) => [...prev, newFormLine()])}
                    >
                      Ligne
                    </AdminButton>
                  )}
                </div>

                {formLines.map((row, idx) => (
                  <div key={row.id} className="space-y-3 border border-[var(--admin-border)] bg-[var(--admin-surface)] p-4">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--admin-muted)]">
                        Ligne {idx + 1}
                      </span>
                      {canEdit && formLines.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setFormLines((prev) => prev.filter((l) => l.id !== row.id))}
                          className="flex h-11 w-11 shrink-0 items-center justify-center text-[var(--admin-muted)] transition-colors hover:bg-[var(--admin-elevated)] hover:text-[var(--admin-danger)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--admin-accent)]"
                          aria-label={`Retirer la ligne ${idx + 1}`}
                        >
                          <Trash2 className="h-4 w-4" aria-hidden />
                        </button>
                      )}
                    </div>

                    <label className="block">
                      <span className="mb-1.5 block text-[13px] font-medium text-[var(--admin-muted)]">Parfum</span>
                      <select
                        className="block w-full min-h-[48px] border border-[var(--admin-border)] bg-[var(--admin-input-bg)] px-3 text-[15px] text-[var(--admin-text)] focus-visible:border-[var(--admin-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--admin-accent)]/30 disabled:opacity-40"
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
                        <p className="text-[13px] text-[var(--admin-muted)]">
                          Marge ligne :{" "}
                          <span className="font-semibold text-[var(--admin-success)]">{formatEuroFromCents(margin)} €</span>
                          <span className="text-[var(--admin-border)]"> · </span>
                          CA ligne :{" "}
                          <span className="font-medium text-[var(--admin-text)]">{formatEuroFromCents(revenue)} €</span>
                        </p>
                      );
                    })()}
                  </div>
                ))}
              </div>

              <div className="border border-[var(--admin-border)] bg-[var(--admin-surface)] p-4">
                <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--admin-muted)]">Synthèse brouillon</p>
                <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                  <div className="flex justify-between gap-4 border-b border-[var(--admin-border)] py-2 sm:border-0">
                    <dt className="text-[var(--admin-muted)]">Chiffre d’affaires</dt>
                    <dd className="font-semibold text-[var(--admin-text)]">{formatEuroFromCents(draftTotals.revenue)} €</dd>
                  </div>
                  <div className="flex justify-between gap-4 border-b border-[var(--admin-border)] py-2 sm:border-0">
                    <dt className="text-[var(--admin-muted)]">Coût d’achat</dt>
                    <dd className="font-semibold text-[var(--admin-text)]">{formatEuroFromCents(draftTotals.cost)} €</dd>
                  </div>
                  <div className="flex justify-between gap-4 border-b border-[var(--admin-border)] py-2 sm:border-0">
                    <dt className="text-[var(--admin-muted)]">Marge nette</dt>
                    <dd className="font-semibold text-[var(--admin-success)]">{formatEuroFromCents(draftTotals.margin)} €</dd>
                  </div>
                  <div className="flex justify-between gap-4 py-2">
                    <dt className="text-[var(--admin-muted)]">Taux de marge</dt>
                    <dd className="font-semibold text-[var(--admin-text)]">
                      {(draftTotals.rate * 100).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} %
                    </dd>
                  </div>
                </dl>
              </div>

              <label className="block">
                <span className="mb-1.5 block text-[13px] font-medium text-[var(--admin-muted)]">Note (optionnel)</span>
                <textarea
                  className="min-h-[88px] w-full resize-y border border-[var(--admin-border)] bg-[var(--admin-input-bg)] px-4 py-3 text-[15px] text-[var(--admin-text)] placeholder:text-[var(--admin-muted)]/60 focus-visible:border-[var(--admin-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--admin-accent)]/30 disabled:opacity-40"
                  value={saleNote}
                  onChange={(e) => setSaleNote(e.target.value)}
                  disabled={!canEdit}
                  placeholder="Référence interne…"
                  maxLength={2000}
                />
              </label>

              {canEdit ? (
                <AdminButton type="button" onClick={submitSale} isLoading={submittingSale}>
                  Enregistrer la vente
                </AdminButton>
              ) : (
                <p className="text-sm text-[var(--admin-muted)]">Lecture seule : compte éditeur requis pour enregistrer.</p>
              )}
            </section>
          )}

          {tab === "comptabilite" && (
            <section id="caisse-panel-comptabilite" role="tabpanel" aria-labelledby="caisse-tab-comptabilite" className="space-y-8">
              {summary && (
                <div>
                  <h2 className="mb-4 text-base font-semibold text-[var(--admin-text)]">Indicateurs (toutes périodes)</h2>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {[
                      ["Chiffre d’affaires", `${summary.kpis.revenueEuros.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`, false],
                      ["Coût d’achat", `${summary.kpis.costEuros.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`, false],
                      ["Marge nette", `${summary.kpis.marginNetEuros.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`, true],
                      ["Taux de marge", `${(summary.kpis.marginRate * 100).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} %`, false],
                      ["Unités vendues", String(summary.kpis.unitsSold), false],
                      ["Nombre de ventes", String(summary.kpis.saleCount), false],
                    ].map(([label, val, accent]) => (
                      <div key={String(label)} className="border border-[var(--admin-border)] bg-[var(--admin-surface)] p-4">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--admin-muted)]">{label}</p>
                        <p className={`mt-2 text-xl font-semibold tabular-nums ${accent ? "text-[var(--admin-success)]" : "text-[var(--admin-text)]"}`}>
                          {val}
                        </p>
                      </div>
                    ))}
                  </div>
                  <p className="mt-3 text-[13px] text-[var(--admin-muted)]">
                    Commandes en attente : {summary.orders.pending} · Traitées : {summary.orders.fulfilled}
                  </p>
                </div>
              )}

              <div>
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-base font-semibold text-[var(--admin-text)]">Ventes enregistrées</h2>
                  <AdminButton type="button" variant="outline" size="sm" onClick={() => { loadSales(); loadSummary(); }} disabled={salesLoading}>
                    Actualiser
                  </AdminButton>
                </div>

                {salesLoading ? (
                  <div className="flex justify-center py-12 text-[var(--admin-muted)]">
                    <Loader2 className="h-6 w-6 animate-spin" aria-hidden />
                  </div>
                ) : sales.length === 0 ? (
                  <p className="border border-[var(--admin-border)] bg-[var(--admin-surface)] p-6 text-sm text-[var(--admin-muted)]">
                    Aucune vente. Utilisez l’onglet Enregistrement pour saisir une vente.
                  </p>
                ) : (
                  <ul className="space-y-4">
                    {sales.map((sale) => {
                      const t = saleTotals(sale);
                      return (
                        <li key={sale.id} className="border border-[var(--admin-border)] bg-[var(--admin-surface)] p-4">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-[var(--admin-text)]">
                                <time dateTime={sale.createdAt}>
                                  {new Date(sale.createdAt).toLocaleString("fr-FR", {
                                    dateStyle: "short",
                                    timeStyle: "short",
                                  })}
                                </time>
                              </p>
                              {sale.note && <p className="mt-1 text-[13px] text-[var(--admin-muted)]">{sale.note}</p>}
                            </div>
                            {canEdit && (
                              <button
                                type="button"
                                onClick={() => setDeleteSaleId(sale.id)}
                                className="flex min-h-[44px] min-w-[44px] items-center justify-center gap-2 border border-[var(--admin-border)] px-3 text-sm text-[var(--admin-danger)] transition-colors hover:bg-[rgba(224,122,122,0.1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--admin-accent)]"
                                aria-label="Supprimer cette vente"
                              >
                                <Trash2 className="h-4 w-4" aria-hidden />
                                <span className="hidden sm:inline">Supprimer</span>
                              </button>
                            )}
                          </div>
                          <ul className="mt-3 space-y-2 border-t border-[var(--admin-border)] pt-3">
                            {sale.lines.map((l) => {
                              const lt = lineTotals(l.buyPriceCents, l.sellPriceCents, l.quantity);
                              return (
                                <li key={l.id} className="text-[13px] text-[var(--admin-muted)]">
                                  <span className="font-medium text-[var(--admin-text)]">
                                    {l.perfume.brand.name} — {l.perfume.name}
                                  </span>
                                  <span className="text-[var(--admin-border)]"> · </span>
                                  {l.quantity} × {formatEuroFromCents(l.sellPriceCents)} €
                                  <span className="text-[var(--admin-border)]"> · </span>
                                  marge {formatEuroFromCents(lt.margin)} €
                                </li>
                              );
                            })}
                          </ul>
                          <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-1 border-t border-[var(--admin-border)] pt-3 text-[13px]">
                            <div>
                              <dt className="inline text-[var(--admin-muted)]">CA </dt>
                              <dd className="inline font-semibold text-[var(--admin-text)]">{formatEuroFromCents(t.revenue)} €</dd>
                            </div>
                            <div>
                              <dt className="inline text-[var(--admin-muted)]">Coût </dt>
                              <dd className="inline font-semibold text-[var(--admin-text)]">{formatEuroFromCents(t.cost)} €</dd>
                            </div>
                            <div>
                              <dt className="inline text-[var(--admin-muted)]">Marge </dt>
                              <dd className="inline font-semibold text-[var(--admin-success)]">{formatEuroFromCents(t.margin)} €</dd>
                            </div>
                          </dl>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </section>
          )}

          {tab === "commandes" && (
            <section id="caisse-panel-commandes" role="tabpanel" aria-labelledby="caisse-tab-commandes" className="space-y-8">
              <div>
                <h2 className="mb-4 text-base font-semibold text-[var(--admin-text)]">Nouvelle commande</h2>
                <div className="space-y-4 border border-[var(--admin-border)] bg-[var(--admin-surface)] p-4">
                  <AdminInput
                    label="Nom du client"
                    value={orderForm.customerName}
                    onChange={(e) => setOrderForm((f) => ({ ...f, customerName: e.target.value }))}
                    disabled={!canEdit}
                    placeholder="Prénom et nom"
                    autoComplete="name"
                  />
                  <label className="block">
                    <span className="mb-1.5 block text-[13px] font-medium text-[var(--admin-muted)]">Détail de la commande</span>
                    <textarea
                      className="min-h-[120px] w-full resize-y border border-[var(--admin-border)] bg-[var(--admin-input-bg)] px-4 py-3 text-[15px] text-[var(--admin-text)] placeholder:text-[var(--admin-muted)]/60 focus-visible:border-[var(--admin-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--admin-accent)]/30 disabled:opacity-40"
                      value={orderForm.details}
                      onChange={(e) => setOrderForm((f) => ({ ...f, details: e.target.value }))}
                      disabled={!canEdit}
                      placeholder="Parfums souhaités, quantités…"
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
                <h2 className="mb-4 text-base font-semibold text-[var(--admin-text)]">Liste des commandes</h2>
                <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Filtrer les commandes">
                  {(["ALL", "PENDING", "FULFILLED", "CANCELLED"] as const).map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setOrderFilter(f)}
                      className={`min-h-[44px] px-4 text-sm font-semibold transition-colors duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--admin-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--admin-bg)] ${
                        orderFilter === f
                          ? "border border-[var(--admin-accent)] bg-[var(--admin-elevated)] text-[var(--admin-text)]"
                          : "border border-[var(--admin-border)] bg-[var(--admin-surface)] text-[var(--admin-muted)] hover:text-[var(--admin-text)]"
                      }`}
                    >
                      {f === "ALL" ? "Toutes" : statusLabel[f]}
                    </button>
                  ))}
                </div>

                {ordersLoading ? (
                  <div className="flex justify-center py-12 text-[var(--admin-muted)]">
                    <Loader2 className="h-6 w-6 animate-spin" aria-hidden />
                  </div>
                ) : orders.length === 0 ? (
                  <p className="border border-[var(--admin-border)] bg-[var(--admin-surface)] p-6 text-sm text-[var(--admin-muted)]">
                    Aucune commande avec ce filtre.
                  </p>
                ) : (
                  <ul className="space-y-4">
                    {orders.map((o) => (
                      <li key={o.id} className="border border-[var(--admin-border)] bg-[var(--admin-surface)] p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold text-[var(--admin-text)]">{o.customerName}</p>
                            <p className="mt-1 text-[13px] text-[var(--admin-muted)]">
                              <time dateTime={o.createdAt}>
                                {new Date(o.createdAt).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}
                              </time>
                            </p>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            {canEdit ? (
                              <select
                                className="min-h-[44px] min-w-[160px] border border-[var(--admin-border)] bg-[var(--admin-input-bg)] px-3 text-sm text-[var(--admin-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--admin-accent)]"
                                value={o.status}
                                onChange={(e) => patchOrderStatus(o.id, e.target.value as CustomerOrderDto["status"])}
                                disabled={pendingOrderPatch.has(o.id)}
                                aria-label={`Statut pour ${o.customerName}`}
                              >
                                <option value="PENDING">{statusLabel.PENDING}</option>
                                <option value="FULFILLED">{statusLabel.FULFILLED}</option>
                                <option value="CANCELLED">{statusLabel.CANCELLED}</option>
                              </select>
                            ) : (
                              <span className="text-sm text-[var(--admin-muted)]">{statusLabel[o.status]}</span>
                            )}
                            {canEdit && (
                              <button
                                type="button"
                                onClick={() => setDeleteOrderId(o.id)}
                                className="flex h-11 w-11 items-center justify-center text-[var(--admin-muted)] hover:bg-[var(--admin-elevated)] hover:text-[var(--admin-danger)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--admin-accent)]"
                                aria-label={`Supprimer la commande de ${o.customerName}`}
                              >
                                <Trash2 className="h-4 w-4" aria-hidden />
                              </button>
                            )}
                          </div>
                        </div>
                        <p className="mt-3 whitespace-pre-wrap text-sm text-[var(--admin-text)]">{o.details}</p>
                        {o.note && (
                          <p className="mt-2 text-[13px] text-[var(--admin-muted)]">
                            <span className="font-medium text-[var(--admin-muted)]">Note :</span> {o.note}
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>
          )}
        </>
      )}

      {actionMsg && (
        <AdminToast type={actionMsg.type} message={actionMsg.text} onClose={() => setActionMsg(null)} />
      )}

      {deleteSaleId && (
        <div className="fixed inset-0 z-[150] flex items-end justify-center bg-[var(--admin-overlay)] backdrop-blur-sm sm:items-center sm:p-4">
          <div
            className="w-full max-h-[90dvh] overflow-y-auto border border-[var(--admin-border)] border-b-0 bg-[var(--admin-surface)] p-6 sm:max-w-sm sm:border-b"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-sale-title"
          >
            <h3 id="delete-sale-title" className="text-lg font-semibold text-[var(--admin-text)]">
              Supprimer cette vente ?
            </h3>
            <p className="mt-2 text-sm text-[var(--admin-muted)]">Cette action retire la vente de la comptabilité. Irréversible.</p>
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
        <div className="fixed inset-0 z-[150] flex items-end justify-center bg-[var(--admin-overlay)] backdrop-blur-sm sm:items-center sm:p-4">
          <div
            className="w-full max-h-[90dvh] overflow-y-auto border border-[var(--admin-border)] border-b-0 bg-[var(--admin-surface)] p-6 sm:max-w-sm sm:border-b"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-order-title"
          >
            <h3 id="delete-order-title" className="text-lg font-semibold text-[var(--admin-text)]">
              Supprimer cette commande ?
            </h3>
            <p className="mt-2 text-sm text-[var(--admin-muted)]">Irréversible.</p>
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
    </main>
  );
}

export function AdminCaisseDashboard() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40dvh] flex-col items-center justify-center gap-3 text-[var(--admin-muted)]">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--admin-accent)]" aria-hidden />
          <p className="text-sm font-medium">Chargement de la caisse…</p>
        </div>
      }
    >
      <InnerCaisse />
    </Suspense>
  );
}
