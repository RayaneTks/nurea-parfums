import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function formatMoney(value: number | string, locale = "fr-FR", currency = "EUR"): string {
  const n = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(n)) return "—";
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

export function formatDate(value: Date | string, locale = "fr-FR"): string {
  const d = typeof value === "string" ? new Date(value) : value;
  if (!(d instanceof Date) || Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(d);
}

export function formatTime(value: Date | string, locale = "fr-FR"): string {
  const d = typeof value === "string" ? new Date(value) : value;
  if (!(d instanceof Date) || Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export function formatDateTime(value: Date | string, locale = "fr-FR"): string {
  const d = typeof value === "string" ? new Date(value) : value;
  if (!(d instanceof Date) || Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export function relativeDayLabel(value: Date | string): string {
  const d = typeof value === "string" ? new Date(value) : value;
  if (!(d instanceof Date) || Number.isNaN(d.getTime())) return "—";
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.round((target.getTime() - start.getTime()) / 86_400_000);
  if (diffDays === 0) return "Aujourd'hui";
  if (diffDays === 1) return "Demain";
  if (diffDays === -1) return "Hier";
  if (diffDays > 1 && diffDays < 7) return `Dans ${diffDays} jours`;
  if (diffDays < -1 && diffDays > -7) return `Il y a ${-diffDays} jours`;
  return formatDate(d);
}
