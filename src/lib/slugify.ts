import { normalizeForFuzzy } from "./data";

export function slugifySegment(s: string): string {
  const x = normalizeForFuzzy(s)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return x || "x";
}

export function brandSlug(name: string): string {
  return slugifySegment(name);
}
