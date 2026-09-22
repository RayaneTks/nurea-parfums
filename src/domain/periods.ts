/**
 * Bornes calendaires en Europe/Paris, jumelles de `nurea_period_start` / `nurea_period_end`
 * (03 §5.1). Les chiffres calculent leurs bornes EN SQL ; ce module sert l'affichage,
 * la clé de cache du jour et les paramètres `ref=AAAA-MM-JJ` (04 §6.5).
 * `tests/db/periods.test.ts` confronte les deux implémentations.
 *
 * Interdits ici comme ailleurs : `setHours(0,0,0,0)` et `new Date(année, mois, 1)`, qui
 * dépendent du fuseau de la machine (bug 01 §4.6). Tout passe par l'heure murale de Paris.
 *
 * Un jour n'y dure pas toujours 24 h (23 h le 29 mars 2026, 25 h le 25 octobre 2026) :
 * on n'ajoute jamais de millisecondes, on avance le calendrier puis on reconvertit.
 * Minuit existe toujours et une seule fois à Paris (les changements d'heure ont lieu
 * à 2 h et 3 h), d'où une conversion heure murale → instant sans ambiguïté.
 */

export type PeriodUnit = "day" | "week" | "month" | "year";

export const PARIS_TIME_ZONE = "Europe/Paris";

/** Date du calendrier de Paris ; `month` de 1 à 12. */
type CivilDate = { year: number; month: number; day: number };

let wallClock: Intl.DateTimeFormat | undefined;

function parisWallClock(instant: Date) {
  // Construit à la demande : un moteur sans données de fuseau ne casse pas l'import du module.
  wallClock ??= new Intl.DateTimeFormat("en-US", {
    timeZone: PARIS_TIME_ZONE,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts = wallClock.formatToParts(instant);
  const get = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((p) => p.type === type)?.value);
  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour"),
    minute: get("minute"),
    second: get("second"),
  };
}

/** Écart heure de Paris − UTC à cet instant, en millisecondes (+1 h ou +2 h). */
function parisOffsetMs(instant: number): number {
  const w = parisWallClock(new Date(instant));
  const wallAsUtc = Date.UTC(w.year, w.month - 1, w.day, w.hour, w.minute, w.second);
  return wallAsUtc - Math.floor(instant / 1000) * 1000;
}

function civilDate(instant: Date): CivilDate {
  const w = parisWallClock(instant);
  return { year: w.year, month: w.month, day: w.day };
}

/** Normalise un débordement (jour 32, mois 13…) par le calendrier grégorien. */
function normalize(year: number, month: number, day: number): CivilDate {
  const d = new Date(Date.UTC(year, month - 1, day));
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
}

/** Instant de 00:00 à Paris ce jour-là. */
function parisMidnight(date: CivilDate): Date {
  const wall = Date.UTC(date.year, date.month - 1, date.day);
  const first = wall - parisOffsetMs(wall);
  const second = wall - parisOffsetMs(first);
  return new Date(second);
}

function truncate(unit: PeriodUnit, d: CivilDate): CivilDate {
  switch (unit) {
    case "day":
      return d;
    case "week": {
      // Semaine calendaire commençant le lundi (ISO, comme date_trunc('week')).
      const weekday = new Date(Date.UTC(d.year, d.month - 1, d.day)).getUTCDay(); // 0 = dimanche
      return normalize(d.year, d.month, d.day - ((weekday + 6) % 7));
    }
    case "month":
      return { year: d.year, month: d.month, day: 1 };
    case "year":
      return { year: d.year, month: 1, day: 1 };
    default: {
      const _exhaustive: never = unit;
      throw new Error(`Unité de période inconnue : ${_exhaustive as string}`);
    }
  }
}

function shift(unit: PeriodUnit, d: CivilDate, count: number): CivilDate {
  switch (unit) {
    case "day":
      return normalize(d.year, d.month, d.day + count);
    case "week":
      return normalize(d.year, d.month, d.day + 7 * count);
    case "month":
      return normalize(d.year, d.month + count, d.day);
    case "year":
      return normalize(d.year + count, d.month, d.day);
    default: {
      const _exhaustive: never = unit;
      throw new Error(`Unité de période inconnue : ${_exhaustive as string}`);
    }
  }
}

