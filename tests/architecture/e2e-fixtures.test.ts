import { describe, expect, it } from "vitest";
import { COMPTA_DOCS } from "../../e2e/fixtures/compta";
import { DOCS } from "../../e2e/fixtures/documents";

/**
 * Les identifiants du jeu e2e vivent dans UN espace partagé : `documents.ts` et `compta.ts` écrivent dans la
 * MÊME base, l'un après l'autre (`seedE2e`). Un doublon fait échouer `seedCompta` sur la contrainte d'unicité,
 * et alors AUCUN test de bout en bout ne démarre — l'échec ressemble à une panne d'environnement.
 *
 * C'est arrivé : J10 (fiches client) et J12 (Compta) avaient tous deux pris les numéros 40–43 dans leurs
 * branches respectives, et la collision n'est apparue qu'une fois les deux fusionnées. Ce test l'aurait dit
 * à la fusion, au lieu de la première exécution e2e de J14.
 *
 * Il vit dans le projet `arch` (aucune base, aucun navigateur) : il tourne à chaque `npm test`.
 */

describe("jeu e2e : identifiants sans doublon (07 J14)", () => {
  it("aucun identifiant de document n'est utilisé par deux jeux", () => {
    const entries = [
      ...Object.entries(DOCS).map(([name, id]) => [`documents.${name}`, id] as const),
      ...Object.entries(COMPTA_DOCS).map(([name, id]) => [`compta.${name}`, id] as const),
    ];
    const byId = new Map<string, string[]>();
    for (const [name, id] of entries) byId.set(id, [...(byId.get(id) ?? []), name]);
    const collisions = [...byId.entries()]
      .filter(([, names]) => names.length > 1)
      .map(([id, names]) => `${id} : ${names.join(" et ")}`);
    expect(collisions).toEqual([]);
  });

  it("la Compta tient les numéros 60 et au-delà, les documents restent en dessous", () => {
    const suffix = (id: string) => Number(id.split("-").at(-1));
    expect(Object.values(COMPTA_DOCS).every((id) => suffix(id) >= 60)).toBe(true);
    expect(Object.values(DOCS).every((id) => suffix(id) < 60)).toBe(true);
  });
});
