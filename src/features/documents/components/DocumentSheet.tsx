"use client";

import { Ban, Boxes, ChevronRight, MoreHorizontal, UserPlus } from "lucide-react";
import Link from "next/link";
import { useOptimistic, useState, useTransition } from "react";
import { isNavigable, routes } from "@/app-shell/routes";
import { useConfirm, useToast } from "@/app-shell/FeedbackProvider";
import { useShellNavigation } from "@/app-shell/ShellNavigation";
import { useUndo } from "@/app-shell/UndoProvider";
import { useAction } from "@/app-shell/hooks/useAction";
import { useUrlState } from "@/app-shell/hooks/useUrlState";
import type { BatchSummary } from "@/contracts/batches";
import type { DocumentSheetDTO, RecentlySoldDTO } from "@/contracts/documents";
import type { ActionError } from "@/contracts/result";
import type { PocketSummary } from "@/contracts/treasury";
import { reactivationTarget, type DocumentStatus } from "@/domain/document-status";
import { eur, eurFromWire, formatEur } from "@/domain/money";
import { parisDayKey, parseParisDayKey } from "@/domain/periods";
import { isVolumeMl } from "@/domain/sale-line";
import { assignDocumentsToBatchAction, changeDocumentStatusAction, deleteDocumentAction, updateDocumentAction } from "@/server/documents/actions";
import { voidPaymentAction } from "@/server/payments/actions";
import { InlineNameEditor } from "@/ui/patterns/InlineNameEditor";
import { ListSection } from "@/ui/patterns/ListSection";
import { Money } from "@/ui/patterns/Money";
import { shareOrCopy, ShareButton } from "@/ui/patterns/ShareButton";
import { formatDate } from "@/ui/patterns/date-format";
import { Avatar } from "@/ui/primitives/Avatar";
import { AttacherAuCatalogue } from "./AttacherAuCatalogue";
import { Badge } from "@/ui/primitives/Badge";
import { Button } from "@/ui/primitives/Button";
import { Card } from "@/ui/primitives/Card";
import { FormField } from "@/ui/patterns/FormField";
import { ListRow } from "@/ui/primitives/ListRow";
import { SegmentedControl } from "@/ui/primitives/SegmentedControl";
import { Sheet } from "@/ui/primitives/Sheet";
import { Text } from "@/ui/primitives/Text";
import { Textarea } from "@/ui/primitives/Textarea";
import { BatchPicker } from "./BatchPicker";
import { CancelSheet } from "./CancelSheet";
import { CollectSheet, type CollectTarget, type CollectVariant } from "./CollectSheet";
import { CorrectPaymentSheet } from "./CorrectPaymentSheet";
import { CustomerPicker } from "./CustomerPicker";
import { DeliveryChips } from "./DeliveryChips";
import { useCloseDocumentSheet, useSheetChrome } from "./DocumentSheetFrame";
import {
  Noun,
  PASSING_CUSTOMER,
  customerLabel,
  deliveredSummary,
  documentDescription,
  documentTitle,
  footerPlan,
  lineCaption,
  marginLabel,
  moneyView,
  noun,
  paymentRows,
  shareText,
  statusVerb,
  voidPaymentDescription,
  type PaymentRowView,
} from "./document-model";
import { LineDelivery } from "./LineDelivery";
import { LinesEditor, lineIssueOf, type LineIssue } from "./LinesEditor";
import { useDocumentSheetNavigation } from "./useDocumentSheetNavigation";
import { useGestureToast } from "./useGestureToast";
import { usePulse } from "./usePulse";
import { useTransientSheet } from "./useTransientSheet";

export type DocumentSheetProps = {
  doc: DocumentSheetDTO;
  pockets: readonly PocketSummary[];
  batches: readonly BatchSummary[];
  recent: readonly RecentlySoldDTO[];
  /** Version du sélecteur de ligne, pour `GET /api/admin/picker?v=` (04 §3.5). */
  pickerVersion: string;
};