/** = `nurea_period_start(unit, ref)`. */
export function periodStart(unit: PeriodUnit, ref: Date = new Date()): Date {
  return parisMidnight(truncate(unit, civilDate(ref)));
}

/** = `nurea_period_end(unit, ref)` : début de la période suivante, borne exclue. */
export function periodEnd(unit: PeriodUnit, ref: Date = new Date()): Date {
  return parisMidnight(shift(unit, truncate(unit, civilDate(ref)), 1));
}

/**
 * Intervalle `[from, to[` de la période contenant `ref`, décalée de `offset` unités
 * (−1 = la précédente) : le navigateur « ‹ septembre 2026 › » de la Compta.
 */
export function periodBounds(
  unit: PeriodUnit,
  ref: Date = new Date(),
  offset = 0,
): { from: Date; to: Date } {
  if (!Number.isSafeInteger(offset)) throw new RangeError(`periodBounds: décalage entier attendu, reçu ${offset}`);
  const start = shift(unit, truncate(unit, civilDate(ref)), offset);
  return { from: parisMidnight(start), to: parisMidnight(shift(unit, start, 1)) };
}

const pad = (n: number, width = 2) => String(n).padStart(width, "0");

/** « 2026-09-17 » : le jour de Paris. Clé de cache quotidienne et valeur des paramètres `ref`, `jour`. */
export function parisDayKey(ref: Date = new Date()): string {
  const d = civilDate(ref);
  return `${pad(d.year, 4)}-${pad(d.month)}-${pad(d.day)}`;
}

/** Inverse de `parisDayKey` : 00:00 à Paris ce jour-là ; `null` pour une date inexistante (« 2026-02-30 »). */
export function parseParisDayKey(key: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);
  if (!m) return null;
  const date = { year: Number(m[1]), month: Number(m[2]), day: Number(m[3]) };
  const n = normalize(date.year, date.month, date.day);
  if (n.year !== date.year || n.month !== date.month || n.day !== date.day) return null;
  return parisMidnight(date);
}

/**
 * Jours calendaires de Paris entre deux instants (« depuis 42 j », 03 §5.8) :
 * 23 h 59 → 0 h 01 le lendemain compte 1 jour ; indépendant des changements d'heure.
 */
export function parisDaysBetween(from: Date, to: Date): number {
  const a = civilDate(from);
  const b = civilDate(to);
  return Math.round(
    (Date.UTC(b.year, b.month - 1, b.day) - Date.UTC(a.year, a.month - 1, a.day)) / 86_400_000,
  );
}

const MONTHS = [
  "janvier", "février", "mars", "avril", "mai", "juin",
  "juillet", "août", "septembre", "octobre", "novembre", "décembre",
] as const;
const WEEKDAYS = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"] as const;

/**
 * Libellé de la période contenant `ref` : « jeudi 17 septembre 2026 », « semaine du 14 septembre 2026 »,
 * « septembre 2026 », « 2026 ». Sans l'année : « Encaissé · septembre », « Aujourd'hui · jeudi 17 septembre ».
 * Noms écrits à la main plutôt que par Intl : même texte au rendu serveur et sur l'iPhone.
 */
export function periodLabel(unit: PeriodUnit, ref: Date = new Date(), o?: { withYear?: boolean }): string {
  const start = truncate(unit, civilDate(ref));
  const year = o?.withYear === false ? "" : ` ${start.year}`;
  const month = MONTHS[start.month - 1];
  switch (unit) {
    case "day": {
      const weekday = WEEKDAYS[new Date(Date.UTC(start.year, start.month - 1, start.day)).getUTCDay()];
      return `${weekday} ${start.day} ${month}${year}`;
    }
    case "week":
      return `semaine du ${start.day} ${month}${year}`;
    case "month":
      return `${month}${year}`;
    case "year":
      return String(start.year);
    default: {
      const _exhaustive: never = unit;
      throw new Error(`Unité de période inconnue : ${_exhaustive as string}`);
    }
  }
}
