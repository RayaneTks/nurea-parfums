/**
 * Libellés et décisions d'écran de la Trésorerie (06 E03 vue Trésorerie, E04, S14–S16, S21), purs et testés :
 * un mouvement a UN libellé partout (lexique 06 §1.7), un geste dit son effet complet (06 arbitrage n°9).
 */
import type { JournalEntry, PocketKind, PocketSummary } from "@/contracts/treasury";
import { eur, eurFromWire, formatEur, type Eur } from "@/domain/money";
import { parisDayKey } from "@/domain/periods";
import { formatDate } from "@/ui/patterns/date-format";

export const PASSING_CUSTOMER = "Client de passage";

/** Types de poche (06 S16 : chips « Espèces · Banque · Fournisseur · Autre »). */
export const POCKET_KIND_LABELS: Record<PocketKind, string> = {
  CASH: "Espèces",
  BANK: "Banque",
  SUPPLIER: "Fournisseur",
  OTHER: "Autre",
  UNASSIGNED: "Argent pas encore rangé",
};

/** « d'Espèces », « de Banque » : élision devant une voyelle ou un h muet. */
export function ofPocket(name: string): string {
  return /^[aeiouyhàâäéèêëîïôöùûüœæ]/i.test(name) ? `d'${name}` : `de ${name}`;
}

const money = (amount: Eur) => formatEur(amount);

const magnitude = (amount: Eur) => (eur.isNegative(amount) ? eur.neg(amount) : amount);

// ── Mouvements (06 §1.7) ───────────────────────────────────────────────────────

/**
 * Libellé d'un mouvement : « Paiement · Fares », « Dépense · Transport », « Paiement fournisseur »,
 * « Transfert vers Banque » / « Transfert depuis Espèces », « Ajustement ».
 */
export function movementLabel(entry: Pick<JournalEntry, "kind" | "amount" | "counterpartPocketName" | "payment" | "expense" | "label">): string {
  switch (entry.kind) {
    case "PAYMENT":
      return `Paiement · ${entry.payment?.customerName?.trim() ? entry.payment.customerName : PASSING_CUSTOMER}`;
    case "EXPENSE":
      return `Dépense · ${entry.expense?.label ?? entry.label ?? "lot"}`;
    case "SUPPLIER":
      return "Paiement fournisseur";
    case "TRANSFER": {
      const other = entry.counterpartPocketName ?? "une autre poche";
      return eur.isNegative(eurFromWire(entry.amount)) ? `Transfert vers ${other}` : `Transfert depuis ${other}`;
    }
    case "ADJUSTMENT":
      return "Ajustement";
    default: {
      const exhaustive: never = entry.kind;
      throw new Error(`Mouvement inconnu : ${exhaustive as string}`);
    }
  }
}

/**
 * Légende : « Espèces · 14 h 32 » dans le journal groupé par jour (E04), « Espèces · hier · 9 h 05 » à plat
 * (E03, S14) ; la raison d'un ajustement ou la note d'un transfert, d'un paiement fournisseur, en fin.
 */
export function movementCaption(
  entry: Pick<JournalEntry, "kind" | "pocketName" | "occurredAt" | "label">,
  options: { withDate: boolean; showPocket?: boolean },
  now: Date = new Date(),
): string {
  const date = new Date(entry.occurredAt);
  const when = options.withDate ? formatDate(date, "datetime", now) : formatDate(date, "time", now);
  const note = entry.kind === "ADJUSTMENT" || entry.kind === "SUPPLIER" || entry.kind === "TRANSFER" ? entry.label : null;
  return [options.showPocket === false ? null : entry.pocketName, when, note].filter(Boolean).join(" · ");
}

export type ReversibleKind = "TRANSFER" | "ADJUSTMENT" | "SUPPLIER";

/** Un mouvement manuel encore actif s'annule par T12 ; un paiement (T8) ou une dépense (T10) depuis leur pièce. */
export function canReverse<T extends Pick<JournalEntry, "kind" | "reversedById" | "reversesId">>(entry: T): entry is T & { kind: ReversibleKind } {
  return (entry.kind === "TRANSFER" || entry.kind === "ADJUSTMENT" || entry.kind === "SUPPLIER") && entry.reversedById === null && entry.reversesId === null;
}

/** Entrée du menu « … » (06 E04, PC-10). */
export function reverseActionLabel(kind: ReversibleKind): string {
  return kind === "TRANSFER" ? "Annuler le transfert" : kind === "ADJUSTMENT" ? "Annuler l'ajustement" : "Annuler le paiement fournisseur";
}

