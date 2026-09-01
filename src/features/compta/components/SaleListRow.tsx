"use client";

import { RelativeTime } from "@/ui/patterns/RelativeTime";
import { Money } from "@/ui/patterns/Money";
import { ListRow } from "@/ui/primitives/ListRow";
import type { SaleRowLite } from "@/server/sales/queries";
import { formateEuros } from "@/ui/patterns/format";

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
              aria-label={`${formateEuros(remaining)} à encaisser`}
            >
              {formateEuros(remaining, { compact: true })} à encaisser
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
            {/*
              La marge garde son signe VRAI, même quand la vente n'est pas
              soldée.

              Elle s'affichait en `-Math.abs(...)` et en rouge dès qu'il
              restait un solde : une vente à +40 € de marge s'imprimait
              « −40 € », un nombre qui n'existe nulle part dans le modèle. Et
              une marge réellement négative — vendu sous le coût — sortait
              avec exactement le même texte et la même couleur : dans la
              liste, les deux cas devenaient indistinguables, et la colonne
              ne s'additionnait plus.

              Ce qui est en attente se dit par l'ambre, réservé à l'argent
              qu'on n'a pas encore reçu. Le rouge et le signe « − » restent
              disponibles pour la seule vraie perte.
            */}
            <Money
              value={sale.totalMargin}
              compact
              signed
              tone={hasDebt ? "warning" : "auto"}
            />
          </div>
        </div>
      }
      chevron
      ariaLabel={`Vente ${customer} du ${sale.soldAt}`}
    />
  );
}
