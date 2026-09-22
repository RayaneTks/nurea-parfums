"use client";

import { MoreHorizontal, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useConfirm } from "@/app-shell/FeedbackProvider";
import { useAction } from "@/app-shell/hooks/useAction";
import { useUrlState } from "@/app-shell/hooks/useUrlState";
import { routes } from "@/app-shell/routes";
import type { BatchDocumentRowDTO, BatchExpenseRowDTO, BatchSheetDTO } from "@/contracts/batches";
import type { PocketSummary } from "@/contracts/treasury";
import { eur, eurFromWire } from "@/domain/money";
import { parisDayKey, parseParisDayKey } from "@/domain/periods";
import {
  deleteBatchAction,
  deleteBatchExpenseAction,
  setBatchStatusAction,
  updateBatchAction,
} from "@/server/batches/actions";
import { assignDocumentsToBatchAction } from "@/server/documents/actions";
import { useDocumentSheetNavigation } from "@/features/documents/components/useDocumentSheetNavigation";
import { useTransientSheet } from "@/features/documents/components/useTransientSheet";
import { FormField } from "@/ui/patterns/FormField";
import { InlineNameEditor } from "@/ui/patterns/InlineNameEditor";
import { KpiTile } from "@/ui/patterns/KpiTile";
import { ListSection } from "@/ui/patterns/ListSection";
import { Money } from "@/ui/patterns/Money";
import { Avatar } from "@/ui/primitives/Avatar";
import { Button } from "@/ui/primitives/Button";
import { Card } from "@/ui/primitives/Card";

import { Input } from "@/ui/primitives/Input";
import { ListRow } from "@/ui/primitives/ListRow";
import { Sheet } from "@/ui/primitives/Sheet";
import { StickyAction } from "@/ui/primitives/StickyAction";
import { Text } from "@/ui/primitives/Text";
import { Textarea } from "@/ui/primitives/Textarea";
import {
  batchDocumentCaption,
  batchStatusLine,
  closeConfirmation,
  documentRowLabel,
  expenseCaption,
  expenseDeletionConfirmation,
  expenseMenuLabel,
  hasDue,
  reopenConfirmation,
  rowName,
} from "./batches-model";
import { ExpenseSheet } from "./ExpenseSheet";

/**
 * E06 — Fiche lot (06 E06) : la Marge nette RÉELLE d'un envoi, ce qui y est rattaché, ce qu'il a coûté.
 *
 * Les cinq tuiles sont TOUJOURS les cinq, même à zéro : la grille ne bouge pas d'un lot à l'autre, et
 * « Dépenses · 0 € » sur un lot qui n'en a pas encore est une information, pas du bruit — c'est la
 * ligne que la prochaine dépense va changer.
 *
 * Aucun chiffre n'est calculé ici : `figures` vient de `margeNette({ batchId })` et
 * `aEncaisser({ batchId })`. C'est ce qui empêche l'Encaissé du lot de chuter à la finalisation d'une
 * commande, comme il le faisait dans l'ancienne app (01 §4.4).
 */
