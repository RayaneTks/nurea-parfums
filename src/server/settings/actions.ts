"use server";
import "server-only";
import { updateSettingsInput } from "@/contracts/settings";
import { defineAction } from "@/server/core/define-action";
import { inTransaction } from "@/server/db/transaction";
import * as settingsWriter from "@/server/settings/writer";

/** Réglages (E08, N3) : taux DZD par défaut, poche proposée par défaut. */
export const updateSettingsAction = defineAction("settings.update", updateSettingsInput, (input) =>
  inTransaction((tx) => settingsWriter.updateSettings(tx, input)),
);
