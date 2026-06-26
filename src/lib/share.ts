import { SITE_NAME } from "@/lib/site";

type ShareItem = {
  name: string;
  brandName?: string | null;
  quantity: number;
  volumeMl: number;
  unitPrice: string | number;
  isGift?: boolean;
};

function eur(v: string | number): string {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return "0 €";
  return `${n % 1 === 0 ? n.toFixed(0) : n.toFixed(2)} €`;
}

function lineLabel(it: ShareItem): string {
  const brand = it.brandName ? ` ${it.brandName}` : "";
  const price = it.isGift ? "offert" : eur(Number(it.unitPrice) * it.quantity);
  return `• ${it.quantity}× ${it.name}${brand} (${it.volumeMl} ml) — ${price}`;
}

function frDate(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString("fr-FR");
}

/** Récap commande à partager au client (Snap/WhatsApp/SMS). */
export function buildOrderShareText(order: {
  customerName: string;
  items: ShareItem[];
  total: string | number;
  depositPaid: string | number;
  due: string | number;
  deliveryAt: string | null;
}): string {
  const lines: string[] = [`${SITE_NAME} — Commande`, ""];
  if (order.customerName && order.customerName !== "Anonyme") {
    lines.push(`Client : ${order.customerName}`, "");
  }
  for (const it of order.items) lines.push(lineLabel(it));
  lines.push("", `Total : ${eur(order.total)}`);
  if (Number(order.depositPaid) > 0) lines.push(`Acompte reçu : ${eur(order.depositPaid)}`);
  if (Number(order.due) > 0.005) lines.push(`Reste à régler : ${eur(order.due)}`);
  const dl = frDate(order.deliveryAt);
  if (dl) lines.push(`Livraison : ${dl}`);
  return lines.join("\n");
}

/** Reçu de vente à partager au client. */
export function buildSaleShareText(sale: {
  customerName?: string | null;
  items: ShareItem[];
  total: string | number;
  soldAt?: string | null;
}): string {
  const lines: string[] = [`${SITE_NAME} — Reçu`, ""];
  if (sale.customerName && sale.customerName !== "Anonyme") {
    lines.push(`Client : ${sale.customerName}`, "");
  }
  for (const it of sale.items) lines.push(lineLabel(it));
  lines.push("", `Total : ${eur(sale.total)}`);
  const d = frDate(sale.soldAt ?? null);
  if (d) lines.push(`Le ${d}`);
  lines.push("", "Merci !");
  return lines.join("\n");
}