/** Confirmation qui dit l'effet (06 S18 « Annuler un mouvement manuel »). */
export function reverseConfirmation(entry: Pick<JournalEntry, "kind" | "pocketName"> & { kind: ReversibleKind }): {
  title: string;
  description: string;
  confirmLabel: string;
} {
  switch (entry.kind) {
    case "TRANSFER":
      return {
        title: "Annuler ce transfert ?",
        description: "Une écriture inverse est ajoutée à la même date sur les deux poches.",
        confirmLabel: "Annuler le transfert",
      };
    case "ADJUSTMENT":
      return {
        title: "Annuler cet ajustement ?",
        description: `Une écriture inverse est ajoutée à la même date dans ${entry.pocketName}.`,
        confirmLabel: "Annuler l'ajustement",
      };
    case "SUPPLIER":
      return {
        title: "Annuler ce paiement fournisseur ?",
        description: `Une écriture inverse est ajoutée à la même date dans ${entry.pocketName} : l'argent y revient.`,
        confirmLabel: "Annuler le paiement fournisseur",
      };
    default: {
      const exhaustive: never = entry.kind;
      throw new Error(`Mouvement inconnu : ${exhaustive as string}`);
    }
  }
}

/** Toast après l'annulation. */
export function reversedMessage(kind: ReversibleKind): string {
  return kind === "TRANSFER" ? "Transfert annulé" : kind === "ADJUSTMENT" ? "Ajustement annulé" : "Paiement fournisseur annulé";
}

export type JournalItem =
  | { type: "single"; entry: JournalEntry }
  /** Un mouvement contre-passé et sa contre-passation, repliés sous « Annulé » (06 §1.7, E04 zone 4). */
  | { type: "pair"; original: JournalEntry; reversal: JournalEntry };

/**
 * Replie chaque paire mouvement + contre-passation présente dans la liste ; la paire prend la place du premier
 * des deux dans l'ordre reçu. Une contre-passation dont l'original n'est pas dans la liste reste seule.
 */
export function journalItems(entries: readonly JournalEntry[]): JournalItem[] {
  const byId = new Map(entries.map((entry) => [entry.id, entry]));
  const used = new Set<string>();
  const items: JournalItem[] = [];
  for (const entry of entries) {
    if (used.has(entry.id)) continue;
    const original = entry.reversesId ? byId.get(entry.reversesId) : entry;
    const reversal = entry.reversesId ? entry : entry.reversedById ? byId.get(entry.reversedById) : undefined;
    if (original && reversal && original.id !== reversal.id && !used.has(original.id) && !used.has(reversal.id)) {
      used.add(original.id);
      used.add(reversal.id);
      items.push({ type: "pair", original, reversal });
      continue;
    }
    used.add(entry.id);
    items.push({ type: "single", entry });
  }
  return items;
}

const itemDate = (item: JournalItem) => (item.type === "pair" ? item.original.occurredAt : item.entry.occurredAt);

/** Groupes par jour de Paris, dans l'ordre reçu (E04 zone 4). */
export function groupByDay(items: readonly JournalItem[]): { day: string; items: JournalItem[] }[] {
  const groups: { day: string; items: JournalItem[] }[] = [];
  for (const item of items) {
    const day = parisDayKey(new Date(itemDate(item)));
    const last = groups.at(-1);
    if (last && last.day === day) last.items.push(item);
    else groups.push({ day, items: [item] });
  }
  return groups;
}

// ── Poches ─────────────────────────────────────────────────────────────────────

/** Poches rangées par le gérant (hors « Non attribué »). */
export const ownPockets = (pockets: readonly PocketSummary[]) => pockets.filter((pocket) => !pocket.isSystem);

export const systemPocket = (pockets: readonly PocketSummary[]) => pockets.find((pocket) => pocket.isSystem) ?? null;

/** La poche proposée par défaut parmi les poches rangées (N2). */
export const defaultOwnPocket = (pockets: readonly PocketSummary[]) => pockets.find((pocket) => pocket.isDefault && !pocket.isSystem) ?? null;

/**
 * Raison qui empêche d'archiver (06 S14), `null` si l'archivage est possible : « Non attribué » ne s'archive pas ;
 * une poche à solde non nul se vide d'abord.
 */
