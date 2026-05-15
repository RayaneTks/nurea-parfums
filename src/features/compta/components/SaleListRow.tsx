"use client";

import { RelativeTime } from "@/ui/patterns/RelativeTime";
import { Money } from "@/ui/patterns/Money";
import { ListRow } from "@/ui/primitives/ListRow";
import type { SaleRowLite } from "@/server/sales/queries";

type SaleListRowProps = {
  sale: SaleRowLite;
  onOpen: (saleId: string) => void;
  /**
   * Affiche le nom client en primary (à utiliser dans un groupe Lot
   * où la date seule ne suffit pas à identifier la vente).
   */
  showCustomer?: boolean;
  /** Masque le tag « Commande » + batchName (utile en contexte Lot ou Client). */
  hideContextTags?: boolean;
};

export function SaleListRow({
  sale,
  onOpen,
  showCustomer = false,
  hideContextTags = false,
}: SaleListRowProps) {
  const remaining = Number(sale.remainingDue ?? "0");
  const hasDebt = Number.isFinite(remaining) && remaining > 0;

  const customer = sale.customerName?.trim() || "Anonyme";

  return (
    <ListRow
      onClick={() => onOpen(sale.id)}
      className={
        hasDebt
          ? "bg-[color-mix(in_srgb,var(--admin-danger-bg)_60%,transparent)]"
          : undefined
      }
      primary={
        <span className="flex items-center gap-1.5 text-[14px] font-medium text-[var(--admin-text)]">
          {showCustomer ? (
            <span className="truncate">{customer}</span>
          ) : (
            <RelativeTime date={sale.soldAt} />
          )}
          {hasDebt ? (
            <span
              className="shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
              style={{
                background: "var(--admin-warning-bg)",
                color: "var(--admin-warning)",
              }}
              aria-label={`Reste à payer ${remaining.toFixed(0)} euros`}
            >
              Reste {remaining.toFixed(0)} €
            </span>
          ) : null}
          {!hideContextTags && sale.batchName ? (
            <span
              className="shrink-0 truncate rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
              style={{
                background: "var(--admin-accent-bg)",
                color: "var(--admin-accent)",
                maxWidth: "120px",
              }}
              title={`Lot : ${sale.batchName}`}
            >
              {sale.batchName}
            </span>
          ) : null}
        </span>
      }
      secondary={
        <span className="text-[12px] text-[var(--admin-text-subtle)]">
          {showCustomer ? (
            <>
              <RelativeTime date={sale.soldAt} /> · {sale.itemCount} article
              {sale.itemCount > 1 ? "s" : ""}
            </>
          ) : (
            <>
              {sale.itemCount} article{sale.itemCount > 1 ? "s" : ""}
              {!hideContextTags && sale.orderId ? " · commande" : ""}
            </>
          )}
        </span>
      }
      trailing={
        <div className="text-right">
          <Money value={sale.totalRevenue} bold />
          <div className="text-[11px] mt-0.5">
            {hasDebt ? (
              <Money
                value={-Math.abs(Number(sale.totalMargin))}
                compact
                tone="danger"
              />
            ) : (
              <Money value={sale.totalMargin} compact signed tone="success" />
            )}
          </div>
        </div>
      }
      chevron
      ariaLabel={`Vente ${customer} du ${sale.soldAt}`}
    />
  );
}
