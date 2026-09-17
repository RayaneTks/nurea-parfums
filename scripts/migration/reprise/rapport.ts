/**
 * Rapport de reprise : `rapport.json` (machine, déterministe) et `rapport.md` (pour le gérant)
 * — docs/refonte/07-PLAN-EXECUTION.md §2.6, R1–R4 de 03-MODELE-DONNEES.md §7.8.
 *
 * Déterminisme : listes triées par identifiant, montants en chaînes à deux décimales ; tout ce qui
 * dépend de l'instant d'exécution est rangé dans `horodatages` (07 §1.6 B6 : le rapport de production
 * doit être identique à celui de la jumelle, hors horodatages).
 */
import { centimes, euros, eurosLisibles } from "../lib/argent";
import { parId } from "../lib/artefacts";
import type { Controle } from "../lib/controles";
import type { Reference } from "../lib/reference-format";
import { LISTES_R4, type Contexte, type ListeR4 } from "./contexte";
import type { ResultatAssertions } from "./3i-assertions";

export const FORMAT_RAPPORT = "nurea-rapport-reprise/1";

export type Statut = "dry-run" | "appliquée" | "échec" | "refusée";

export interface Rapport {
  format: typeof FORMAT_RAPPORT;
  statut: Statut;
  horodatages: { referenceCalculeeLe: string; repriseLe: string | null; hote: string };
  erreur: string | null;
  controles: Controle[];
  chiffres: {
    tresorerie: { avant: string; apres: string | null; nonAttribueAvant: string; nonAttribueApres: string | null };
    encaisse: {
      ancien: string;
      d0: string;
      d1: string;
      d2: string;
      attendu: string;
      nouveau: string | null;
      residu: string | null;
      perimetreAncienApres: string | null;
    };
    aEncaisser: { avant: string; apres: string | null; listeAncienne: string };
    margeNette: {
      ancienne: string;
      nouvelle: string | null;
      coutsAncien: string;
      coutsNouveau: string | null;
      depensesAncien: string;
      depensesNouveau: string | null;
    };
    encaisseMois: { moisAncien: string; ancien: string; moisNouveau: string | null; nouveau: string | null };
  };
  comptages: Record<string, number>;
  r3: {
    ecartsHistoriques: Record<string, unknown>[];
    creations: Record<string, unknown>[];
    compensations: { poche: string; nom: string | null; montant: string; decomposition: { motif: string; montant: string }[] }[];
  };
  r4: Record<ListeR4, Record<string, unknown>[]> & {
    contraintesQuiResterontNonValides: { contrainte: string; lignes: string[] }[];
  };
  mouvements: { id: string; categorie: string; motif: string }[];
  noms: {
    poches: Record<string, string>;
    documents: Record<string, string | null>;
    /** Client du document d'une ancienne pièce ('Sale:<id>', 'PaymentTransaction:<id>'). */
    origines: Record<string, string | null>;
  };
}

