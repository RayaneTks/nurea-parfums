import { PARIS_TIME_ZONE, parisDaysBetween } from "@/domain/periods";

/*
 * Dates à la française, à l'heure de Paris (05 §2.2, 06 §1.7).
 *
 * Noms écrits à la main plutôt que par `Intl` : le serveur (Node) et l'iPhone
 * (Safari) doivent produire les MÊMES caractères, sans quoi l'hydratation
 * échoue ; et les moteurs divergent sur les abréviations. Seule la conversion
 * de fuseau passe par `Intl`, sur des parties numériques.
 *
 * Minuscules : la capitale est portée par le contexte de phrase
 * (« mercredi 17 septembre », jamais « Mercredi 17 Septembre »). `capitalize`
 * ne met en capitale que la première lettre, pour un libellé qui ouvre une ligne.
 */

const MONTHS = [
  "janvier", "février", "mars", "avril", "mai", "juin",
  "juillet", "août", "septembre", "octobre", "novembre", "décembre",
] as const;
const MONTHS_SHORT = [
  "janv.", "févr.", "mars", "avr.", "mai", "juin",
  "juil.", "août", "sept.", "oct.", "nov.", "déc.",
] as const;
const WEEKDAYS = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"] as const;
const WEEKDAYS_SHORT = ["dim.", "lun.", "mar.", "mer.", "jeu.", "ven.", "sam."] as const;

/** Espace insécable : « 3 j », « 14 h 32 » ne se coupent pas en fin de ligne. */
const NBSP = " ";

type ParisParts = { year: number; month: number; day: number; weekday: number; hour: number; minute: number };

let wallClock: Intl.DateTimeFormat | undefined;

function parisParts(date: Date): ParisParts {
  wallClock ??= new Intl.DateTimeFormat("en-US", {
    timeZone: PARIS_TIME_ZONE,
    hourCycle: "h23",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
  });
  const parts = wallClock.formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((p) => p.type === type)?.value);
  const year = get("year");
  const month = get("month");
  const day = get("day");
  return {
    year,
    month,
    day,
    weekday: new Date(Date.UTC(year, month - 1, day)).getUTCDay(),
    hour: get("hour"),
    minute: get("minute"),
  };
}

export type DateFormat =
  /** « jeu. 17 sept. » — le défaut des listes. */
  | "day"
  /** « 17 sept. » */
  | "short"
  /** « jeudi 17 septembre » */
  | "long"
  /** « 17 septembre 2026 » — année toujours. */
  | "full"
  /** « 14 h 32 » */
  | "time"
  /** « 17 sept. · 14 h 32 » */
  | "datetime";

export function toDate(value: Date | string): Date | null {
  const d = typeof value === "string" ? new Date(value) : value;
  return Number.isNaN(d.getTime()) ? null : d;
}

export function capitalizeFirst(text: string): string {
  const [first = "", ...rest] = Array.from(text);
  return first.toLocaleUpperCase("fr-FR") + rest.join("");
}

function time(p: ParisParts): string {
  return `${p.hour}${NBSP}h${NBSP}${String(p.minute).padStart(2, "0")}`;
}

/**
 * Formate une date à l'heure de Paris. Hors format `full`, l'année n'apparaît
 * que si elle diffère de celle de `now` : « 3 août » cette année, « 3 août 2025 » sinon.
 */
export function formatDate(date: Date, format: DateFormat, now: Date = new Date()): string {
  const p = parisParts(date);
  const year = p.year !== parisParts(now).year ? ` ${p.year}` : "";
  const month = MONTHS[p.month - 1] ?? "";
  const monthShort = MONTHS_SHORT[p.month - 1] ?? "";
  switch (format) {
    case "short":
      return `${p.day} ${monthShort}${year}`;
    case "day":
      return `${WEEKDAYS_SHORT[p.weekday] ?? ""} ${p.day} ${monthShort}${year}`;
    case "long":
      return `${WEEKDAYS[p.weekday] ?? ""} ${p.day} ${month}${year}`;
    case "full":
      return `${p.day} ${month} ${p.year}`;
    case "time":
      return time(p);
    case "datetime":
      return `${p.day} ${monthShort}${year} · ${time(p)}`;
    default: {
      const exhaustive: never = format;
      throw new Error(`Format de date inconnu : ${exhaustive as string}`);
    }
  }
}

/**
 * Date relative sous 7 jours calendaires de Paris, absolue au-delà (05 §3.2) :
 * « aujourd'hui · 14 h 32 », « hier · 9 h 05 », « il y a 3 j », « demain »,
 * « dans 4 j », puis « jeu. 17 sept. ».
 */
export function formatRelative(date: Date, now: Date = new Date()): string {
  const days = parisDaysBetween(date, now);
  if (days === 0) return `aujourd'hui · ${time(parisParts(date))}`;
  if (days === 1) return `hier · ${time(parisParts(date))}`;
  if (days === -1) return "demain";
  if (days > 1 && days < 7) return `il y a ${days}${NBSP}j`;
  if (days < -1 && days > -7) return `dans ${-days}${NBSP}j`;
  return formatDate(date, "day", now);
}
