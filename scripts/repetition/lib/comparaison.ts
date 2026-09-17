/**
 * Comparaison d'un rapport de reprise au précédent (docs/refonte/07-PLAN-EXECUTION.md §2.4, point 3) :
 * nouvelles lignes R3 (écarts historiques) et R4 (listes d'arbitrage), nouvelles catégories de mouvements,
 * évolution du résidu R1 et des compensations. Toute nouveauté est à expliquer dans la PR du jalon.
 */
import type { Rapport } from "../../migration/reprise/rapport";

type Entree = Record<string, unknown>;

function cle(entree: Entree): string {
  for (const champ of ["mouvement", "ligne", "document", "poche", "parfum", "cle", "contrainte", "id"]) {
    if (entree[champ] !== undefined && entree[champ] !== null) return String(entree[champ]);
  }
  return JSON.stringify(entree);
}

function difference(avant: Entree[], apres: Entree[]): { nouveaux: string[]; disparus: string[] } {
  const a = new Set(avant.map(cle));
  const b = new Set(apres.map(cle));
  return {
    nouveaux: [...b].filter((k) => !a.has(k)).sort(),
    disparus: [...a].filter((k) => !b.has(k)).sort(),
  };
}

export interface Comparaison {
  precedent: string;
  nouveautes: boolean;
  ecartsHistoriques: { nouveaux: string[]; disparus: string[] };
  r4: Record<string, { nouveaux: string[]; disparus: string[] }>;
  categories: { categorie: string; avant: number; apres: number }[];
  residu: { avant: string | null; apres: string | null };
  compensations: { poche: string; avant: string | null; apres: string | null }[];
}

export function comparerRapports(cheminPrecedent: string, precedent: Rapport, courant: Rapport): Comparaison {
  const ecartsHistoriques = difference(precedent.r3.ecartsHistoriques, courant.r3.ecartsHistoriques);

  const r4: Comparaison["r4"] = {};
  for (const nom of Object.keys(courant.r4).sort()) {
    const avant = (precedent.r4 as unknown as Record<string, Entree[]>)[nom] ?? [];
    const apres = (courant.r4 as unknown as Record<string, Entree[]>)[nom] ?? [];
    const diff = difference(avant, apres);
    if (diff.nouveaux.length > 0 || diff.disparus.length > 0) r4[nom] = diff;
  }

  const compter = (r: Rapport) => {
    const n = new Map<string, number>();
    for (const m of r.mouvements) n.set(`${m.categorie} : ${m.motif}`, (n.get(`${m.categorie} : ${m.motif}`) ?? 0) + 1);
    return n;
  };
  const avant = compter(precedent);
  const apres = compter(courant);
  const categories = [...new Set([...avant.keys(), ...apres.keys()])]
    .sort()
    .map((categorie) => ({ categorie, avant: avant.get(categorie) ?? 0, apres: apres.get(categorie) ?? 0 }))
    .filter((c) => c.avant !== c.apres);
  const nouvellesCategories = categories.filter((c) => c.avant === 0);

  const comp = (r: Rapport) => new Map(r.r3.compensations.map((c) => [c.poche, c.montant]));
  const compAvant = comp(precedent);
  const compApres = comp(courant);
  const compensations = [...new Set([...compAvant.keys(), ...compApres.keys()])]
    .sort()
    .map((poche) => ({ poche, avant: compAvant.get(poche) ?? null, apres: compApres.get(poche) ?? null }))
    .filter((c) => c.avant !== c.apres);

  const residu = { avant: precedent.chiffres.encaisse.residu, apres: courant.chiffres.encaisse.residu };
  return {
    precedent: cheminPrecedent,
    nouveautes:
      ecartsHistoriques.nouveaux.length > 0 ||
      Object.values(r4).some((d) => d.nouveaux.length > 0) ||
      nouvellesCategories.length > 0 ||
      residu.avant !== residu.apres,
    ecartsHistoriques,
    r4,
    categories,
    residu,
    compensations,
  };
}

export function comparaisonMarkdown(c: Comparaison): string {
  const out = [`# Comparaison au rapport précédent\n`, `Précédent : \`${c.precedent}\`\n`];
  out.push(c.nouveautes ? `**Nouveautés à expliquer dans la PR du jalon.**\n` : `Aucune nouveauté.\n`);
  out.push(`## Écarts historiques (R3)\n`);
  out.push(`- nouveaux : ${c.ecartsHistoriques.nouveaux.join(", ") || "aucun"}`);
  out.push(`- disparus : ${c.ecartsHistoriques.disparus.join(", ") || "aucun"}\n`);
  out.push(`## Listes d'arbitrage (R4)\n`);
  if (Object.keys(c.r4).length === 0) out.push(`Aucun changement.\n`);
  for (const [nom, d] of Object.entries(c.r4)) {
    out.push(`- **${nom}** : nouveaux ${d.nouveaux.join(", ") || "—"} ; disparus ${d.disparus.join(", ") || "—"}`);
  }
  out.push(`\n## Catégories de mouvements\n`);
  if (c.categories.length === 0) out.push(`Aucun changement.`);
  for (const x of c.categories) out.push(`- ${x.categorie} : ${x.avant} → ${x.apres}`);
  out.push(`\n## Résidu R1 et compensations\n`);
  out.push(`- résidu : ${c.residu.avant ?? "—"} → ${c.residu.apres ?? "—"}`);
  for (const x of c.compensations) out.push(`- compensation ${x.poche} : ${x.avant ?? "—"} → ${x.apres ?? "—"}`);
  return `${out.join("\n")}\n`;
}