/**
 * S01 — Fiche document (06 S01) : tout voir et tout faire sur une commande ou une vente, au-dessus de la liste
 * d'où l'on vient. Consultation (zones 1 à 6) ou édition en place des lignes (`edition=1`).
 */
export function DocumentSheet(props: DocumentSheetProps) {
  const { get } = useUrlState();
  const navigation = useDocumentSheetNavigation();
  const [issue, setIssue] = useState<LineIssue | null>(null);
  const editing = get("edition") === "1";

  const edit = (next: LineIssue | null = null) => {
    setIssue(next);
    navigation.setEdition(true);
  };

  if (editing) {
    return (
      <LinesEditor
        {...props}
        issue={issue}
        onDone={() => {
          setIssue(null);
          navigation.setEdition(false);
        }}
      />
    );
  }
  return <DocumentView {...props} onEdit={edit} />;
}

type DocumentViewProps = DocumentSheetProps & { onEdit: (issue?: LineIssue | null) => void };

function DocumentView({ doc, pockets, batches, pickerVersion, onEdit }: DocumentViewProps) {
  const { showToast } = useToast();
  const confirm = useConfirm();
  const { scheduleDelete } = useUndo();
  const { navigate } = useShellNavigation();
  const closeSheet = useCloseDocumentSheet();
  const collect = useTransientSheet<CollectVariant>();
  const cancel = useTransientSheet<"cancel" | "refund">();
  const correct = useTransientSheet<PaymentRowView>();
  const [menuOpen, setMenuOpen] = useState(false);
  const [paymentMenu, setPaymentMenu] = useState<PaymentRowView | null>(null);
  const [customerOpen, setCustomerOpen] = useState(false);
  const [batchOpen, setBatchOpen] = useState(false);

  const name = customerLabel(doc);
  const n = noun(doc.origin);
  const plan = footerPlan(doc);
  const title = documentTitle(doc.origin, doc.orderedAt);
  const target: CollectTarget = {
    id: doc.id,
    origin: doc.origin,
    status: doc.status,
    label: title,
    total: doc.balance.total,
    paid: doc.balance.paid,
    due: doc.balance.due,
  };

  const onValidation = (error: ActionError) => {
    const found = lineIssueOf(error);
    if (found) onEdit(found);
  };

  const update = useAction(updateDocumentAction, { onSuccess: () => undefined });
  const assign = useAction(assignDocumentsToBatchAction, { success: "Lot enregistré" });
  const voidPayment = useAction(voidPaymentAction, { success: "Paiement annulé" });
  const remove = useAction(deleteDocumentAction, { errors: "inline" });

  const passing = doc.customer === null;
  const hasPayments = doc.payments.length > 0;

  const titleNode = passing ? (
    <InlineNameEditor
      value={doc.customerName ?? ""}
      placeholder={PASSING_CUSTOMER}
      ariaLabel="Nom du client"
      variant="h3"
      minLength={2}
      maxLength={120}
      onSave={async (next) => {
        const result = await update.run({ documentId: doc.id, customer: { kind: "passing", name: next, contact: doc.customerContact } });
        if (!result.ok && result.error.code === "VALIDATION") {
          showToast({ type: "error", message: Object.values(result.error.fields ?? {})[0] ?? result.error.message });
        }
        return result.ok;
      }}
    />
  ) : doc.customer && isNavigable(routes.client(doc.customer.id)) ? (
    // Nom d'une fiche liée : sa fiche client (06 S01 zone 1, §1.3 — une navigation, l'onglet Clients).
    <Link
      href={routes.client(doc.customer.id)}
      className="admin-hit-target tap-scale inline-flex max-w-full items-center gap-1 rounded-[var(--admin-radius-md)] text-[var(--admin-accent)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--admin-accent-ring)]"
    >
      <span className="truncate">{name}</span>
      <ChevronRight size={16} aria-hidden className="shrink-0" />
    </Link>
  ) : (
    name
  );

  const primary = plan.primary ? (
    plan.primary.kind === "acompte" ? (
      <Button variant="primary" size="lg" fullWidth onClick={() => collect.show("acompte")}>
        Encaisser un acompte
      </Button>
    ) : plan.primary.kind === "solde" ? (
      <Button variant="primary" size="lg" fullWidth onClick={() => collect.show("solde")}>
        Encaisser {formatEur(eurFromWire(plan.primary.amount))}
      </Button>
    ) : (
      <Button variant="primary" size="lg" fullWidth onClick={() => cancel.show("refund")}>
        Rembourser {formatEur(eurFromWire(plan.primary.amount))}
      </Button>
    )
  ) : null;

  const shareLabel = plan.share === "recu" || doc.status === "DELIVERED" ? "Partager le reçu" : "Partager le récap";
  const sharePayload = { title: `${title} · ${name}`, text: shareText(doc, plan.share === "recu" || doc.status === "DELIVERED" ? "recu" : "recap") };
  const feedback = (message: string, type: "success" | "error") => showToast({ type, message });

  useSheetChrome({
    title: titleNode,
    description: documentDescription(doc),
    trailing: (
      <Button variant="ghost" iconOnly ariaLabel="Plus d'actions" onClick={() => setMenuOpen(true)}>
        <MoreHorizontal size={20} />
      </Button>
    ),
    footer:
      primary || plan.share ? (
        <div className="flex flex-col gap-2">
          {primary}
          {plan.share ? <ShareButton payload={sharePayload} label={shareLabel} fullWidth onFeedback={feedback} /> : null}
        </div>
      ) : undefined,
    dismissible: true,
  });

  const deleteDocument = async () => {
    setMenuOpen(false);
    const ok = await confirm({
      title: `Supprimer cette ${n} ?`,
      description: "Elle n'a aucun paiement. Tu pourras annuler pendant 5 secondes.",
      confirmLabel: "Supprimer",
      tone: "danger",
    });
    if (!ok) return;
    closeSheet();
    scheduleDelete({
      message: `${Noun(doc.origin)} supprimée`,
      errorMessage: `La ${n} n'a pas pu être supprimée. Réessaie depuis sa fiche.`,
      onCommit: async () => {
        const result = await remove.run({ documentId: doc.id });
        if (!result.ok) throw new Error(result.error.message);
      },
    });
  };

  const confirmVoid = async (row: PaymentRowView) => {
    setPaymentMenu(null);
    const amount = formatEur(eur.isNegative(eurFromWire(row.payment.amount)) ? eur.neg(eurFromWire(row.payment.amount)) : eurFromWire(row.payment.amount));
    const refund = row.payment.kind === "REFUND";
    await confirm(
      {
        title: refund ? `Annuler ce remboursement de ${amount} ?` : `Annuler ce paiement de ${amount} ?`,
        description: voidPaymentDescription(doc, row.payment),
        confirmLabel: refund ? "Annuler le remboursement" : "Annuler le paiement",
        cancelLabel: "Garder",
        tone: "danger",
      },
      async () => {
        const result = await voidPayment.run({ paymentId: row.payment.id });
        if (!result.ok) throw new Error(result.error.message);
      },
    );
  };

  const rows = paymentRows(doc.payments, doc.origin);
  const delivered = deliveredSummary(doc.lines);
  const trackDelivery = doc.origin === "ORDER" && doc.status !== "CANCELLED";

  return (
    <div className="flex flex-col gap-5 pb-2" data-document-sheet={doc.id}>
      {doc.status === "CANCELLED" ? (
        <CancelledBanner doc={doc} onValidation={onValidation} />
      ) : doc.origin === "ORDER" ? (
        <StatusControl
          doc={doc}
          allDelivered={delivered.quantity > 0 && delivered.delivered === delivered.quantity}
          onDeliverWithDue={() => collect.show("livrer")}
          onValidation={onValidation}
        />
      ) : null}

      <MoneyZone doc={doc} />

      <ListSection
        title={trackDelivery ? `Articles · Livré ${delivered.delivered}/${delivered.quantity}` : "Articles"}
        action={
          <Button variant="text" size="sm" onClick={() => onEdit()}>
            Modifier
          </Button>
        }
      >
        {doc.lines.map((line) => (
          <div key={line.id} className="flex flex-col gap-2 px-3 py-3" data-line={line.id}>
            <div className="flex items-start gap-3">
              <Avatar name={line.perfumeName} src={line.imageUrl} size="md" />
              <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="admin-type-body min-w-0 truncate font-medium text-[var(--admin-text)]">{line.perfumeName}</span>
                  {line.isGift ? (
                    <Badge tone="accent">Offert</Badge>
                  ) : line.isOffCatalog ? (
                    <>
                      <Badge>Hors catalogue</Badge>
                      {/* Le parfum a pu entrer au catalogue depuis la vente : on recolle la ligne. */}
                      <AttacherAuCatalogue
                        documentId={doc.id}
                        lineId={line.id}
                        perfumeName={line.perfumeName}
                        pickerVersion={pickerVersion}
                      />
                    </>
                  ) : null}
                </div>
                <Text variant="caption" tone="muted" truncate>
                  {[line.brandName, lineCaption(line)].filter(Boolean).join(" · ")}
                </Text>
                {!isVolumeMl(line.volumeMl) ? (
                  <Text variant="caption" tone="warning">
                    Volume à choisir
                  </Text>
                ) : null}
                {line.unitCostEur === null ? (
                  <Text variant="caption" tone="warning">
                    Coût à compléter
                  </Text>
                ) : null}
                {line.note ? (
                  <Text variant="caption" tone="muted" clamp={2}>
                    {line.note}
                  </Text>
                ) : null}
              </div>
            </div>
            {trackDelivery ? <LineDelivery documentId={doc.id} line={line} onValidation={onValidation} /> : null}
          </div>
        ))}
      </ListSection>

      {rows.length > 0 ? (
        <ListSection title="Paiements">
          {rows.map((row) => (
            <ListRow
              key={row.payment.id}
              primary={
                <span className={row.voided ? "admin-type-body block truncate font-medium text-[var(--admin-text-muted)]" : "admin-type-body block truncate font-medium text-[var(--admin-text)]"}>
                  {row.label}
                </span>
              }
              secondary={[
                formatDate(new Date(row.payment.occurredAt), "short"),
                row.payment.pocketName,
                row.payment.method,
                row.payment.note,
              ]
                .filter(Boolean)
                .join(" · ")}
              trailing={
                <span className="flex items-center gap-1">
                  <Money
                    value={row.payment.amount}
                    tone={row.voided ? "muted" : "default"}
                    className={row.voided ? "line-through" : undefined}
                  />
                  {row.actionable ? (
                    <Button
                      variant="ghost"
                      iconOnly
                      ariaLabel={`Actions : ${row.label} du ${formatDate(new Date(row.payment.occurredAt), "short")}`}
                      onClick={() => setPaymentMenu(row)}
                    >
                      <MoreHorizontal size={18} />
                    </Button>
                  ) : null}
                </span>
              }
            />
          ))}
        </ListSection>
      ) : null}

      <InfosZone
        doc={doc}
        onLinkCustomer={() => setCustomerOpen(true)}
        onChooseBatch={() => setBatchOpen(true)}
        onValidation={onValidation}
      />

      {collect.subject ? (
        <CollectSheet
          key={collect.key}
          open={collect.open}
          onClose={collect.hide}
          variant={collect.subject}
          customerName={name}
          targets={[target]}
          pockets={pockets}
          nested
          onValidation={(error) => {
            collect.hide();
            onValidation(error);
          }}
        />
      ) : null}
      {cancel.subject ? (
        <CancelSheet key={cancel.key} open={cancel.open} onClose={cancel.hide} mode={cancel.subject} doc={doc} pockets={pockets} />
      ) : null}
      {correct.subject ? (
        <CorrectPaymentSheet
          key={correct.key}
          open={correct.open}
          onClose={correct.hide}
          payment={correct.subject.payment}
          label={correct.subject.label}
          pockets={pockets}
        />
      ) : null}

      <CustomerPicker
        open={customerOpen}
        onOpenChange={setCustomerOpen}
        onSelect={(customerId) =>
          void update
            .run({ documentId: doc.id, customer: { kind: "linked", customerId } })
            .then((result) => result.ok && showToast({ type: "success", message: "Fiche liée" }))
        }
      />
      <BatchPicker
        open={batchOpen}
        onOpenChange={setBatchOpen}
        batches={batches}
        value={doc.batch?.id ?? null}
        onSelect={(batchId) => {
          if (batchId === (doc.batch?.id ?? null)) return;
          void assign.run({ changes: [{ documentId: doc.id, from: doc.batch?.id ?? null, to: batchId }] });
        }}
      />

      <Sheet open={menuOpen} onOpenChange={setMenuOpen} nested size="auto" title="Actions" description={`${title} · ${name}`}>
        <Card padding={0}>
          <ListRow primary="Modifier les lignes" onClick={() => (setMenuOpen(false), onEdit())} />
          {/* A-9 : « Refaire » pré-remplit le composeur (lignes, client, lot encore ouvert) pour relecture avant validation. */}
          <ListRow primary="Refaire" onClick={() => (setMenuOpen(false), navigate(routes.vendre({ depuis: doc.id })))} />
          {doc.status !== "CANCELLED" ? (
            <ListRow
              primary={shareLabel}
              onClick={() => {
                setMenuOpen(false);
                void shareOrCopy(sharePayload, navigator).then((outcome) => {
                  if (outcome === "copied") feedback("Message copié", "success");
                  if (outcome === "unavailable") feedback("Partage indisponible sur cet appareil.", "error");
                });
              }}
            />
          ) : null}
          {doc.status !== "CANCELLED" ? (
            <ListRow primary={`Annuler la ${n}`} onClick={() => (setMenuOpen(false), cancel.show("cancel"))} />
          ) : null}
          {!hasPayments ? (
            <ListRow primary={<span className="admin-type-body block font-medium text-[var(--admin-danger)]">Supprimer</span>} onClick={() => void deleteDocument()} />
          ) : null}
        </Card>
      </Sheet>

      <Sheet
        open={paymentMenu !== null}
        onOpenChange={(open) => (open ? undefined : setPaymentMenu(null))}
        nested
        size="auto"
        title={paymentMenu ? `${paymentMenu.label} · ${formatEur(eurFromWire(paymentMenu.payment.amount))}` : "Paiement"}
      >
        <Card padding={0}>
          <ListRow
            primary="Corriger"
            onClick={() => {
              const row = paymentMenu;
              setPaymentMenu(null);
              if (row) correct.show(row);
            }}
          />
          <ListRow
            primary={<span className="admin-type-body block font-medium text-[var(--admin-danger)]">{paymentMenu?.payment.kind === "REFUND" ? "Annuler ce remboursement" : "Annuler ce paiement"}</span>}
            onClick={() => paymentMenu && void confirmVoid(paymentMenu)}
          />
        </Card>
      </Sheet>
    </div>
  );
}

