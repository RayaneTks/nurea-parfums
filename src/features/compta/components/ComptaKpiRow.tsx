"use client";

import { useState } from "react";
import Link from "next/link";
import { Card } from "@/ui/primitives/Card";
import { Money } from "@/ui/patterns/Money";
import { Sheet } from "@/ui/primitives/Sheet";
import { Stack } from "@/ui/primitives/Stack";
import { ChevronDown, ShoppingBag, Receipt } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ComptaListResult } from "@/server/sales/queries";
import type { OrderComptaRow } from "@/server/orders/financials";
import type { SaleRowLite } from "@/server/sales/queries";

type ComptaKpiRowProps = {
  summary: ComptaListResult["summary"];
  salesCashed?: string;
  ordersCashed?: string;
  /** Reste dû sur les ventes (clients qui doivent encore payer). */
  salesDue?: string;
  /** Reste dû sur les commandes confirmées (acomptes partiels). */
  ordersDue?: string;
  /** Listes pour le drill-down. */
  salesList: SaleRowLite[];
  ordersList: OrderComptaRow[];
};

export function ComptaKpiRow({
  summary,
  salesCashed,
  ordersCashed,
  salesDue,
  ordersDue,
  salesList,
  ordersList,
}: ComptaKpiRowProps) {
  const [breakdown, setBreakdown] = useState<"ca" | "due" | null>(null);
  const debt = Number(summary.outstandingRevenue ?? "0");
  const hasDebt = Number.isFinite(debt) && debt > 0;
  const expenses = Number(summary.totalExpenses ?? "0");
  const hasExpenses = Number.isFinite(expenses) && expenses > 0;
  const breakdownCashed =
    salesCashed && ordersCashed
      ? { sales: Number(salesCashed), orders: Number(ordersCashed) }
      : null;

  return (
    <>
      <div className="space-y-2 min-w-0">
        <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={() => setBreakdown("ca")}
            className="text-left tap-scale"
            aria-label="Détailler le CA"
          >
            <Card padding={3} tone="surface">
              <div className="flex items-center justify-between gap-1">
                <p className="text-[10px] sm:text-[11px] font-medium uppercase tracking-[0.04em] text-[var(--admin-text-subtle)]">
                  CA
                </p>
                <ChevronDown
                  size={12}
                  className="-rotate-90 text-[var(--admin-text-subtle)]"
                  aria-hidden
                />
              </div>
              <p className="mt-1 text-[16px] sm:text-[18px] font-bold leading-none">
                <Money value={summary.cashedRevenue} compact />
              </p>
              {breakdownCashed ? (
                <p className="mt-0.5 text-[10px] tabular-nums text-[var(--admin-text-subtle)]">
                  {breakdownCashed.sales.toFixed(0)} € ventes ·{" "}
                  {breakdownCashed.orders.toFixed(0)} € commandes
                </p>
              ) : null}
            </Card>
          </button>
          <Card padding={3} tone="surface">
            <p className="text-[10px] sm:text-[11px] font-medium uppercase tracking-[0.04em] text-[var(--admin-text-subtle)]">
              Marge
            </p>
            <p className="mt-1 text-[16px] sm:text-[18px] font-bold leading-none">
              <Money value={summary.netMargin} compact tone="auto" />
            </p>
            <p className="mt-0.5 text-[10px] sm:text-[11px] tabular-nums text-[var(--admin-text-subtle)]">
              {summary.marginPct}%{hasExpenses ? " · net dépenses" : ""}
            </p>
          </Card>
          <Card padding={3} tone="surface">
            <p className="text-[10px] sm:text-[11px] font-medium uppercase tracking-[0.04em] text-[var(--admin-text-subtle)]">
              Panier
            </p>
            <p className="mt-1 text-[16px] sm:text-[18px] font-bold leading-none">
              <Money value={summary.avgCashedValue} compact />
            </p>
            <p className="mt-0.5 text-[10px] sm:text-[11px] tabular-nums text-[var(--admin-text-subtle)]">
              {summary.salesCount} ventes
            </p>
          </Card>
        </div>
        {hasExpenses ? (
          <Card padding={3} tone="alt">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[12px] font-medium text-[var(--admin-text)]">
                Dépenses déduites
              </p>
              <span
                className="tnum whitespace-nowrap text-[16px] font-bold"
                style={{ color: "var(--admin-danger)" }}
              >
                −{expenses.toFixed(0)} €
              </span>
            </div>
          </Card>
        ) : null}
        {hasDebt ? (
          <button
            type="button"
            onClick={() => setBreakdown("due")}
            className="block w-full text-left tap-scale"
            aria-label="Détailler le reste à encaisser"
          >
            <Card padding={3} tone="alt">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[12px] font-medium text-[var(--admin-text)]">
                  Reste à encaisser
                </p>
                <span
                  className="tnum whitespace-nowrap text-[16px] font-bold"
                  style={{ color: "var(--admin-warning)" }}
                >
                  {debt.toFixed(0)} €
                </span>
              </div>
              {salesDue && ordersDue ? (
                <p className="mt-0.5 text-[11px] tabular-nums text-[var(--admin-text-subtle)]">
                  {Number(salesDue).toFixed(0)} € ventes ·{" "}
                  {Number(ordersDue).toFixed(0)} € commandes
                </p>
              ) : null}
            </Card>
          </button>
        ) : null}
      </div>

      <BreakdownSheet
        mode={breakdown}
        onClose={() => setBreakdown(null)}
        summary={summary}
        salesList={salesList}
        ordersList={ordersList}
      />
    </>
  );
}

