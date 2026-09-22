"use client";

import { ClipboardList, Ghost, MessageCircle, Pencil, Phone, Share2, ShoppingBag, Trash2, UserPen } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { useToast } from "@/app-shell/FeedbackProvider";
import { useAction } from "@/app-shell/hooks/useAction";
import { useUrlState } from "@/app-shell/hooks/useUrlState";
import { routes } from "@/app-shell/routes";
import { useUndo } from "@/app-shell/UndoProvider";
import type { ReceivableDTO } from "@/contracts/chiffres";
import { customerDeletionBlock, type CustomerSheetDTO } from "@/contracts/customers";
import type { PocketSummary } from "@/contracts/treasury";
import { eurFromWire, formatEur, type MoneyString } from "@/domain/money";
import { formatPhoneNational } from "@/domain/phone";
import { pendingRemovals } from "@/features/catalogue/components/pending-removals";
import { recapText, relanceText, targetOfReceivable } from "@/features/collect/components/collect-model";
import { RelanceSheet } from "@/features/collect/components/RelanceSheet";
import { CollectSheet } from "@/features/documents/components/CollectSheet";
import { useDocumentSheetNavigation } from "@/features/documents/components/useDocumentSheetNavigation";
import { usePulse } from "@/features/documents/components/usePulse";
import { useTransientSheet } from "@/features/documents/components/useTransientSheet";
import { cn } from "@/lib/utils";
import { deleteCustomerAction, updateCustomerAction } from "@/server/customers/actions";
import { ConfirmDialog } from "@/ui/patterns/ConfirmDialog";
import { DateLabel } from "@/ui/patterns/DateLabel";
import { InlineNameEditor } from "@/ui/patterns/InlineNameEditor";
import { KpiTile } from "@/ui/patterns/KpiTile";
import { ListSection } from "@/ui/patterns/ListSection";
import { Money } from "@/ui/patterns/Money";
import { Avatar } from "@/ui/primitives/Avatar";
import { Button } from "@/ui/primitives/Button";
import { Card } from "@/ui/primitives/Card";
import { EmptyState } from "@/ui/primitives/EmptyState";
import { ListRow } from "@/ui/primitives/ListRow";
import { StickyAction } from "@/ui/primitives/StickyAction";
import { Text } from "@/ui/primitives/Text";
import { useArrivalPulse } from "./arrival";
import {
  contactLinks,
  frequentCaption,
  hasContact,
  historyAmount,
  historyCaption,
  historyTitle,
  isPositive,
} from "./customers-model";

type CustomerViewProps = {
  sheet: CustomerSheetDTO;
  /** `aEncaisser(null, id)` : LA définition, le même chiffre que le groupe du client sur À encaisser (02 §6). */
  aEncaisser: MoneyString;
  /** Les créances du client (`aEncaisserDetail()` filtrées), plus anciennes d'abord : CTA et relance. */
  receivables: readonly ReceivableDTO[];
  pockets: readonly PocketSummary[];
};

/** « Ses 12 documents sont conservés… » : la vérité sur la suppression (06 S18, 01 §4.10). */
function deletionDescription(count: number): string {
  const kept =
    count === 0
      ? "Aucun document n'est lié à cette fiche."
      : count === 1
        ? "Son document est conservé et reste affiché sous son nom."
        : `Ses ${count} documents sont conservés et restent affichés sous son nom.`;
  return `${kept} Tu pourras annuler pendant 5 secondes.`;
}

/**
 * E14 — Fiche client (06 E14) : le dû (tuile en lecture seule, même chiffre que À encaisser), les contacts directs,
 * UN bouton de partage (« Relancer » s'il y a une créance, « Partager le récap » sinon, arbitrage n°14), « Achète
 * souvent » et « Revendre », l'historique de TOUTES les opérations, les coordonnées, la suppression gardée. Action
 * principale sous le pouce : « Encaisser 140 € » s'il y a une créance, sinon « Vendre à … ».
 */