// ── Zone 2 : statut ────────────────────────────────────────────────────────────

const STATUS_OPTIONS = [
  { value: "PENDING", label: "En attente" },
  { value: "CONFIRMED", label: "Confirmée" },
  { value: "DELIVERED", label: "Livrée" },
] as const;

type TargetStatus = (typeof STATUS_OPTIONS)[number]["value"];

/**
 * Le SEUL contrôle de statut de la fiche (06 S01 zone 2). Optimiste ; réserves du domaine dans un dialogue ;
 * « Livrée » avec un dû ouvre S02 variante Livrer ; toast « Annuler » (T4b).
 */
function StatusControl({
  doc,
  allDelivered,
  onDeliverWithDue,
  onValidation,
}: {
  doc: DocumentSheetDTO;
  allDelivered: boolean;
  onDeliverWithDue: () => void;
  onValidation: (error: ActionError) => void;
}) {
  const announce = useGestureToast();
  const [optimistic, setOptimistic] = useOptimistic<DocumentStatus>(doc.status);
  const [, startTransition] = useTransition();
  const change = useAction(changeDocumentStatusAction);
  const pulse = usePulse<HTMLDivElement>(optimistic);
  const due = eurFromWire(doc.balance.due);
  const highlight = allDelivered && optimistic !== "DELIVERED";

  const onChange = (to: TargetStatus) => {
    if (to === optimistic || change.pending) return;
    if (to === "DELIVERED" && eur.compare(due, eur.zero) > 0) {
      onDeliverWithDue();
      return;
    }
    startTransition(async () => {
      setOptimistic(to);
      const result = await change.run({ documentId: doc.id, to });
      if (result.ok) {
        announce(`${Noun(doc.origin)} ${statusVerb(to)}`, result.data.undo, "Changement de statut annulé.");
      } else if (result.error.code === "VALIDATION") {
        onValidation(result.error);
      }
    });
  };

  return (
    <div className="flex flex-col gap-2">
      <div ref={pulse} className={highlight ? "admin-confirm-pulse rounded-[var(--admin-radius-md)]" : "rounded-[var(--admin-radius-md)]"}>
        <SegmentedControl
          ariaLabel="Statut de la commande"
          options={STATUS_OPTIONS}
          value={optimistic === "CANCELLED" ? "PENDING" : optimistic}
          onChange={onChange}
        />
      </div>
      {highlight ? (
        <Text variant="caption" tone="accent">
          Tout est pointé : touche « Livrée » pour clore la livraison.
        </Text>
      ) : null}
    </div>
  );
}

