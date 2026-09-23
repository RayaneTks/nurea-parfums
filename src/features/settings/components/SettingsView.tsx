"use client";

import { useState } from "react";
import { useConfirm } from "@/app-shell/FeedbackProvider";
import { useAction } from "@/app-shell/hooks/useAction";
import type { ActionResult } from "@/contracts/result";
import { RATE_MESSAGE, type SettingsSummary } from "@/contracts/settings";
import type { PocketSummary } from "@/contracts/treasury";
import { PocketOrderSheet } from "@/features/treasury/components/PocketOrderSheet";
import { logoutAction } from "@/server/auth/actions";
import { updateSettingsAction } from "@/server/settings/actions";
import { FormField } from "@/ui/patterns/FormField";
import { FormSection } from "@/ui/patterns/FormSection";
import { ModeDiscret } from "./ModeDiscret";
import { ListSection } from "@/ui/patterns/ListSection";
import { Money } from "@/ui/patterns/Money";
import { SelectSheet, type SelectOption } from "@/ui/patterns/SelectSheet";
import { Input } from "@/ui/primitives/Input";
import { Card } from "@/ui/primitives/Card";
import { ListRow } from "@/ui/primitives/ListRow";
import { Text } from "@/ui/primitives/Text";
import { canOrderPockets, defaultPocketLabel, rateToInputText, rateToStored, sameRate, selectablePockets } from "./settings-model";

type SettingsViewProps = {
  settings: SettingsSummary;
  /** Poches actives avec leur solde, dans l'ordre choisi (S21) ; « Non attribué » comprise. */
  pockets: readonly PocketSummary[];
  /** Identifiant du compte de la session (`AdminUser.username`). */
  username: string;
  /** Identifiant de build (`BUILD_ID`) : « local » hors Vercel. */
  version: string;
};

/**
 * E08 — Réglages (06 E08, N3) : cinq sections de rangées iOS, aucune option décorative. Chaque réglage
 * s'enregistre AU CHANGEMENT (optimiste, toast « Enregistré »), comme dans Réglages iOS : il n'y a donc
 * aucune action principale et aucun bouton « Enregistrer ». Un refus du serveur restaure la valeur
 * d'avant, et le toast de `useAction` en porte la raison (05 §5.1, erreur d'écriture).
 */
