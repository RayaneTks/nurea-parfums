"use client";

import { Ban, Boxes } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { useAction } from "@/app-shell/hooks/useAction";
import type { BatchSummary } from "@/contracts/batches";
import { newId } from "@/domain/ids";
import { parseParisDayKey } from "@/domain/periods";
import { createBatchAction } from "@/server/batches/actions";
import { CollapsibleSection } from "@/ui/patterns/CollapsibleSection";
import { FormField } from "@/ui/patterns/FormField";
import { SelectSheet, type SelectCreateContext, type SelectOption } from "@/ui/patterns/SelectSheet";
import { formatDate } from "@/ui/patterns/date-format";
import { Button } from "@/ui/primitives/Button";
import { Card } from "@/ui/primitives/Card";
import { Input } from "@/ui/primitives/Input";
import { ListRow } from "@/ui/primitives/ListRow";

/** Valeur de la rangée « Sans lot ». */
const NO_BATCH = "__sans-lot__";

type BatchPickerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  batches: readonly BatchSummary[];
  value: string | null;
  /** `null` : « Sans lot » ; le nom accompagne le lot choisi ou créé en ligne. */
  onSelect: (batchId: string | null, name: string | null) => void;
  /** Ouvert depuis une autre sheet (fiche document, défaut) ; le composeur l'ouvre depuis la page. */
  nested?: boolean;
};

/**
 * S07 — Sélecteur de lot (06 S07) : « Sans lot », lots ouverts le plus récent en tête (« arrivée prévue 3 oct. »),
 * et S11 — « Nouveau lot » en ligne (le lot créé est posé sur le document).
 */
export function BatchPicker({ open, onOpenChange, batches, value, onSelect, nested = true }: BatchPickerProps) {
  // Lots créés en ligne (S11) : absents de `batches` jusqu'au rafraîchissement de l'écran.
  const created = useRef(new Map<string, string>());
  const options = useMemo<SelectOption[]>(
    () =>
      batches.map((batch) => ({
        value: batch.id,
        label: batch.name,
        description: batch.expectedAt ? `arrivée prévue ${formatDate(new Date(batch.expectedAt), "short")}` : undefined,
        leading: <Boxes size={20} aria-hidden className="text-[var(--admin-text-muted)]" />,
      })),
    [batches],
  );

  return (
    <SelectSheet
      open={open}
      onOpenChange={onOpenChange}
      nested={nested}
      title="Lot"
      options={options}
      value={value ?? NO_BATCH}
      onSelect={(next) =>
        next === NO_BATCH
          ? onSelect(null, null)
          : onSelect(next, batches.find((batch) => batch.id === next)?.name ?? created.current.get(next) ?? null)
      }
      listAllBeforeSearch
      searchPlaceholder="Chercher ou nommer un lot"
      header={
        <Card padding={0}>
          <ListRow
            leading={<Ban size={20} aria-hidden className="text-[var(--admin-text-muted)]" />}
            primary="Sans lot"
            onClick={() => {
              onSelect(null, null);
              onOpenChange(false);
            }}
          />
        </Card>
      }
      empty={{ title: (q) => (q ? `Aucun lot ouvert ne s'appelle « ${q} »` : "Aucun lot ouvert") }}
      onCreate={{
        label: (q) => (q ? `Nouveau lot « ${q} »` : "Nouveau lot"),
        form: (ctx) => <BatchCreateForm ctx={ctx} onCreated={(batch) => created.current.set(batch.id, batch.name)} />,
      }}
    />
  );
}

/** S11 — Création de lot en ligne : nom, arrivée prévue (repliée). */
function BatchCreateForm({ ctx, onCreated }: { ctx: SelectCreateContext<string>; onCreated: (batch: { id: string; name: string }) => void }) {
  const [id] = useState(newId);
  const [name, setName] = useState(ctx.query);
  const [expected, setExpected] = useState("");
  const create = useAction(createBatchAction, {
    onSuccess: (batch) => {
      onCreated(batch);
      ctx.select(batch.id);
    },
  });
  const fields = create.error?.fields ?? {};
  return (
    <div className="flex flex-col gap-4">
      <FormField label="Nom du lot" required error={fields.name}>
        {(field) => <Input {...field} value={name} onChange={(e) => setName(e.target.value)} autoComplete="off" enterKeyHint="done" />}
      </FormField>
      <CollapsibleSection title="Arrivée prévue" bare>
        <FormField label="Date d'arrivée prévue" error={fields.expectedAt}>
          {(field) => <Input {...field} type="date" value={expected} onChange={(e) => setExpected(e.target.value)} />}
        </FormField>
      </CollapsibleSection>
      <Button
        variant="primary"
        fullWidth
        isLoading={create.pending}
        onClick={() => void create.run({ id, name, expectedAt: expected ? parseParisDayKey(expected)?.toISOString() ?? null : null })}
      >
        Créer et choisir
      </Button>
      <Button variant="text" fullWidth onClick={ctx.cancel}>
        Revenir à la liste
      </Button>
    </div>
  );
}