/** Bandeau « Annulée le 14 sept. » + « Réactiver » : le seul accès à la réactivation (06 S01). */
function CancelledBanner({ doc, onValidation }: { doc: DocumentSheetDTO; onValidation: (error: ActionError) => void }) {
  const announce = useGestureToast();
  const reactivate = useAction(changeDocumentStatusAction);
  const to = reactivationTarget(doc.origin);
  return (
    <Card tone="muted" padding={3}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <Ban size={18} aria-hidden className="shrink-0 text-[var(--admin-text-muted)]" />
          <Text variant="bodyEm" truncate>
            Annulée le {doc.cancelledAt ? formatDate(new Date(doc.cancelledAt), "short") : "—"}
          </Text>
        </div>
        <Button
          variant="secondary"
          size="sm"
          isLoading={reactivate.pending}
          onClick={() =>
            void reactivate.run({ documentId: doc.id, to: to as TargetStatus }).then((result) => {
              if (result.ok) announce(`${Noun(doc.origin)} réactivée`, result.data.undo, "Réactivation annulée.");
              else if (result.error.code === "VALIDATION") onValidation(result.error);
            })
          }
        >
          Réactiver
        </Button>
      </div>
    </Card>
  );
}

// ── Zone 3 : argent ────────────────────────────────────────────────────────────

