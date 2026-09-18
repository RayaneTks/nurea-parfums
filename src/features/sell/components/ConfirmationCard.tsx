"use client";

import { CheckCircle2, X } from "lucide-react";
import { useEffect, useRef } from "react";
import { useConfirm, useToast } from "@/app-shell/FeedbackProvider";
import { useUndo } from "@/app-shell/UndoProvider";
import { useAction } from "@/app-shell/hooks/useAction";
import { newId } from "@/domain/ids";
import { eur, eurFromWire, formatEur } from "@/domain/money";
import { shareText } from "@/features/documents/components/document-model";
import { useDocumentSheetNavigation } from "@/features/documents/components/useDocumentSheetNavigation";
import { cancelDocumentAction, deleteDocumentAction } from "@/server/documents/actions";
import { ShareButton } from "@/ui/patterns/ShareButton";
import { Button } from "@/ui/primitives/Button";
import { Card } from "@/ui/primitives/Card";
import { Text } from "@/ui/primitives/Text";
import { cancelDescription, type Confirmation } from "./composer-model";

type ConfirmationCardProps = {
  confirmation: Confirmation;
  onDismiss: () => void;
  /** Suppression différée annulée (« Annuler » du toast) : la carte revient. */
  onRestore: (confirmation: Confirmation) => void;
};

/**
 * Carte de confirmation (06 E11 zone 3) : remplace le toast de succès. « Voir » ouvre la fiche (S01) ; « Reçu » /
 * « Récap » partage ; « Annuler » dit la vérité sur l'effet — document payé : T5 avec remboursement du payé, même
 * poche, daté du jour ; sans aucun paiement : suppression (T6) différée 5 s, qui ne laisse aucun document « Annulée »
 * (03 §4.4).
 */
export function ConfirmationCard({ confirmation, onDismiss, onRestore }: ConfirmationCardProps) {
  const { showToast } = useToast();
  const confirm = useConfirm();
  const { scheduleDelete } = useUndo();
  const sheet = useDocumentSheetNavigation();
  const card = useRef<HTMLDivElement | null>(null);
  const refundIds = useRef(confirmation.payments.map(() => newId()));
  const cancel = useAction(cancelDocumentAction);
  const remove = useAction(deleteDocumentAction, { errors: "inline" });

  const sale = confirmation.origin === "DIRECT_SALE";
  const noun = sale ? "vente" : "commande";
  const paid = eurFromWire(confirmation.paid);
  const hasPayment = eur.compare(paid, eur.zero) > 0;

  // Haptique visuelle du succès (05 §4.4) : la carte pulse une fois à son arrivée.
  useEffect(() => {
    const element = card.current;
    if (!element) return;
    element.classList.add("admin-confirm-pulse");
    const done = () => element.classList.remove("admin-confirm-pulse");
    element.addEventListener("animationend", done, { once: true });
    return () => element.removeEventListener("animationend", done);
  }, [confirmation.documentId]);

  const onCancel = async () => {
    if (hasPayment) {
      await confirm(
        {
          title: `Annuler la ${noun} de ${formatEur(eurFromWire(confirmation.total))} ?`,
          description: cancelDescription(confirmation),
          confirmLabel: `Annuler la ${noun}`,
          cancelLabel: "Garder",
          tone: "danger",
        },
        async () => {
          const result = await cancel.run({
            documentId: confirmation.documentId,
            refunds: confirmation.payments.map((part, index) => ({ id: refundIds.current[index] as string, amount: part.amount, pocketId: part.pocketId })),
            // La description vient de dire que le stock est restitué : la réserve de transition est déjà confirmée.
            confirm: true,
          });
          if (!result.ok) throw new Error(result.error.message);
          onDismiss();
          showToast({ type: "success", message: `${sale ? "Vente" : "Commande"} annulée · ${formatEur(paid)} remboursés` });
        },
      );
      return;
    }
    const ok = await confirm({
      title: `Supprimer cette ${noun} ?`,
      description: "Elle n'a aucun paiement. Tu pourras annuler pendant 5 secondes.",
      confirmLabel: "Supprimer",
      tone: "danger",
    });
    if (!ok) return;
    onDismiss();
    scheduleDelete({
      message: `${sale ? "Vente" : "Commande"} supprimée`,
      errorMessage: `La ${noun} n'a pas pu être supprimée. Réessaie depuis sa fiche.`,
      onUndo: () => onRestore(confirmation),
      onCommit: async () => {
        const result = await remove.run({ documentId: confirmation.documentId });
        if (!result.ok) throw new Error(result.error.message);
      },
    });
  };

  const share = {
    title: confirmation.title,
    text: shareText(
      {
        origin: confirmation.origin,
        status: sale ? "DELIVERED" : hasPayment ? "CONFIRMED" : "PENDING",
        ...confirmation.share,
        balance: { total: confirmation.total, paid: confirmation.paid, due: confirmation.due },
      },
      sale ? "recu" : "recap",
    ),
  };

  return (
    <div ref={card} className="rounded-[var(--admin-radius-lg)]" data-confirmation-card={confirmation.documentId}>
      <Card tone="accent" padding={3}>
        <div className="flex flex-col gap-2" role="status">
          <div className="flex items-start gap-2">
            <CheckCircle2 size={20} aria-hidden className="mt-0.5 shrink-0 text-[var(--admin-accent)]" />
            <Text variant="bodyEm" className="tnum min-w-0 flex-1" clamp={2}>
              {confirmation.title}
            </Text>
            <Button variant="ghost" iconOnly ariaLabel="Fermer la confirmation" onClick={onDismiss}>
              <X size={18} />
            </Button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <Button variant="secondary" size="sm" onClick={() => sheet.open(confirmation.documentId)}>
              Voir
            </Button>
            <ShareButton
              payload={share}
              label={sale ? "Reçu" : "Récap"}
              size="sm"
              onFeedback={(message, type) => showToast({ type, message })}
            />
            <Button variant="secondary" size="sm" onClick={() => void onCancel()}>
              Annuler
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
