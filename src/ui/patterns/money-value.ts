import { eurFromWire, type Eur, type MoneyString } from "@/domain/money";

/**
 * Un montant tel qu'un composant le reçoit : `MoneyString` venu du serveur
 * (DTO, 04 §13.1), ou `Eur` calculé côté client (total du composeur).
 * `Eur` étant opaque, une chaîne est forcément une `MoneyString`.
 */
export type MoneyValue = Eur | MoneyString;

export function toEur(value: MoneyValue): Eur {
  return typeof value === "string" ? eurFromWire(value) : value;
}
