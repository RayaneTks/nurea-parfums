"use client";

import { useRef, useState } from "react";
import { useShellSheet } from "@/app-shell/SheetRegistry";
import { useAction } from "@/app-shell/hooks/useAction";
import type { ActionError } from "@/contracts/result";
import { POCKET_KINDS, type CreatablePocketKind, type PocketSummary } from "@/contracts/treasury";
import { newId } from "@/domain/ids";
import { useDiscardGuard } from "@/features/documents/components/useDiscardGuard";
import { createPocketAction } from "@/server/treasury/actions";
import { FormField } from "@/ui/patterns/FormField";
import { Button } from "@/ui/primitives/Button";
import { Chip } from "@/ui/primitives/Chip";
import { Input } from "@/ui/primitives/Input";
import { MoneyInput } from "@/ui/primitives/MoneyInput";
import { Sheet } from "@/ui/primitives/Sheet";
import { Switch } from "@/ui/primitives/Switch";
import { Text } from "@/ui/primitives/Text";
import { POCKET_KIND_LABELS, defaultOwnPocket, ownPockets, suggestedPocket } from "./treasury-model";

function fieldError(error: ActionError | null, field: string): string | undefined {
  return error?.fields?.[field];
}

/**
 * S16 — Nouvelle poche (06 S16) : « Espèces » ou « Banque » en 5 secondes — nom proposé selon ce qui existe déjà et
 * suivi du type tant qu'il n'a pas été retouché, solde d'ouverture à 0, « Proposer par défaut » activé s'il n'existe
 * aucune poche par défaut. Identifiant généré à l'ouverture : un renvoi rend la poche déjà créée (04 §3.6).
 */
export function NewPocketSheet({ open, onClose, pockets }: { open: boolean; onClose: () => void; pockets: readonly PocketSummary[] }) {
  const suggestion = suggestedPocket(ownPockets(pockets));
  const [id] = useState(newId);
  const [name, setName] = useState(suggestion.name);
  const [nameTouched, setNameTouched] = useState(false);
  const [kind, setKind] = useState<CreatablePocketKind>(suggestion.kind);
  const [opening, setOpening] = useState("");
  const initialDefault = defaultOwnPocket(pockets) === null;
  const [makeDefault, setMakeDefault] = useState(initialDefault);
  const nameRef = useRef<HTMLInputElement>(null);

  const dirty = nameTouched || kind !== suggestion.kind || opening.trim() !== "" || makeDefault !== initialDefault;
  const guard = useDiscardGuard(dirty);
  const requestClose = () => {
    void guard().then((ok) => ok && onClose());
  };
  useShellSheet(open, requestClose);

  const create = useAction(createPocketAction, {
    success: (pocket) => `Poche « ${pocket.name} » créée`,
    onSuccess: () => onClose(),
  });

  const [nameMissing, setNameMissing] = useState(false);
  const trimmed = name.trim();
  const submit = () => {
    if (trimmed.length < 2) {
      setNameMissing(true);
      nameRef.current?.focus();
      return;
    }
    void create.run({ id, name: trimmed, kind, openingBalance: opening.trim() === "" ? "0" : opening, makeDefault });
  };

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!next) requestClose();
      }}
      dismissible={!dirty && !create.pending}
      title="Nouvelle poche"
      size="auto"
    >
      <div className="flex flex-col gap-5" data-new-pocket-sheet>
        <FormField
          label="Nom de la poche"
          error={nameMissing && trimmed.length < 2 ? "Donne un nom à la poche (2 caractères au moins)." : fieldError(create.error, "name")}
        >
          {(field) => (
            <Input
              ref={nameRef}
              {...field}
              value={name}
              onChange={(event) => {
                setNameTouched(true);
                setName(event.target.value);
              }}
              maxLength={60}
              autoCapitalize="sentences"
              enterKeyHint="next"
            />
          )}
        </FormField>

        <div className="flex flex-col gap-2" role="group" aria-label="Type">
          <Text variant="caption" tone="muted" className="font-semibold">
            Type
          </Text>
          <div className="flex flex-wrap gap-2">
            {POCKET_KINDS.map((option) => (
              <Chip
                key={option}
                active={option === kind}
                onClick={() => {
                  setKind(option);
                  // Le nom suit le type tant qu'il n'a pas été retouché : « Banque » en un tap.
                  if (!nameTouched && (option === "CASH" || option === "BANK")) setName(POCKET_KIND_LABELS[option]);
                }}
              >
                {POCKET_KIND_LABELS[option]}
              </Chip>
            ))}
          </div>
        </div>

        <FormField label="Solde d'ouverture" hint="Ce que la poche contient aujourd'hui." error={fieldError(create.error, "openingBalance")}>
          {(field) => <MoneyInput {...field} value={opening} onChange={(next) => setOpening(next)} onSubmitAmount={submit} enterKeyHint="done" />}
        </FormField>

        <Switch
          checked={makeDefault}
          onCheckedChange={(next) => setMakeDefault(next)}
          label="Proposer par défaut"
          description="Elle sera pré-choisie pour les encaissements et les dépenses."
        />

        <Button variant="primary" size="lg" fullWidth isLoading={create.pending} onClick={submit} data-new-pocket-cta>
          Créer la poche
        </Button>
      </div>
    </Sheet>
  );
}