export function construireRapport(args: {
  statut: Statut;
  reference: Reference;
  ctx: Contexte | null;
  resultat: ResultatAssertions | null;
  erreur: string | null;
  noms: Rapport["noms"];
}): Rapport {
  const { reference, ctx, resultat, noms } = args;
  const m = reference.mesures;
  const nomPoche = (id: string) => noms.poches[id] ?? m.poches.find((p) => p.id === id)?.nom ?? null;

  const ecartsHistoriques: Record<string, unknown>[] = [];
  const creations: Record<string, unknown>[] = [];
  if (ctx) {
    for (const [id, c] of ctx.classements) {
      if (c.categorie !== "ecart") continue;
      const h = ctx.historiques.get(id);
      if (!h) continue;
      ecartsHistoriques.push({
        mouvement: id,
        source: "mouvement historique",
        poche: h.pocketId,
        pocheNom: nomPoche(h.pocketId),
        montant: h.montant,
        date: `${h.occurredAt}Z`,
        motif: c.motif,
        ancienLibelle: h.label,
        origine: h.refType ? `${h.refType}:${h.refId}` : null,
        client: h.refType ? (noms.origines[`${h.refType}:${h.refId}`] ?? null) : null,
      });
    }
    for (const cree of ctx.creations) {
      const estCompensation = cree.motif === "compensation";
      if (cree.motifCompensation === null && !estCompensation) {
        ecartsHistoriques.push({
          mouvement: cree.id,
          source: "scission d'un encaissement de vente",
          poche: cree.pocketId,
          pocheNom: nomPoche(cree.pocketId),
          montant: cree.montant,
          date: `${cree.occurredAt}Z`,
          motif: cree.motif,
          ancienLibelle: null,
          origine: `CashMovement:${cree.refId}`,
          client: cree.documentId ? (noms.documents[cree.documentId] ?? null) : null,
        });
      }
      creations.push({
        mouvement: cree.id,
        poche: cree.pocketId,
        pocheNom: nomPoche(cree.pocketId),
        montant: cree.montant,
        date: estCompensation ? "instant de la reprise" : `${cree.occurredAt}Z`,
        motif: cree.motif,
        document: cree.documentId,
        client: cree.documentId ? (noms.documents[cree.documentId] ?? null) : null,
        contrePasse: cree.reversesId,
      });
    }
  }

  const r4Base = Object.fromEntries(LISTES_R4.map((nom) => [nom, ctx ? ctx.r4[nom] : []])) as Record<
    ListeR4,
    Record<string, unknown>[]
  >;
  const idsLignes = (liste: Record<string, unknown>[]) => liste.map((l) => String(l.ligne)).sort();
  const contraintes = [
    { contrainte: "line_cost_ck", lignes: idsLignes(r4Base.coutsDzdSansTaux) },
    { contrainte: "line_gift_ck", lignes: idsLignes(r4Base.donsPrixNonNul) },
    { contrainte: "line_volume_ck", lignes: idsLignes(r4Base.volumesAtypiques) },
    ...[...new Set(r4Base.autresLignesHorsRegles.map((l) => String(l.regle)))].sort().map((regle) => ({
      contrainte: regle,
      lignes: idsLignes(r4Base.autresLignesHorsRegles.filter((l) => l.regle === regle)),
    })),
    ...[...new Set(r4Base.catalogueHorsRegles.map((l) => String(l.regle)))].sort().map((regle) => ({
      contrainte: regle,
      lignes: r4Base.catalogueHorsRegles.filter((l) => l.regle === regle).map((l) => String(l.id)).sort(),
    })),
  ].filter((c) => c.lignes.length > 0);

  const informatif = resultat?.informatif ?? null;
  const encaisseAttendu = euros(
    centimes(m.encaisse.ancien) - centimes(m.encaisse.d0) + centimes(m.encaisse.d1) + centimes(m.encaisse.d2),
  );

  return {
    format: FORMAT_RAPPORT,
    statut: args.statut,
    horodatages: {
      referenceCalculeeLe: reference.horodatages.calculeLe,
      repriseLe: ctx ? `${ctx.instant}Z` : null,
      hote: reference.horodatages.hote,
    },
    erreur: args.erreur,
    controles: ctx?.controles ?? [],
    chiffres: {
      tresorerie: {
        avant: m.tresorerie.totalNonArchivees,
        apres: resultat?.tresorerie.totalNonArchivees ?? null,
        nonAttribueAvant: m.tresorerie.nonAttribue,
        nonAttribueApres: resultat?.tresorerie.nonAttribue ?? null,
      },
      encaisse: {
        ancien: m.encaisse.ancien,
        d0: m.encaisse.d0,
        d1: m.encaisse.d1,
        d2: m.encaisse.d2,
        attendu: encaisseAttendu,
        nouveau: resultat?.encaisse.nouveau ?? null,
        residu: resultat ? euros(centimes(resultat.encaisse.nouveau) - centimes(encaisseAttendu)) : null,
        perimetreAncienApres: resultat?.encaisse.perimetreAncien ?? null,
      },
      aEncaisser: {
        avant: m.aEncaisser.ancien,
        apres: resultat?.encaisse.aEncaisser ?? null,
        listeAncienne: m.informatif.aEncaisserListeAncienne,
      },
      margeNette: {
        ancienne: m.informatif.margeNetteAncienne,
        nouvelle: informatif?.margeNette ?? null,
        coutsAncien: m.informatif.coutsAncien,
        coutsNouveau: informatif?.couts ?? null,
        depensesAncien: m.informatif.depensesAncien,
        depensesNouveau: informatif?.depenses ?? null,
      },
      encaisseMois: {
        moisAncien: m.informatif.mois,
        ancien: m.informatif.encaisseMoisAncien,
        moisNouveau: informatif?.mois ?? null,
        nouveau: informatif?.encaisseMois ?? null,
      },
    },
    comptages: resultat?.comptages ?? {},
    r3: {
      ecartsHistoriques: parId(ecartsHistoriques, (e) => String(e.mouvement)),
      creations: parId(creations, (c) => String(c.mouvement)),
      compensations: parId(ctx?.compensations ?? [], (c) => c.pocketId).map((c) => ({
        poche: c.pocketId,
        nom: nomPoche(c.pocketId),
        montant: c.montant,
        decomposition: c.decomposition,
      })),
    },
    r4: { ...r4Base, contraintesQuiResterontNonValides: contraintes },
    mouvements: ctx
      ? parId(
          [...ctx.classements.entries()].map(([id, c]) => ({ id, categorie: c.categorie, motif: c.motif })),
          (x) => x.id,
        )
      : [],
    noms,
  };
}

