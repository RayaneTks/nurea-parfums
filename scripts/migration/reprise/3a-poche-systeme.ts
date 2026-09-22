/**
 * 3a — Poche système unique (docs/refonte/03-MODELE-DONNEES.md §7.7 « Poches système en double »).
 *
 * La plus ancienne poche `isSystem` est gardée (création, puis identifiant) ; les mouvements des autres
 * y sont rattachés, leurs soldes d'ouverture additionnés, les doublons supprimés. La référence de solde
 * est fusionnée de même par les contrôles, qui lisent la fusion dans `legacy."MigrationMap"`
 * (`('Pocket', doublon, 'Pocket', gardée)`). Sans poche système, « Non attribué » est créée
 * (solde de référence 0) : toutes les créations de la reprise y vont.
 */
import { lignes } from "../lib/base";
import { inscrireCorrespondances, type Contexte } from "./contexte";

export const ID_POCHE_SYSTEME_CREEE = "mig-poche-non-attribue";

export async function etape3aPocheSysteme(ctx: Contexte): Promise<void> {
  const poches = await lignes<{ id: string; name: string; kind: string; archived: boolean; soldeOuverture: string }>(
    ctx.tx,
    `SELECT id, name, kind::text AS kind, archived, "openingBalance"::text AS "soldeOuverture"
     FROM "Pocket" WHERE "isSystem" ORDER BY "createdAt", id COLLATE "C"`,
  );

  if (poches.length === 0) {
    await ctx.tx.$executeRawUnsafe(
      `INSERT INTO "Pocket" (id, name, kind, "openingBalance", archived, "isSystem", "sortOrder", "createdAt", "updatedAt")
       VALUES ($1, 'Non attribué', 'UNASSIGNED', 0, false, true, 999, $2::timestamp(3), $2::timestamp(3))`,
      ID_POCHE_SYSTEME_CREEE,
      ctx.instant,
    );
    ctx.pocheSysteme = ID_POCHE_SYSTEME_CREEE;
    ctx.r4.pocheSystemeCreee.push({ poche: ID_POCHE_SYSTEME_CREEE, nom: "Non attribué" });
    return;
  }

  const [gardee, ...doublons] = poches as [(typeof poches)[number], ...typeof poches];
  ctx.pocheSysteme = gardee.id;
  if (doublons.length === 0) return;

  const ids = doublons.map((p) => p.id);
  await ctx.tx.$executeRawUnsafe(
    `UPDATE "CashMovement" SET "pocketId" = $1 WHERE "pocketId" = ANY($2::text[])`,
    gardee.id,
    ids,
  );
  await ctx.tx.$executeRawUnsafe(
    `UPDATE "Pocket" SET "openingBalance" = "openingBalance"
       + (SELECT COALESCE(SUM("openingBalance"), 0) FROM "Pocket" WHERE id = ANY($2::text[]))
     WHERE id = $1`,
    gardee.id,
    ids,
  );
  const supprimees = await ctx.tx.$executeRawUnsafe(`DELETE FROM "Pocket" WHERE id = ANY($1::text[])`, ids);
  if (supprimees !== ids.length) throw new Error(`3a : ${supprimees} poches supprimées pour ${ids.length} doublons.`);

  await inscrireCorrespondances(
    ctx.tx,
    doublons.map((p) => ({ oldTable: "Pocket", oldId: p.id, newTable: "Pocket", newId: gardee.id, note: "poche système fusionnée" })),
  );
  for (const doublon of doublons) {
    ctx.r4.pochesSystemeFusionnees.push({
      poche: doublon.id,
      nom: doublon.name,
      soldeOuverture: doublon.soldeOuverture,
      fusionneeDans: gardee.id,
    });
  }
}