export function SettingsView({ settings, pockets, username, version }: SettingsViewProps) {
  const confirm = useConfirm();

  // Ce que l'écran affiche : la valeur du serveur, remplacée aussitôt par le choix du gérant (optimiste).
  const [pocketId, setPocketId] = useState(settings.defaultPocketId);
  const [rateText, setRateText] = useState(() => rateToInputText(settings.defaultExchangeRate));
  const [storedRate, setStoredRate] = useState(settings.defaultExchangeRate);
  const [rateError, setRateError] = useState<string | null>(null);
  const [pocketSheet, setPocketSheet] = useState(false);
  const [orderSheet, setOrderSheet] = useState(false);

  const save = useAction(updateSettingsAction, { success: "Enregistré" });

  const own = selectablePockets(pockets);
  const pocketLabel = defaultPocketLabel(pockets, pocketId);

  const choosePocket = async (next: string) => {
    const previous = pocketId;
    if (next === previous) return;
    setPocketId(next);
    const result = await save.run({ defaultPocketId: next });
    if (!result.ok) setPocketId(previous);
  };

  /** Le taux part quand on quitte le champ : on n'enregistre pas une valeur à moitié tapée. */
  const commitRate = async () => {
    if (sameRate(rateText, storedRate)) {
      setRateError(null);
      return;
    }
    if (rateToStored(rateText) === null) {
      setRateError(RATE_MESSAGE);
      return;
    }
    setRateError(null);
    const result = await save.run({ defaultExchangeRate: rateText });
    if (result.ok) {
      setStoredRate(result.data.defaultExchangeRate);
      setRateText(rateToInputText(result.data.defaultExchangeRate));
    } else {
      setRateText(rateToInputText(storedRate));
      setRateError(result.error.fields?.defaultExchangeRate ?? null);
    }
  };

  const askLogout = () => {
    void confirm(
      {
        title: "Se déconnecter ?",
        description: "Ton brouillon de vente reste sur cet appareil.",
        confirmLabel: "Se déconnecter",
        tone: "danger",
      },
      async () => {
        // `logoutAction` redirige vers E18 (04 §3.3) : en cas de succès Next navigue et l'appel ne rend
        // aucun résultat ; seul un refus en porte un, et son message s'affiche DANS la boîte (05 §3.2).
        const result = (await logoutAction()) as ActionResult<never> | undefined;
        if (result && !result.ok) throw new Error(result.error.message);
      },
    );
  };

  const pocketOptions: SelectOption[] = own.map((pocket) => ({
    value: pocket.id,
    label: pocket.name,
    trailing: <Money value={pocket.balance} tone="muted" />,
  }));

  return (
    <div className="flex flex-col gap-5" data-settings>
      <ListSection
        title="Encaissement"
        footer={
          <Text variant="caption" tone="muted" className="px-1 pt-1">
            Proposée partout ; elle change toute seule quand tu en choisis une autre.
          </Text>
        }
      >
        <ListRow
          primary="Poche par défaut"
          trailing={
            <Text as="span" variant="body" tone="muted">
              {pocketLabel}
            </Text>
          }
          chevron
          ariaLabel={`Poche par défaut : ${pocketLabel}`}
          onClick={() => setPocketSheet(true)}
        />
      </ListSection>

      <FormSection title="Achats">
        <FormField label="Taux DZD par défaut" error={rateError} hint="Proposé sur une ligne sans prix mémorisé.">
          {(field) => (
            <Input
              {...field}
              inputMode="decimal"
              numeric
              value={rateText}
              onChange={(event) => setRateText(event.target.value)}
              onBlur={() => void commitRate()}
              enterKeyHint="done"
              trailingSlot={
                <Text as="span" variant="caption" tone="muted" className="pr-3">
                  DA pour 1 €
                </Text>
              }
              className="pr-[88px]"
            />
          )}
        </FormField>
      </FormSection>

      {canOrderPockets(pockets) ? (
        <ListSection title="Poches">
          <ListRow primary="Ordre des poches" chevron onClick={() => setOrderSheet(true)} />
        </ListSection>
      ) : null}

      {/*
       * Montrer l'app sans montrer ce qu'elle contient (src/contracts/discretion.ts).
       *
       * Dans sa PROPRE carte, et non en enfant de la `ListSection` ci-dessous : une `ListSection`
       * ne pose sa marge que sur ses `ListRow`, si bien qu'un interrupteur nu y touchait les bords.
       * `Card padding={3}` autour d'un `Switch` est le motif déjà employé par la fiche parfum
       * (« Visible sur la vitrine ») — un interrupteur à description se pose ainsi partout.
       */}
      <Card padding={3}>
        <ModeDiscret />
      </Card>

      <ListSection title="Application">
        <ListRow
          primary="Version"
          trailing={
            <Text as="span" variant="body" tone="muted" className="tnum">
              {version}
            </Text>
          }
        />
        {/*
         * « Rechercher une mise à jour » est PRÉSENTE et INERTE : le geste se branche au jalon J16, avec le
         * service worker rendu et le toast « Nouvelle version · Recharger » (07 J16). Rangée verrouillée qui
         * dit pourquoi, jamais un contrôle muet qui ne fait rien (05 §3.1).
         */}
        <ListRow primary="Rechercher une mise à jour" secondary="L'app te prévient quand une version est prête." disabled />
      </ListSection>

      <ListSection title="Compte">
        <ListRow primary={`Connecté en tant que ${username}`} />
        <ListRow
          primary={<span className="admin-type-body block truncate font-medium text-[var(--admin-danger)]">Se déconnecter</span>}
          ariaLabel="Se déconnecter"
          onClick={askLogout}
        />
      </ListSection>

      {/* S07 variante poche (06 S07 « Zones — poche (Réglages) ») : poches actives, solde en légende. */}
      <SelectSheet
        open={pocketSheet}
        onOpenChange={setPocketSheet}
        title="Poche par défaut"
        options={pocketOptions}
        value={pocketId}
        onSelect={(next) => void choosePocket(next)}
        listAllBeforeSearch
        searchPlaceholder="Rechercher une poche"
        empty={{
          title: "Aucune poche rangée",
          description: "Crée une poche depuis la Trésorerie ; « Non attribué » reçoit tout en attendant.",
        }}
      />

      {orderSheet ? <PocketOrderSheet open={orderSheet} onClose={() => setOrderSheet(false)} pockets={pockets} /> : null}
    </div>
  );
}
