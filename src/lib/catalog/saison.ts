/**
 * « Parfums du moment » de l'accueil : une sélection de saison, choisie à la main parmi les parfums
 * publiés (demande du gérant, 22/10/2026).
 *
 * Une sélection est un choix éditorial, pas un fait : on n'affiche ni note, ni famille olfactive, ni
 * promesse — seulement les parfums, leur titre de saison, et la fiche habituelle au toucher. Un
 * identifiant qui n'est plus publié est ignoré en silence ; sous `MIN_SELECTION` parfums trouvés, la
 * section ne s'affiche pas (l'aperçu sans base n'a qu'une partie du catalogue).
 *
 * Pour changer la sélection : modifier `ids` (ordre = ordre d'affichage). Hors des mois listés, aucune
 * section : on n'invente pas une saison qu'on n'a pas choisie.
 */

export interface Saison {
  /** Titre de la section. */
  titre: string;
  /** Fin du titre peinte en `--frost`, comme « Nuréa » en `--accent` dans la hero (doit y figurer). */
  motCle: string;
  /** Mois couverts, 1 = janvier (heure de Paris). */
  mois: readonly number[];
  /** Identifiants des parfums, dans l'ordre d'affichage. */
  ids: readonly number[];
}

export const SAISONS: readonly Saison[] = [
  {
    // Sobre, sans phrase dessous (gérant, 22/10/2026 : « notre sélection… »).
    titre: "Notre sélection pour les jours froids",
    motCle: "jours froids",
    mois: [10, 11, 12, 1, 2],
    // Classiques chauds de l'automne et de l'hiver (vanille, ambre, épices, cuir, oud), femme et homme alternés.
    ids: [
      56, // Tom Ford — Tobacco Vanille
      99, // Lancôme — La Nuit Trésor
      9, // Maison Francis Kurkdjian — Baccarat Rouge 540
      20, // Yves Saint Laurent — La Nuit de l'Homme
      436, // Kayali — Vanilla 28
      48, // Viktor & Rolf — Spicebomb
      284, // Dior — Hypnotic Poison
      483, // Parfums de Marly — Layton
      52, // Tom Ford — Black Orchid
      21, // Giorgio Armani — Stronger With You Intensely
      144, // Dior — Ambre Nuit
      35, // Maison Francis Kurkdjian — Grand Soir
      64, // Chanel — Coco Noir
      470, // Nasomatto — Black Afgano
      523, // Viktor & Rolf — Flowerbomb
      509, // Tom Ford — Ombre Leather
      97, // Tom Ford — Noir Extreme
      296, // Matière Première — Vanilla Powder
      453, // Lattafa — Khamrah Qahwa
      94, // Maison Francis Kurkdjian — Oud Satin Mood
    ],
  },
];

/** En dessous, la section se tait : une « sélection » de deux parfums n'en est pas une. */
export const MIN_SELECTION = 4;

/** Mois courant à Paris (1–12) : le serveur tourne en UTC, la saison se lit à l'heure du client. */
export function moisParis(date: Date = new Date()): number {
  return Number(new Intl.DateTimeFormat("fr-FR", { month: "numeric", timeZone: "Europe/Paris" }).format(date));
}

/** La saison du mois, avec ses parfums publiés dans l'ordre choisi ; `null` s'il n'y a rien à montrer. */
export function selectionDuMoment<P extends { id: number }>(
  perfumes: readonly P[],
  mois: number = moisParis(),
  saisons: readonly Saison[] = SAISONS
): { titre: string; motCle: string; perfumes: P[] } | null {
  const saison = saisons.find((s) => s.mois.includes(mois));
  if (!saison) return null;
  const byId = new Map(perfumes.map((p) => [p.id, p]));
  const found = saison.ids.flatMap((id) => {
    const perfume = byId.get(id);
    return perfume ? [perfume] : [];
  });
  return found.length >= MIN_SELECTION
    ? { titre: saison.titre, motCle: saison.motCle, perfumes: found }
    : null;
}
