import "server-only";
import type { SettingsSummary } from "@/contracts/settings";
import { rateFromDb, toDb } from "@/domain/money";
import { defineQuery } from "@/server/core/define-query";
import { db } from "@/server/db/client";

/**
 * Lecture des réglages pour les formulaires (E08, pré-remplissage de Vendre, S02, S12). Jamais mise en cache
 * inter-requêtes : un formulaire d'écriture lit la valeur du moment (04 §10.4). Mêmes valeurs par défaut que
 * `settings/writer.readSettings` quand la ligne n'existe pas encore.
 */
export const getSettings = defineQuery(async (): Promise<SettingsSummary> => {
  const row = await db.setting.findUnique({
    where: { id: 1 },
    select: { defaultExchangeRate: true, defaultPocketId: true },
  });
  return {
    defaultExchangeRate: toDb(rateFromDb(row?.defaultExchangeRate ?? "277")),
    defaultPocketId: row?.defaultPocketId ?? null,
  };
});