// ─── rapport.md ──────────────────────────────────────────────────────────────────────────────────────
const TITRES_R4: Record<ListeR4, string> = {
  ecartsAArbitrer: "Documents « écart à arbitrer » (reste dû remonté après coup : un remboursement de reprise a été créé)",
  horsCatalogueReconstituees: "Lignes « Hors catalogue » reconstituées (parfum supprimé, sans nom)",
  volumesAtypiques:
    "Contenances hors 10 / 50 / 80 ml (absente, ou héritée 30 / 100 non traduite) — à compléter avant tout geste sur la ligne",
  donsPrixNonNul: "Dons à prix non nul — mettre le prix à 0 € ou décocher « Offert » avant tout geste",
  coutsDzdSansTaux: "Coûts DZD sans taux — indiquer le taux avant tout geste",
  autresLignesHorsRegles: "Autres lignes hors des règles de ligne",
  catalogueHorsRegles: "Catalogue hors règles (contraintes qui resteront NOT VALID)",
  pairesCommandeNonLivree: "Commandes finalisées en vente sans être passées « Livrée » (date d'engagement reconstituée)",
  coutsEnrichis: "Coûts rendus aux lignes de vente depuis leur commande (perdus au passage commande → vente)",
  coutsInconnus: "Coûts inconnus (« coût à compléter »)",
  stocksPassesANull: "Stocks à 0 ou négatifs passés en « non suivi »",
  liensClientRecuperes: "Fiches client retrouvées depuis la commande",
  liensLotRecuperes: "Lots retrouvés depuis la commande",
  cachesAcompteDivergents: "Acomptes affichés par l'ancienne app différents des paiements enregistrés (information)",
  resteDuHorsBornes: "Restes dus hors bornes (négatifs ou supérieurs au total) — bornés",
  documentsSansClient: "Documents sans client (client de passage)",
  pochesSystemeFusionnees: "Poches « Non attribué » en double, fusionnées",
  pocheSystemeCreee: "Poche « Non attribué » créée",
  tauxDeChangeIllisible: "Taux de change par défaut illisible (277 retenu)",
};

function tableau(lignes: Record<string, unknown>[]): string {
  if (lignes.length === 0) return "_Aucune._\n";
  const colonnes = [...new Set(lignes.flatMap((l) => Object.keys(l)))];
  const cellule = (v: unknown) => (v === null || v === undefined ? "—" : String(v).replaceAll("|", "\\|").replaceAll("\n", " "));
  return [
    `| ${colonnes.join(" | ")} |`,
    `| ${colonnes.map(() => "---").join(" | ")} |`,
    ...lignes.map((l) => `| ${colonnes.map((c) => cellule(l[c])).join(" | ")} |`),
  ].join("\n") + "\n";
}

const lisible = (montant: string | null) => (montant === null ? "—" : eurosLisibles(montant));

