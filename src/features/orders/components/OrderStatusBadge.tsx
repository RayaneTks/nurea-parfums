import { Badge } from "@/ui/primitives/Badge";
import type { OrderStatus } from "@prisma/client";

/*
 * Le vert veut dire « c'est fait », ici comme partout ailleurs.
 *
 * Il marquait « À traiter » — c'est-à-dire le travail qui RESTE — pendant que
 * « Livrée » était grise. Le sens était donc exactement inversé par rapport au
 * reste de l'app, où le vert dit « encaissé », « soldée », « payé ».
 *
 * L'ambre n'est pas repris pour « à traiter » : il est réservé à l'argent
 * qu'on n'a pas encore reçu, et le diluer sur des états de commande le viderait
 * de son sens dans les colonnes de montants. C'est le bordeaux qui marque
 * l'endroit où il y a du travail — la même couleur que les boutons d'action.
 */
const map: Record<
  OrderStatus,
  { label: string; tone: "accent" | "success" | "neutral" | "danger" }
> = {
  PENDING: { label: "En attente", tone: "neutral" },
  READY: { label: "À traiter", tone: "accent" },
  DELIVERED: { label: "Livrée", tone: "success" },
  CANCELLED: { label: "Annulée", tone: "danger" },
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const m = map[status];
  return (
    <Badge tone={m.tone} dot size="sm">
      {m.label}
    </Badge>
  );
}