export function CustomerView({ sheet, aEncaisser, receivables, pockets }: CustomerViewProps) {
  const router = useRouter();
  const url = useUrlState();
  const { showToast } = useToast();
  const { scheduleDelete } = useUndo();
  const documentSheet = useDocumentSheetNavigation();
  const collect = useTransientSheet<"collect">();
  const share = useTransientSheet<"relance" | "recap">();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const { customer } = sheet;
  const header = useArrivalPulse<HTMLDivElement>(customer.id);
  const dueTile = usePulse<HTMLDivElement>(aEncaisser);

  const rename = useAction(updateCustomerAction, { success: "Nom enregistré" });
  const remove = useAction(deleteCustomerAction, { errors: "inline" });

  const owes = isPositive(aEncaisser) && receivables.length > 0;
  const links = contactLinks(customer);
  const contact = hasContact(customer);
  const blocked = customerDeletionBlock(sheet.openOrders);

  const deleteNow = () => {
    const key = `client:${customer.id}` as const;
    setConfirmDelete(false);
    pendingRemovals.add(key);
    scheduleDelete({
      message: "Fiche supprimée",
      onUndo: () => pendingRemovals.remove(key),
      onCommit: async () => {
        const result = await remove.run({ id: customer.id });
        pendingRemovals.remove(key);
        // Le refus du serveur est dit tel quel (01 §4.10 : « Suppression échouée. » générique, jamais la raison).
        if (!result.ok) showToast({ type: "error", message: result.error.message });
      },
    });
    router.push(routes.clients());
  };

  const history = sheet.history;
  const shareKind = owes ? "relance" : "recap";
  const canShare = owes || sheet.recap.length > 0;

  return (
    <>
      {/* 1 — En-tête : nom modifiable en place, ancienneté. */}
      <div ref={header} className="flex items-center gap-3 rounded-[var(--admin-radius-lg)]">
        <Avatar name={customer.fullName} size="lg" />
        <div className="flex min-w-0 flex-1 flex-col">
          <h1 className="min-w-0">
            <InlineNameEditor
              value={customer.fullName}
              variant="h2"
              ariaLabel="Renommer le client"
              onSave={async (next) => {
                const result = await rename.run({ id: customer.id, fullName: next });
                if (!result.ok && result.error.code === "VALIDATION") {
                  showToast({ type: "error", message: result.error.fields?.fullName ?? result.error.message });
                }
                return result.ok;
              }}
            />
          </h1>
          <Text variant="caption" tone="muted">
            Client depuis <DateLabel date={sheet.since} format="month" />
          </Text>
        </div>
      </div>

      {/* 2 — Contact direct ; sans aucun moyen de contact, le seul accès au formulaire. */}
      {contact ? (
        <div className="flex gap-2" role="group" aria-label="Contacter">
          {links.call ? <ContactLink href={links.call} icon={<Phone size={20} />} label="Appeler" /> : null}
          {links.whatsapp ? <ContactLink href={links.whatsapp} icon={<MessageCircle size={20} />} label="WhatsApp" external /> : null}
          {links.snap ? <ContactLink href={links.snap} icon={<Ghost size={20} />} label="Snap" external /> : null}
        </div>
      ) : (
        <Card padding={0} tone="accent">
          <ListRow
            href={routes.modifierClient(customer.id)}
            leading={<UserPen size={20} aria-hidden className="text-[var(--admin-accent)]" />}
            primary="Compléter la fiche"
            secondary="Téléphone, Snap, WhatsApp : pour le joindre en 1 tap"
            chevron
          />
        </Card>
      )}

      {/* 3 — Tuiles en lecture : l'encaissement est le CTA du bas, un seul chemin vers S02 (05 §5.3). */}
      {/* « À encaisser » sur toute la largeur : le chiffre qu'on vient lire ; les deux autres se partagent la rangée
          (trois colonnes rognaient « Dernier achat » dès 390 px). */}
      <div className="grid grid-cols-2 gap-2" data-customer-tiles>
        <div ref={dueTile} className="col-span-2 min-w-0 rounded-[var(--admin-radius-lg)]" data-customer-due={aEncaisser}>
          <KpiTile label="À encaisser" amount={aEncaisser} tone={isPositive(aEncaisser) ? "warning" : "default"} className="h-full p-3" />
        </div>
        <KpiTile label="Documents" value={sheet.documentCount} className="p-3" />
        <KpiTile
          label="Dernier achat"
          value={sheet.lastPurchaseAt ? <DateLabel date={sheet.lastPurchaseAt} format="short" /> : "—"}
          className="p-3"
        />
      </div>

      {/* 4 — UN bouton de partage (arbitrage n°14) et la commande pré-remplie. */}
      {/* Chaque libellé entier : côte à côte s'ils tiennent, l'un sous l'autre sinon (320 px). */}
      <div className="flex flex-wrap gap-2">
        {canShare ? (
          <Button variant="secondary" leadingIcon={<Share2 size={16} />} className="min-w-fit flex-1" onClick={() => share.show(shareKind)}>
            {owes ? "Relancer" : "Partager le récap"}
          </Button>
        ) : null}
        <Button
          variant="secondary"
          leadingIcon={<ClipboardList size={16} />}
          className="min-w-fit flex-1"
          onClick={() => router.push(routes.vendre({ mode: "commande", client: customer.id }))}
        >
          Nouvelle commande
        </Button>
      </div>

      {/* 5 — Achète souvent (dès 2 documents). */}
      {sheet.documentCount >= 2 && sheet.frequent.length > 0 ? (
        <ListSection title="Achète souvent">
          {sheet.frequent.map((item) => (
            <ListRow
              key={item.perfumeId}
              primary={item.name}
              secondary={`${item.brandName} · ${frequentCaption(item)}`}
              trailing={
                <Button
                  variant="text"
                  size="sm"
                  ariaLabel={`Revendre ${item.name}`}
                  onClick={() => router.push(routes.vendre({ client: customer.id, parfum: item.perfumeId }))}
                >
                  Revendre
                </Button>
              }
            />
          ))}
        </ListSection>
      ) : null}

      {/* 6 — Historique : toutes les opérations, « Afficher plus » ajoute la page suivante. */}
      <ListSection
        title="Historique"
        count={sheet.historyCount > 0 ? sheet.historyCount : undefined}
        footer={
          history.hasMore ? (
            <Button variant="secondary" fullWidth className="mt-2" isLoading={url.pending} onClick={() => url.set({ pages: history.pages + 1 })}>
              Afficher plus
            </Button>
          ) : undefined
        }
      >
        {history.rows.length === 0 ? (
          <EmptyState done title="Aucun achat pour l'instant." />
        ) : (
          history.rows.map((row) => {
            const amount = historyAmount(row);
            const title = historyTitle(row);
            return (
              <div key={row.id} data-history-row={row.id}>
                <ListRow
                  leading={
                    row.origin === "ORDER" ? (
                      <ClipboardList size={20} aria-hidden className="text-[var(--admin-text-muted)]" />
                    ) : (
                      <ShoppingBag size={20} aria-hidden className="text-[var(--admin-text-muted)]" />
                    )
                  }
                  primary={title}
                  secondary={historyCaption(row)}
                  onClick={() => documentSheet.open(row.id)}
                  ariaLabel={title}
                  trailing={
                    amount.kind === "due" ? (
                      <span className="flex flex-col items-end">
                        <Money value={amount.value} tone="warning" bold />
                        <span className="admin-type-micro text-[var(--admin-text-subtle)]">à encaisser</span>
                      </span>
                    ) : (
                      <Money value={amount.value} tone={row.status === "CANCELLED" ? "muted" : "default"} />
                    )
                  }
                />
              </div>
            );
          })
        )}
      </ListSection>

      {/* 7 — Coordonnées en lecture ; « Modifier » seulement si un moyen de contact existe (sinon zone 2). */}
      <Coordinates sheet={sheet} editable={contact} onEdit={() => router.push(routes.modifierClient(customer.id))} />

      {/* 8 — Suppression gardée : la raison AVANT le geste (01 §4.10). */}
      <div className="flex flex-col items-center gap-1">
        <Button
          variant="text"
          leadingIcon={<Trash2 size={16} />}
          className="text-[var(--admin-danger)]"
          disabled={blocked !== null}
          onClick={() => setConfirmDelete(true)}
        >
          Supprimer le client
        </Button>
        {blocked ? (
          <p className="admin-type-caption text-center text-[var(--admin-text-muted)]" data-delete-blocked>
            {blocked}
          </p>
        ) : null}
      </div>

      <StickyAction>
        {owes ? (
          <Button variant="primary" size="lg" fullWidth onClick={() => collect.show("collect")}>
            Encaisser {formatEur(eurFromWire(aEncaisser))}
          </Button>
        ) : (
          <Button variant="primary" size="lg" fullWidth onClick={() => router.push(routes.vendre({ client: customer.id }))}>
            Vendre à {customer.fullName}
          </Button>
        )}
      </StickyAction>

      {collect.subject && receivables.length > 0 ? (
        <CollectSheet
          key={collect.key}
          open={collect.open}
          onClose={collect.hide}
          variant={receivables.length >= 2 ? "tout" : "solde"}
          customerName={customer.fullName}
          targets={receivables.map(targetOfReceivable)}
          pockets={pockets}
        />
      ) : null}

      {share.subject ? (
        <RelanceSheet
          key={share.key}
          open={share.open}
          onClose={share.hide}
          name={customer.fullName}
          title={share.subject === "relance" ? `Relancer · ${customer.fullName}` : `Récap · ${customer.fullName}`}
          text={
            share.subject === "relance"
              ? relanceText({ name: customer.fullName, items: [...receivables], total: aEncaisser })
              : recapText(customer.fullName, sheet.recap)
          }
        />
      ) : null}

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={`Supprimer ${customer.fullName} ?`}
        description={deletionDescription(sheet.historyCount)}
        confirmLabel="Supprimer"
        tone="danger"
        onConfirm={deleteNow}
      />
    </>
  );
}

