"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAction } from "@/app-shell/hooks/useAction";
import { routes } from "@/app-shell/routes";
import { newId } from "@/domain/ids";
import { parisDayKey, parseParisDayKey } from "@/domain/periods";
import { createBatchAction } from "@/server/batches/actions";
import { useLeaveGuard } from "@/features/catalogue/components/useLeaveGuard";
import { CollapsibleSection } from "@/ui/patterns/CollapsibleSection";
import { FormField } from "@/ui/patterns/FormField";
import { Button } from "@/ui/primitives/Button";
import { Input } from "@/ui/primitives/Input";
import { StickyAction } from "@/ui/primitives/StickyAction";
import { Textarea } from "@/ui/primitives/Textarea";

/**
 * E21 — Nouveau lot (06 E21) : un nom, et c'est tout. La date d'arrivée et les notes sont repliées —
 * ouvrir un envoi doit prendre quelques secondes, pas remplir une fiche.
 *
 * L'identifiant est tiré à l'ouverture (04 §3.6) : un double tap, ou un renvoi après coupure de
 * réseau, rend le lot déjà créé au lieu d'en créer un second.
 */
export function NewBatchForm() {
  const router = useRouter();
  const [id] = useState(newId);
  const [name, setName] = useState("");
  const [expected, setExpected] = useState("");
  const [notes, setNotes] = useState("");

  const create = useAction(createBatchAction, {
    // Le lot créé s'ouvre : on vient de l'ouvrir pour y ranger quelque chose (06 E21).
    onSuccess: (batch) => router.replace(routes.lot(batch.id)),
  });

  const dirty = name.trim() !== "" || expected !== "" || notes.trim() !== "";
  useLeaveGuard(dirty && !create.pending);

  const fields = create.error?.fields ?? {};

  const submit = () =>
    void create.run({
      id,
      name: name.trim(),
      expectedAt: expected ? (parseParisDayKey(expected)?.toISOString() ?? null) : null,
      notes: notes.trim() || null,
    });

  return (
    <div className="flex flex-1 flex-col gap-4" data-new-batch>
      <FormField label="Nom du lot" required error={fields.name}>
        {(field) => (
          <Input
            {...field}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Commande d'octobre"
            autoComplete="off"
            enterKeyHint="done"
            onKeyDown={(e) => {
              if (e.key === "Enter") submit();
            }}
          />
        )}
      </FormField>

      <CollapsibleSection title="Arrivée prévue et notes" summary={expected ? "datée" : undefined}>
        <FormField label="Arrivée prévue" hint="Information seule : elle ne change aucun chiffre." error={fields.expectedAt}>
          {(field) => (
            <Input {...field} type="date" min={parisDayKey()} value={expected} onChange={(e) => setExpected(e.target.value)} />
          )}
        </FormField>
        <FormField label="Notes" error={fields.notes}>
          {(field) => <Textarea {...field} value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} maxLength={2000} />}
        </FormField>
      </CollapsibleSection>

      <StickyAction>
        <Button variant="primary" size="lg" fullWidth isLoading={create.pending} onClick={submit}>
          Créer le lot
        </Button>
      </StickyAction>
    </div>
  );
}