function MoneyTile({ label, value, tone }: { label: string; value: string; tone: "default" | "warning" }) {
  const pulse = usePulse<HTMLDivElement>(value);
  return (
    <div ref={pulse} className="flex min-w-0 flex-col gap-0.5 rounded-[var(--admin-radius-md)] px-1 py-1" data-money-tile={label}>
      <Text variant="micro" tone="muted" uppercase>
        {label}
      </Text>
      <Money value={value as never} tone={tone} bold className="admin-type-h3" />
    </div>
  );
}

function MoneyZone({ doc }: { doc: DocumentSheetDTO }) {
  const view = moneyView(doc);
  const margin = marginLabel(doc);
  return (
    <div className="flex flex-col gap-2">
      <div className={view.tiles.length === 3 ? "grid grid-cols-3 gap-2" : "grid grid-cols-2 gap-2"}>
        {view.tiles.map((tile) => (
          <MoneyTile key={tile.label} label={tile.label} value={tile.value} tone={tile.tone} />
        ))}
      </div>
      {view.note ? (
        <Text variant="caption" tone="muted">
          {view.note}
        </Text>
      ) : null}
      {doc.status !== "CANCELLED" ? (
        <Text variant="caption" tone={margin.unknown ? "warning" : "muted"} className="tnum">
          {margin.text}
        </Text>
      ) : null}
    </div>
  );
}