/** Bouton de contact neutre de 64 px (06 E14 zone 2) : un lien réel (`tel:`, `wa.me`, Snapchat). */
function ContactLink({ href, icon, label, external = false }: { href: string; icon: ReactNode; label: string; external?: boolean }) {
  return (
    <a
      href={href}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      className={cn(
        "tap-scale flex min-h-[64px] min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-[var(--admin-radius-lg)] px-2",
        "border border-[var(--admin-border)] bg-[var(--admin-surface)] text-[var(--admin-accent)]",
        "active:bg-[var(--admin-surface-muted)] mouse-hover:bg-[var(--admin-surface-hover)]",
        "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--admin-accent-ring)]",
      )}
    >
      <span aria-hidden>{icon}</span>
      <span className="admin-type-caption truncate font-medium text-[var(--admin-text)]">{label}</span>
    </a>
  );
}

/** Zone 7 : les coordonnées en lecture, rangées absentes si vides. */
function Coordinates({ sheet, editable, onEdit }: { sheet: CustomerSheetDTO; editable: boolean; onEdit: () => void }) {
  const { customer } = sheet;
  const rows: { label: string; value: string; multiline?: boolean }[] = [
    customer.phoneE164 ? { label: "Téléphone", value: formatPhoneNational(customer.phoneE164) } : null,
    customer.whatsappE164 ? { label: "WhatsApp", value: formatPhoneNational(customer.whatsappE164) } : null,
    customer.snapchat ? { label: "Snap", value: `@${customer.snapchat}` } : null,
    customer.address ? { label: "Adresse", value: customer.address, multiline: true } : null,
    customer.notes ? { label: "Notes", value: customer.notes, multiline: true } : null,
  ].filter((row): row is { label: string; value: string; multiline?: boolean } => row !== null);
  if (rows.length === 0) return null;
  return (
    <ListSection
      title="Coordonnées"
      action={
        editable ? (
          <Button variant="text" size="sm" leadingIcon={<Pencil size={14} />} onClick={onEdit}>
            Modifier
          </Button>
        ) : undefined
      }
    >
      {rows.map((row) => (
        <div key={row.label} className="flex min-h-[56px] flex-col justify-center px-3 py-2">
          <span className="admin-type-caption text-[var(--admin-text-muted)]">{row.label}</span>
          <span
            className={cn(
              "admin-type-body text-[var(--admin-text)]",
              row.multiline ? "whitespace-pre-line break-words" : "tnum truncate",
            )}
          >
            {row.value}
          </span>
        </div>
      ))}
    </ListSection>
  );
}
