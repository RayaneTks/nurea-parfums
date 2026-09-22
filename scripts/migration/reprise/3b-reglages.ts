/**
 * 3b — Réglages (docs/refonte/03-MODELE-DONNEES.md §7.4, ligne `AppSetting`).
 *
 * `Setting` (id 1) : `defaultExchangeRate` = `AppSetting['exchangeRateDzdEur']` s'il est lisible
 * (virgule décimale acceptée, > 0, au plus 4 décimales, tient dans Decimal(10,4)), sinon 277 ;
 * `defaultPocketId` NULL.
 */
import { lignes } from "../lib/base";
import { inscrireCorrespondances, type Contexte } from "./contexte";

const TAUX_PAR_DEFAUT = "277";

export function lireTaux(valeur: string | null | undefined): string | null {
  if (valeur === null || valeur === undefined) return null;
  const normalise = valeur.trim().replace(",", ".");
  const match = /^(\d{1,6})(?:\.(\d{1,4}))?$/.exec(normalise);
  if (!match) return null;
  const texte = match[2] ? `${match[1]}.${match[2]}` : (match[1] as string);
  return /^0+(\.0+)?$/.test(texte) ? null : texte;
}

export async function etape3bReglages(ctx: Contexte): Promise<void> {
  const [ligne] = await lignes<{ key: string; value: string }>(
    ctx.tx,
    `SELECT key, value FROM "AppSetting" WHERE key = 'exchangeRateDzdEur'`,
  );
  const taux = lireTaux(ligne?.value);
  if (ligne && taux === null) {
    ctx.r4.tauxDeChangeIllisible.push({ cle: ligne.key, valeur: ligne.value, retenu: TAUX_PAR_DEFAUT });
  }
  await ctx.tx.$executeRawUnsafe(
    `INSERT INTO "Setting" (id, "defaultExchangeRate", "defaultPocketId", "updatedAt")
     VALUES (1, $1::numeric(10,4), NULL, $2::timestamp(3) AT TIME ZONE 'UTC')`,
    taux ?? TAUX_PAR_DEFAUT,
    ctx.instant,
  );
  if (ligne) {
    await inscrireCorrespondances(ctx.tx, [
      { oldTable: "AppSetting", oldId: ligne.key, newTable: "Setting", newId: "1", note: `taux retenu ${taux ?? TAUX_PAR_DEFAUT}` },
    ]);
  }
}