// ── Zone 6 : infos ─────────────────────────────────────────────────────────────

function InfosZone({
  doc,
  onLinkCustomer,
  onChooseBatch,
  onValidation,
}: {
  doc: DocumentSheetDTO;
  onLinkCustomer: () => void;
  onChooseBatch: () => void;
  onValidation: (error: ActionError) => void;
}) {
  const { showToast } = useToast();
  const update = useAction(updateDocumentAction);
  const [notes, setNotes] = useState(doc.notes ?? "");
  const toDeliver = doc.origin === "ORDER" && (doc.status === "PENDING" || doc.status === "CONFIRMED");

  const chosenDay = doc.expectedDeliveryAt ? parisDayKey(new Date(doc.expectedDeliveryAt)) : null;

  const setDelivery = (day: string | null) => {
    const expectedDeliveryAt = day === null ? null : parseParisDayKey(day)?.toISOString() ?? null;
    void update.run({ documentId: doc.id, expectedDeliveryAt, expectedDeliveryHasTime: false }).then((result) => {
      if (result.ok) showToast({ type: "success", message: day === null ? "Livraison sans date" : "Livraison prévue enregistrée" });
      else if (result.error.code === "VALIDATION") onValidation(result.error);
    });
  };

  const saveNotes = () => {
    if (notes.trim() === (doc.notes ?? "").trim()) return;
    void update.run({ documentId: doc.id, notes: notes.trim() || null }).then((result) => {
      if (result.ok) showToast({ type: "success", message: "Notes enregistrées" });
    });
  };

  return (
    <section className="flex flex-col gap-3" aria-label="Infos">
      <Card padding={0}>
        {doc.customer === null ? (
          <ListRow
            leading={<UserPlus size={20} aria-hidden className="text-[var(--admin-accent)]" />}
            primary="Lier une fiche"
            secondary={doc.customerContact ?? (doc.customerName ? "Client de passage" : undefined)}
            chevron
            onClick={onLinkCustomer}
          />
        ) : null}
        {doc.batch?.status === "CLOSED" ? (
          <ListRow leading={<Boxes size={20} aria-hidden className="text-[var(--admin-text-muted)]" />} primary={`Lot : ${doc.batch.name}`} secondary="Lot clos" />
        ) : (
          <div className={doc.customer === null ? "border-t border-[var(--admin-border)]" : undefined}>
            <ListRow
              leading={<Boxes size={20} aria-hidden className="text-[var(--admin-text-muted)]" />}
              primary={`Lot : ${doc.batch?.name ?? "Sans lot"}`}
              chevron
              onClick={onChooseBatch}
            />
          </div>
        )}
      </Card>

      {toDeliver ? <DeliveryChips value={chosenDay} onChange={setDelivery} clearable /> : null}

      <FormField label="Notes">
        {(field) => (
          <Textarea
            {...field}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={saveNotes}
            rows={2}
            maxLength={2000}
            placeholder="Adresse, préférence, rappel…"
          />
        )}
      </FormField>
    </section>
  );
}