export function rapportMarkdown(r: Rapport): string {
  const c = r.chiffres;
  const statut = {
    "dry-run": "Exécution à blanc : tout a été annulé à la fin, la base est inchangée.",
    appliquée: "Reprise appliquée et validée.",
    échec: "Reprise ANNULÉE : un contrôle a échoué ou une erreur est survenue, la base est inchangée.",
    refusée: "Reprise refusée avant de commencer.",
  }[r.statut];
  const rouges = r.controles.filter((x) => !x.ok);
  const out: string[] = [];
  out.push(`# Reprise des données — rapport\n`);
  out.push(`**${statut}**\n`);
  out.push(`Référence calculée le ${r.horodatages.referenceCalculeeLe} sur ${r.horodatages.hote}.\n`);
  if (r.erreur) out.push(`> Erreur : ${r.erreur}\n`);

  out.push(`## Les quatre chiffres, avant et après\n`);
  out.push(tableau([
    { chiffre: "Trésorerie (poches actives)", avant: lisible(c.tresorerie.avant), apres: lisible(c.tresorerie.apres) },
    { chiffre: "dont non attribué", avant: lisible(c.tresorerie.nonAttribueAvant), apres: lisible(c.tresorerie.nonAttribueApres) },
    { chiffre: "Encaissé depuis toujours", avant: lisible(c.encaisse.ancien), apres: lisible(c.encaisse.nouveau) },
    { chiffre: "À encaisser", avant: lisible(c.aEncaisser.avant), apres: lisible(c.aEncaisser.apres) },
    { chiffre: "Marge nette", avant: lisible(c.margeNette.ancienne), apres: lisible(c.margeNette.nouvelle) },
  ]));
  out.push(
    `- **Trésorerie** : chaque poche garde son solde au centime. Les écarts historiques restent dans la poche où l'app les montrait ; ` +
      `ils sont listés plus bas.`,
  );
  out.push(
    `- **Encaissé** (R1) : ${lisible(c.encaisse.ancien)} avant ; ` +
      `${lisible(euros(-centimes(c.encaisse.d0)))} de restes dus hors bornes ramenés dans [0 ; total] (D0) ; ` +
      `${lisible(c.encaisse.d1)} d'acomptes conservés sur des commandes en attente ou annulées, désormais comptés (D1) ; ` +
      `${lisible(c.encaisse.d2)} de trop-perçus sur des commandes confirmées ou livrées, désormais comptés (D2) ; ` +
      `soit ${lisible(c.encaisse.attendu)} attendu, ${lisible(c.encaisse.nouveau)} obtenu, résidu ${lisible(c.encaisse.residu)}.`,
  );
  out.push(
    `- **À encaisser** : même total, document par document. L'ancienne liste « À encaisser » affichait ` +
      `${lisible(c.aEncaisser.listeAncienne)} : la différence éventuelle vient des restes dus supérieurs au total, bornés.`,
  );
  out.push(
    `- **Marge nette** (R2, information) : coûts ${lisible(c.margeNette.coutsAncien)} → ${lisible(c.margeNette.coutsNouveau)} ` +
      `(coûts retrouvés sur les commandes finalisées) ; dépenses ${lisible(c.margeNette.depensesAncien)} → ` +
      `${lisible(c.margeNette.depensesNouveau)} ; l'Encaissé suit la définition ci-dessus.`,
  );
  out.push(
    `- **Encaissé du mois** (information) : ${lisible(c.encaisseMois.ancien)} (${c.encaisseMois.moisAncien}, ventes du mois) → ` +
      `${lisible(c.encaisseMois.nouveau)} (${c.encaisseMois.moisNouveau ?? "—"}, paiements datés du mois).\n`,
  );

  out.push(`## Contrôles\n`);
  out.push(tableau(r.controles.map((x) => ({ code: x.code, controle: x.libelle, resultat: x.ok ? "vert" : "ROUGE" }))));
  for (const rouge of rouges) {
    out.push(`### ${rouge.code} — ${rouge.libelle}\n`);
    out.push(tableau(rouge.ecarts));
  }

  out.push(`## Écarts historiques par poche (R3)\n`);
  out.push(
    `Mouvements dont l'origine n'est plus justifiable. Montant, poche et date sont inchangés : l'argent reste où l'app le montrait. ` +
      `Chacun apparaît au journal sous « Écart historique » et peut être annulé en un geste.\n`,
  );
  out.push(tableau(r.r3.ecartsHistoriques.map((e) => ({
    poche: e.pocheNom ?? e.poche,
    date: e.date,
    montant: lisible(String(e.montant)),
    motif: e.motif,
    client: e.client,
    "ancien libellé": e.ancienLibelle,
    origine: e.origine,
  }))));
  out.push(`### Compensation\n`);
  out.push(
    `Les paiements et dépenses qui n'avaient jamais touché la Trésorerie reçoivent leur mouvement (en « Non attribué ») ; ` +
      `une ligne « Reprise migration — compensation » ramène chaque poche au solde que tu connaissais. Si ton comptage réel ` +
      `contredit cette compensation, elle s'annule en un geste.\n`,
  );
  for (const comp of r.r3.compensations) {
    out.push(`**${comp.nom ?? comp.poche}** : compensation de ${lisible(comp.montant)}, qui annule :\n`);
    out.push(tableau(comp.decomposition.map((d) => ({ motif: d.motif, montant: lisible(d.montant) }))));
  }
  if (r.r3.compensations.length === 0) out.push(`_Aucune compensation._\n`);
  out.push(`### Mouvements créés par la reprise\n`);
  out.push(tableau(r.r3.creations.map((x) => ({
    poche: x.pocheNom ?? x.poche,
    date: x.date,
    montant: lisible(String(x.montant)),
    motif: x.motif,
    client: x.client,
    document: x.document,
  }))));

  out.push(`## Listes d'arbitrage (R4)\n`);
  for (const nom of LISTES_R4) {
    out.push(`### ${TITRES_R4[nom]}\n`);
    out.push(tableau(r.r4[nom]));
  }
  out.push(`### Contraintes qui resteront NOT VALID après le contract\n`);
  out.push(tableau(r.r4.contraintesQuiResterontNonValides.map((x) => ({ contrainte: x.contrainte, lignes: x.lignes.join(", ") }))));

  out.push(`## Comptages\n`);
  out.push(tableau(Object.entries(r.comptages).map(([k, v]) => ({ comptage: k, valeur: v }))));
  return `${out.join("\n")}\n`;
}
