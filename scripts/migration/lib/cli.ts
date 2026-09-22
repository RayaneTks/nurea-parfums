/** Lecture des arguments des scripts de migration et de répétition (sans dépendance). */

export class ErreurUsage extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ErreurUsage";
  }
}

export interface Arguments {
  drapeaux: Set<string>;
  valeurs: Map<string, string>;
  positionnels: string[];
}

/**
 * `drapeaux` : options sans valeur (`--apply`) ; `valeurs` : options suivies d'une valeur
 * (`--reference <fichier>`). Toute autre option est refusée.
 */
export function lireArguments(
  argv: readonly string[],
  spec: { drapeaux?: readonly string[]; valeurs?: readonly string[]; positionnels?: number },
): Arguments {
  const drapeauxConnus = new Set(spec.drapeaux ?? []);
  const valeursConnues = new Set(spec.valeurs ?? []);
  const resultat: Arguments = { drapeaux: new Set(), valeurs: new Map(), positionnels: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i] as string;
    if (drapeauxConnus.has(arg)) {
      resultat.drapeaux.add(arg);
    } else if (valeursConnues.has(arg)) {
      const valeur = argv[i + 1];
      if (valeur === undefined || valeur.startsWith("--")) throw new ErreurUsage(`${arg} attend une valeur.`);
      resultat.valeurs.set(arg, valeur);
      i += 1;
    } else if (arg.startsWith("--")) {
      throw new ErreurUsage(`option inconnue : ${arg}`);
    } else {
      resultat.positionnels.push(arg);
    }
  }
  if (resultat.positionnels.length > (spec.positionnels ?? 0)) {
    throw new ErreurUsage(`argument en trop : ${resultat.positionnels.join(" ")}`);
  }
  return resultat;
}
