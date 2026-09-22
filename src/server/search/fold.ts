import "server-only";
import { Prisma } from "@prisma/client";

/**
 * Comparaison insensible à la casse ET aux accents, en SQL, sans l'extension `unaccent` (04 §15 règle 10) :
 * jumelle de `foldText` (`src/contracts/search.ts`), qui plie la saisie de la même façon.
 *
 * La production (`src/server/search/filters.ts`) ne dépliait que la saisie : « elysee » ne trouvait pas une
 * donnée « Élysée ». Ici la donnée est pliée aussi, lettre à lettre (`translate`) ; majuscules accentuées
 * comprises, parce que `lower()` d'une base en locale C ne descend que l'ASCII.
 */

const ACCENTED = "àáâãäåçèéêëìíîïñòóôõöùúûüýÿ";
const PLAIN = "aaaaaaceeeeiiiinooooouuuuyy";

const FROM = `${ACCENTED}${ACCENTED.toUpperCase()}`;
const TO = `${PLAIN}${PLAIN}`;

if (FROM.length !== TO.length) throw new Error("fold : tables de translittération de longueurs différentes.");

/** Expression SQL : le texte plié (minuscules, sans accents, « œ » → « oe »). */
export function foldSql(expression: Prisma.Sql): Prisma.Sql {
  return Prisma.sql`translate(replace(replace(replace(replace(lower(${expression}), 'œ', 'oe'), 'Œ', 'oe'), 'æ', 'ae'), 'Æ', 'ae'), ${FROM}::text, ${TO}::text)`;
}

/** Motif `LIKE` qui contient le terme tel quel (`%`, `_` et `\` échappés). À employer avec `ESCAPE '\'`. */
export function containsPattern(term: string): string {
  return `%${term.replace(/[\\%_]/g, (char) => `\\${char}`)}%`;
}