export function BatchView({ data, pockets }: { data: BatchSheetDTO; pockets: readonly PocketSummary[] }) {
  const url = useUrlState();
  const router = useRouter();
  const confirm = useConfirm();
  const sheet = useDocumentSheetNavigation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [notes, setNotes] = useState(data.batch.notes ?? "");
  const expenseSheet = useTransientSheet<BatchExpenseRowDTO | null>();
  const expenseMenu = useTransientSheet<BatchExpenseRowDTO>();

  const update = useAction(updateBatchAction);
  const setStatus = useAction(setBatchStatusAction);
  const remove = useAction(deleteBatchAction);
  const removeExpense = useAction(deleteBatchExpenseAction);
  const detach = useAction(assignDocumentsToBatchAction, { success: "Retiré du lot" });

  const open = data.batch.status === "OPEN";
  const { figures } = data;
  const carriesDue = eur.compare(eurFromWire(figures.aEncaisser), eur.zero) > 0;

  const rename = async (next: string) => {
    const result = await update.run({ id: data.batch.id, name: next });
    return result.ok;
  };

  const setExpectedAt = (day: string) =>
    void update.run({ id: data.batch.id, expectedAt: day ? (parseParisDayKey(day)?.toISOString() ?? null) : null });

  const saveNotes = () => {
    if (notes.trim() === (data.batch.notes ?? "")) return;
    void update.run({ id: data.batch.id, notes: notes.trim() || null });
  };

  const toggleStatus = async () => {
    setMenuOpen(false);
    const texts = open ? closeConfirmation(data.batch.name) : reopenConfirmation(data.batch.name);
    const accepted = await confirm({
      ...texts,
      confirmLabel: open ? "Clôturer" : "Rouvrir",
      tone: "primary",
    });
    if (accepted) void setStatus.run({ id: data.batch.id, status: open ? "CLOSED" : "OPEN" });
  };

  const deleteBatch = async () => {
    setMenuOpen(false);
    const accepted = await confirm({
      title: `Supprimer « ${data.batch.name} » ?`,
      description: "Ce lot n'a ni document ni dépense : rien d'autre ne disparaît avec lui.",
      confirmLabel: "Supprimer",
      tone: "danger",
    });
    if (!accepted) return;
    const result = await remove.run({ id: data.batch.id });
    // Le lot n'existe plus : rester sur sa fiche afficherait « Ce lot n'existe plus ». On revient à la liste.
    if (result.ok) router.replace(routes.lots());
  };

  const onDeleteExpense = async (expense: BatchExpenseRowDTO) => {
    expenseMenu.hide();
    const texts = expenseDeletionConfirmation(expense);
    const accepted = await confirm({ ...texts, confirmLabel: "Supprimer", tone: "danger" });
    if (accepted) void removeExpense.run({ id: expense.id });
  };

  const onDetach = (row: BatchDocumentRowDTO) =>
    void detach.run({ changes: [{ documentId: row.id, from: data.batch.id, to: null }] });

  return (
    <div className="flex flex-1 flex-col gap-4" data-batch-view={data.batch.id}>
      {/* Zone 1 — identité : le nom se change là où il se lit. */}
      <header className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <InlineNameEditor
            value={data.batch.name}
            onSave={rename}
            variant="h1"
            // Le nom du lot EST le titre de l'écran : il en porte donc le niveau de titre (E06 zone 1).
            headingLevel={1}
            ariaLabel="Renommer le lot"
            minLength={2}
            maxLength={120}
          />
          <Text variant="caption" tone="muted" className="mt-0.5 block">
            {batchStatusLine(data.batch, data.createdAt)}
          </Text>
        </div>
        <Button variant="ghost" iconOnly ariaLabel="Plus d'actions" onClick={() => setMenuOpen(true)}>
          <MoreHorizontal size={20} />
        </Button>
      </header>

      {/* Zone 2 — les cinq tuiles, grille stable. */}
      <div className="grid grid-cols-2 gap-3" data-batch-tiles>
        <KpiTile label="Encaissé" amount={figures.encaisse} dominant className="col-span-2" />
        <KpiTile
          label="Marge nette"
          amount={figures.margeNette.value}
          hint={figures.margeNette.percent ? `${figures.margeNette.percent} % de l'Encaissé` : undefined}
        />
        {/* `warning` est le ton d'un montant NON REÇU : à zéro, il n'y a rien à signaler (05 §3.3). */}
        <KpiTile label="À encaisser" amount={figures.aEncaisser} tone={carriesDue ? "warning" : "default"} />
        <KpiTile
          label="Achat des parfums"
          amount={figures.margeNette.costs}
          hint={
            figures.margeNette.hasUnknownCost
              ? `${figures.margeNette.unknownCostCount} sans achat renseigné, comptés 0 €`
              : undefined
          }
        />
        <KpiTile label="Frais de lot" amount={figures.margeNette.expenses} />
      </div>

      {/* Zone 3 — tout ce qui est rattaché. */}
      <ListSection
        title="Documents"
        count={data.documentCount}
        action={
          open ? (
            <Button variant="text" size="sm" onClick={() => url.set({ assigner: true })}>
              Rattacher
            </Button>
          ) : null
        }
      >
        {data.documents.length === 0 ? (
          <ListRow primary="Aucun document rattaché" secondary={open ? "« Rattacher » en ajoute." : "Ce lot est clos."} />
        ) : (
          data.documents.map((row) => (
            <ListRow
              key={row.id}
              leading={<Avatar name={rowName(row)} size="md" />}
              primary={rowName(row)}
              secondary={batchDocumentCaption(row)}
              trailing={hasDue(row) ? <Money value={row.due} tone="warning" bold /> : <Money value={row.total} tone="muted" />}
              onClick={() => sheet.open(row.id)}
              ariaLabel={documentRowLabel(row)}
            />
          ))
        )}
      </ListSection>

      {/*
        Les annulés, repliés : sans eux, un document annulé restait rattaché, invisible et
        indétachable — et rendait le lot insupprimable sans qu'on puisse lire pourquoi (écart du 17/09/2026).
      */}
      {data.cancelled.length > 0 ? (
        <ListSection collapsible title="Annulés" count={data.cancelled.length}>
          {data.cancelled.map((row) => (
            <ListRow
              key={row.id}
              primary={rowName(row)}
              secondary={batchDocumentCaption(row)}
              trailing={
                open ? (
                  <Button variant="text" size="sm" onClick={() => onDetach(row)} ariaLabel={`Retirer ${documentRowLabel(row)} du lot`}>
                    Retirer
                  </Button>
                ) : (
                  <Money value={row.total} tone="muted" />
                )
              }
            />
          ))}
        </ListSection>
      ) : null}

      {/* Zone 4 — les dépenses. */}
      <ListSection title="Dépenses" count={data.expenses.length}>
        {data.expenses.length === 0 ? (
          <ListRow primary="Aucune dépense" secondary="Transport, douane, billet : « Ajouter une dépense »." />
        ) : (
          data.expenses.map((expense) => (
            <ListRow
              key={expense.id}
              primary={expense.label}
              secondary={expenseCaption(expense)}
              trailing={
                <span className="flex items-center gap-1">
                  <Money value={expense.amount} />
                  <Button variant="ghost" iconOnly ariaLabel={expenseMenuLabel(expense)} onClick={() => expenseMenu.show(expense)}>
                    <MoreHorizontal size={18} />
                  </Button>
                </span>
              }
            />
          ))
        )}
      </ListSection>

      {/* Zone 5 — arrivée prévue et notes : modifiables en place, enregistrées à la sortie du champ. */}
      <Card padding={3}>
        <div className="flex flex-col gap-4">
          <FormField label="Arrivée prévue" hint="Information seule : elle ne change aucun chiffre.">
            {(field) => (
              <Input
                {...field}
                type="date"
                value={data.batch.expectedAt ? parisDayKey(new Date(data.batch.expectedAt)) : ""}
                onChange={(e) => setExpectedAt(e.target.value)}
              />
            )}
          </FormField>
          <FormField label="Notes">
            {(field) => (
              <Textarea
                {...field}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                onBlur={saveNotes}
                rows={2}
                maxLength={2000}
              />
            )}
          </FormField>
        </div>
      </Card>

      {/* Action principale — sous le pouce, et sur un lot clos aussi : les dépenses tardives existent. */}
      <StickyAction>
        <Button variant="primary" size="lg" fullWidth leadingIcon={<Plus size={18} aria-hidden />} onClick={() => expenseSheet.show(null)}>
          Ajouter une dépense
        </Button>
      </StickyAction>

      {expenseSheet.open ? (
        <ExpenseSheet
          key={expenseSheet.key}
          open={expenseSheet.open}
          onClose={expenseSheet.hide}
          batchId={data.batch.id}
          batchName={data.batch.name}
          labels={data.expenseLabels}
          pockets={pockets}
          {...(expenseSheet.subject ? { expense: expenseSheet.subject } : {})}
        />
      ) : null}

      <Sheet
        open={expenseMenu.open}
        onOpenChange={(next) => (next ? undefined : expenseMenu.hide())}
        size="auto"
        title={expenseMenu.subject?.label ?? "Dépense"}
        description={expenseMenu.subject ? expenseCaption(expenseMenu.subject) : undefined}
      >
        <Card padding={0}>
          <ListRow
            primary="Modifier"
            onClick={() => {
              const expense = expenseMenu.subject;
              expenseMenu.hide();
              if (expense) expenseSheet.show(expense);
            }}
          />
          <ListRow
            primary={<span className="admin-type-body block font-medium text-[var(--admin-danger)]">Supprimer</span>}
            onClick={() => expenseMenu.subject && void onDeleteExpense(expenseMenu.subject)}
          />
        </Card>
      </Sheet>

      <Sheet
        open={menuOpen}
        onOpenChange={setMenuOpen}
        size="auto"
        title="Actions"
        description={data.batch.name}
      >
        <Card padding={0}>
          <ListRow primary={open ? "Clôturer le lot" : "Rouvrir le lot"} onClick={() => void toggleStatus()} />
          {data.deletionRefusal === null ? (
            <ListRow
              primary={<span className="admin-type-body block font-medium text-[var(--admin-danger)]">Supprimer le lot</span>}
              onClick={() => void deleteBatch()}
            />
          ) : (
            /* Entrée DÉSACTIVÉE qui porte sa raison, avec le décompte : le refus se lit avant d'être subi. */
            <ListRow primary="Supprimer le lot" secondary={data.deletionRefusal} disabled />
          )}
        </Card>
      </Sheet>

    </div>
  );
}