function BreakdownSheet({
  mode,
  onClose,
  summary,
  salesList,
  ordersList,
}: {
  mode: "ca" | "due" | null;
  onClose: () => void;
  summary: ComptaListResult["summary"];
  salesList: SaleRowLite[];
  ordersList: OrderComptaRow[];
}) {
  if (mode === null) return null;
  const isDue = mode === "due";

  const sales = isDue
    ? salesList.filter((s) => Number(s.remainingDue) > 0.005)
    : salesList.filter((s) => Number(s.totalRevenue) - Number(s.remainingDue) > 0.005);
  const orders = isDue
    ? ordersList.filter((o) => Number(o.due) > 0.005)
    : ordersList.filter((o) => Number(o.cashed) > 0.005);

  const salesAmount = sales.reduce(
    (acc, s) =>
      acc + (isDue ? Number(s.remainingDue) : Number(s.totalRevenue) - Number(s.remainingDue)),
    0,
  );
  const ordersAmount = orders.reduce(
    (acc, o) => acc + (isDue ? Number(o.due) : Number(o.cashed)),
    0,
  );
  const total = salesAmount + ordersAmount;

  return (
    <Sheet
      open
      onOpenChange={(o) => (o ? null : onClose())}
      title={isDue ? "Reste à encaisser — détail" : "CA — détail"}
      description={
        isDue
          ? "Argent dû par les clients (acomptes manquants + ventes partiellement payées)."
          : "Tout l'argent réellement entré (ventes + acomptes/soldes sur commandes À traiter / Livrées)."
      }
    >
      <Stack gap={4}>
        <div
          className="rounded-[14px] p-3"
          style={{ background: "var(--admin-surface-alt)" }}
        >
          <p className="text-[11px] font-medium uppercase tracking-[0.04em] text-[var(--admin-text-subtle)]">
            Total
          </p>
          <p
            className={cn(
              "mt-1 text-[26px] font-bold leading-none tabular-nums",
              isDue ? "text-[var(--admin-warning)]" : "text-[var(--admin-text)]",
            )}
          >
            {total.toFixed(2).replace(".", ",")} €
          </p>
          <p className="mt-2 text-[12px] tabular-nums text-[var(--admin-text-subtle)]">
            {salesAmount.toFixed(0)} € ventes + {ordersAmount.toFixed(0)} € commandes
          </p>
        </div>

        <Section
          icon={<Receipt size={14} aria-hidden />}
          title={`Ventes (${sales.length})`}
          amount={salesAmount}
          empty={
            isDue
              ? "Toutes les ventes sont soldées."
              : "Aucune vente encaissée sur la période."
          }
        >
          {sales.map((s) => {
            const value = isDue
              ? Number(s.remainingDue)
              : Number(s.totalRevenue) - Number(s.remainingDue);
            return (
              <li key={s.id}>
                <Link
                  href={`/admin/compta?sale=${s.id}`}
                  prefetch={false}
                  onClick={onClose}
                  className="flex w-full items-center justify-between gap-3 py-2 tap-scale"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-[14px] font-medium text-[var(--admin-text)]">
                      {s.customerName ?? "Anonyme"}
                    </span>
                    <span className="block text-[11px] text-[var(--admin-text-subtle)]">
                      {new Date(s.soldAt).toLocaleDateString("fr-FR", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  </span>
                  <span
                    className={cn(
                      "tabular-nums text-[14px] font-semibold",
                      isDue ? "text-[var(--admin-warning)]" : "text-[var(--admin-text)]",
                    )}
                  >
                    {value.toFixed(2).replace(".", ",")} €
                  </span>
                </Link>
              </li>
            );
          })}
        </Section>

        <Section
          icon={<ShoppingBag size={14} aria-hidden />}
          title={`Commandes (${orders.length})`}
          amount={ordersAmount}
          empty={
            isDue
              ? "Toutes les commandes sont entièrement payées."
              : "Aucun acompte/solde encaissé sur les commandes."
          }
        >
          {orders.map((o) => {
            const value = isDue ? Number(o.due) : Number(o.cashed);
            return (
              <li key={o.id}>
                <Link
                  href={`/admin/ordres/${o.id}`}
                  prefetch={false}
                  onClick={onClose}
                  className="flex w-full items-center justify-between gap-3 py-2"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-[14px] font-medium text-[var(--admin-text)]">
                      {o.customerName}
                    </span>
                    <span className="block text-[11px] text-[var(--admin-text-subtle)]">
                      {o.status === "READY" ? "À traiter" : "Livrée"} ·{" "}
                      {new Date(o.orderedAt).toLocaleDateString("fr-FR", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}{" "}
                      · total {Number(o.total).toFixed(0)} €
                    </span>
                  </span>
                  <span
                    className={cn(
                      "tabular-nums text-[14px] font-semibold",
                      isDue ? "text-[var(--admin-warning)]" : "text-[var(--admin-text)]",
                    )}
                  >
                    {value.toFixed(2).replace(".", ",")} €
                  </span>
                </Link>
              </li>
            );
          })}
        </Section>
      </Stack>
    </Sheet>
  );
}

function Section({
  icon,
  title,
  amount,
  empty,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  amount: number;
  empty: string;
  children: React.ReactNode;
}) {
  const rows = Array.isArray(children) ? children : [children];
  const isEmpty = rows.length === 0;
  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-2 px-1">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.06em] text-[var(--admin-text-muted)]">
          {icon}
          {title}
        </span>
        <span className="tabular-nums text-[12px] font-semibold text-[var(--admin-text-muted)]">
          {amount.toFixed(0)} €
        </span>
      </div>
      {isEmpty ? (
        <p className="px-1 py-2 text-[12px] text-[var(--admin-text-subtle)]">{empty}</p>
      ) : (
        <ul
          className="divide-y px-1"
          style={{ borderColor: "var(--admin-border)" }}
        >
          {children}
        </ul>
      )}
    </div>
  );
}
