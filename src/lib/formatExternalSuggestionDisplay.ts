import { normalizeForFuzzy } from "./data";
import type { ExternalPerfumeSuggestion } from "./perfumeSearchTypes";

const JUNK_TAIL =
  /\b(perfume|parfum|eau de parfum|eau de toilette|eau de cologne|edp|edt|edc|extrait)\b\.?$/gi;

function collapseSpaces(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

function stripTailNoise(s: string): string {
  let x = s;
  for (let i = 0; i < 3; i++) {
    const next = collapseSpaces(x.replace(JUNK_TAIL, ""));
    if (next === x) break;
    x = next;
  }
  return x;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Retire la marque du nom quand l’API renvoie une chaîne marketing redondante
 * (« … Zadig & Voltaire perfume » + brand séparé).
 */
function stripBrandFromName(name: string, brand: string): string {
  let n = stripTailNoise(name);
  const b = brand.trim();
  if (!b || b === "—") return n;

  n = collapseSpaces(n.replace(new RegExp(escapeRegExp(b), "gi"), " "));
  const tokens = b
    .split(/[\s&,/+]+/)
    .map((w) => w.trim())
    .filter((w) => w.length >= 3);
  for (const t of tokens) {
    n = collapseSpaces(n.replace(new RegExp(`\\b${escapeRegExp(t)}\\b`, "gi"), " "));
  }
  return stripTailNoise(n);
}

/**
 * Libellé court pour l’UI : plutôt la maison **ou** le nom du flacon, pas les deux concaténés en long.
 */
export function formatExternalSuggestionDisplay(
  s: ExternalPerfumeSuggestion,
  searchQuery: string
): string {
  const brandRaw = (s.brand ?? "").trim();
  const brand = brandRaw && brandRaw !== "—" ? brandRaw : "";
  const rawName = stripTailNoise((s.name ?? "").trim());
  const line = collapseSpaces(stripBrandFromName(rawName, brand)) || rawName;

  const nq = normalizeForFuzzy(searchQuery.trim());
  const nb = normalizeForFuzzy(brand);
  const nl = normalizeForFuzzy(line);

  if (nq.length >= 2) {
    if (brand && nb.length >= 2 && (nb.includes(nq) || nq.includes(nb))) {
      return brand;
    }
    if (nl.length >= 2 && (nl === nq || nl.includes(nq) || nq.includes(nl))) {
      return line;
    }
    const qFirst = nq.split(/\s+/).filter((t) => t.length >= 2)[0] ?? "";
    if (qFirst.length >= 3) {
      if (brand && nb.includes(qFirst)) return brand;
      if (nl.includes(qFirst)) return line;
    }
  }

  if (brand && line) {
    if (nl === nb || line.length === 0) return brand;
    if (line.length <= 48) return line;
    return brand;
  }

  return line || brand || rawName;
}