export function archiveBlockedReason(pocket: Pick<PocketSummary, "isSystem" | "balance">): string | null {
  if (pocket.isSystem) return "« Non attribué » reçoit ce qui n'est pas encore rangé : elle ne s'archive pas.";
  const balance = eurFromWire(pocket.balance);
  if (eur.isZero(balance)) return null;
  return eur.isNegative(balance)
    ? `Solde non nul : ramène d'abord le solde de ${money(balance)} à 0 €`
    : `Solde non nul : transfère d'abord ${money(balance)}`;
}

// ── Mouvement : Répartir, Transfert, Ajustement, Paiement fournisseur (S15) ───

export type MovementMode = "repartir" | "transfert" | "ajustement" | "fournisseur";

/** Libellé du CTA qui dit l'effet complet (06 S15). */
export function movementEffect(
  mode: MovementMode,
  amount: Eur,
  names: { from?: string | null; to?: string | null; pocket?: string | null; direction?: "in" | "out" },
): string {
  const shown = money(magnitude(amount));
  switch (mode) {
    case "repartir":
      return `Ranger ${shown} dans ${names.to ?? "une poche"}`;
    case "transfert":
      return `Transférer ${shown} vers ${names.to ?? "une poche"}`;
    case "ajustement":
      return names.direction === "in" ? `Ajouter ${shown} à ${names.pocket ?? "la poche"}` : `Retirer ${shown} ${ofPocket(names.pocket ?? "la poche")}`;
    case "fournisseur":
      return `Payer ${shown} depuis ${names.pocket ?? "la poche"}`;
    default: {
      const exhaustive: never = mode;
      throw new Error(`Mode inconnu : ${exhaustive as string}`);
    }
  }
}

/** Toast de succès d'un mouvement. */
export function movementDoneMessage(mode: MovementMode, amount: Eur, names: { to?: string | null; pocket?: string | null; direction?: "in" | "out" }): string {
  const shown = money(magnitude(amount));
  switch (mode) {
    case "repartir":
      return `${shown} rangés dans ${names.to ?? "la poche"}`;
    case "transfert":
      return `${shown} transférés vers ${names.to ?? "la poche"}`;
    case "ajustement":
      return names.direction === "in" ? `${shown} ajoutés à ${names.pocket ?? "la poche"}` : `${shown} retirés ${ofPocket(names.pocket ?? "la poche")}`;
    case "fournisseur":
      return `${shown} payés depuis ${names.pocket ?? "la poche"}`;
    default: {
      const exhaustive: never = mode;
      throw new Error(`Mode inconnu : ${exhaustive as string}`);
    }
  }
}

/** Plafond d'une sortie : « Non attribué » ne passe jamais sous zéro (03 T11) ; les autres poches, sous réserve. */
export function outgoingMax(pocket: Pick<PocketSummary, "isSystem" | "balance"> | null): Eur | undefined {
  if (!pocket?.isSystem) return undefined;
  return eur.clampZero(eurFromWire(pocket.balance));
}

/** Position d'une poche après « Monter » ou « Descendre » (S21), bornée à la liste. */
export function movedOrder<T>(items: readonly T[], index: number, delta: -1 | 1): T[] {
  const target = index + delta;
  if (index < 0 || index >= items.length || target < 0 || target >= items.length) return [...items];
  const next = [...items];
  const [moved] = next.splice(index, 1);
  next.splice(target, 0, moved as T);
  return next;
}

/** Le type d'une poche ne se répète pas en légende quand il redit son nom (« Espèces » de type Espèces). */
export function sameAsName(pocket: Pick<PocketSummary, "name" | "kind">): boolean {
  return pocket.name.trim().toLocaleLowerCase("fr-FR") === POCKET_KIND_LABELS[pocket.kind].toLocaleLowerCase("fr-FR");
}

/** « Espèces » ou « Banque » : le premier type courant qui n'a pas encore de poche à ce nom (S16 en 5 secondes). */
export function suggestedPocket(pockets: readonly Pick<PocketSummary, "name">[]): { name: string; kind: "CASH" | "BANK" | "OTHER" } {
  const taken = new Set(pockets.map((pocket) => pocket.name.trim().toLocaleLowerCase("fr-FR")));
  if (!taken.has("espèces")) return { name: "Espèces", kind: "CASH" };
  if (!taken.has("banque")) return { name: "Banque", kind: "BANK" };
  return { name: "", kind: "OTHER" };
}
