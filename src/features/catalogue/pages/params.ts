import { PerfumeId } from "@/domain/ids";

/** Identifiant de parfum lu dans l'URL (`/admin/catalogue/parfums/12`) ; `null` : introuvable, pas une panne. */
export function parsePerfumeId(raw: string | string[] | undefined): number | null {
  const text = Array.isArray(raw) ? raw[0] : raw;
  if (!text || !/^\d{1,9}$/.test(text)) return null;
  const value = Number(text);
  return PerfumeId.safeParse(value) === null ? null : value;
}
