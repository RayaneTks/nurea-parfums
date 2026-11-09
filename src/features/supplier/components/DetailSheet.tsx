"use client";

import { useToast } from "@/app-shell/FeedbackProvider";
import { useShellSheet } from "@/app-shell/SheetRegistry";
import { formatDzd } from "@/domain/money";
import { ListSection } from "@/ui/patterns/ListSection";
import { shareOrCopy } from "@/ui/patterns/ShareButton";
import { Button } from "@/ui/primitives/Button";
import { ListRow } from "@/ui/primitives/ListRow";
import { Sheet } from "@/ui/primitives/Sheet";
import { Text } from "@/ui/primitives/Text";
import { detailMessage, type SupplierDetail } from "./detail-model";

function TotalRow({ label, amount, strong = false }: { label: string; amount: string; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <Text as="span" variant={strong ? "bodyEm" : "body"} tone={strong ? "default" : "muted"}>
        {label}
      </Text>
      <Text as="span" variant={strong ? "bodyEm" : "body"} className="tnum">
        {amount}
      </Text>
    </div>
  );
}

/**
 * S27 — Détail du reste à payer (docs/admin/dettes-fournisseur.md) : les parfums des dettes qui ont encore un
 * reste, client par client, avec leur coût en DA, puis l'addition. Le message copié part tel quel chez le
 * fournisseur pour comparer ses comptes : aucun prix de vente, seulement ce qu'on lui doit.
 */
export function DetailSheet({ detail, onClose }: { detail: SupplierDetail; onClose: () => void }) {
  const { showToast } = useToast();
  useShellSheet(true, onClose);

  const message = detailMessage(detail);
  const feedback = (msg: string, type: "success" | "error") => showToast({ type, message: msg });
  const perfumes = detail.groups.reduce((sum, group) => sum + group.lines.length, 0);

  return (
    <Sheet
      open
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      title="Détail du reste à payer"
      description={`${perfumes} parfum${perfumes > 1 ? "s" : ""} · ${detail.groups.length} client${detail.groups.length > 1 ? "s" : ""}`}
      footer={
        <Button
            variant="primary"
            size="lg"
            fullWidth
            onClick={() =>
              void shareOrCopy({ text: message }, { clipboard: navigator.clipboard }).then((outcome) =>
                outcome === "copied" ? feedback("Détail copié", "success") : feedback("Copie impossible sur cet appareil.", "error"),
              )
            }
          >
            Copier le détail
        </Button>
      }
    >
      <div className="flex flex-col gap-4" data-supplier-detail>
        {detail.missingCosts > 0 ? (
          <Text variant="caption" tone="warning">
            {detail.missingCosts} parfum{detail.missingCosts > 1 ? "s" : ""} sans coût, compté{detail.missingCosts > 1 ? "s" : ""} 0 : complète
            le coût dans la commande avant d&apos;envoyer.
          </Text>
        ) : null}

        {detail.groups.map((group) => (
          <ListSection key={group.key} title={group.customer}>
            {group.lines.map((line, index) => (
              <ListRow
                key={index}
                primary={`${line.label}${line.quantity > 1 ? ` ×${line.quantity}` : ""}`}
                secondary={
                  line.cancelled
                    ? "Commande annulée depuis"
                    : !line.amount
                      ? "Coût manquant"
                      : line.partialOf
                        ? `Reste, sur ${formatDzd(line.partialOf)}`
                        : undefined
                }
                trailing={
                  <Text as="span" variant="body" tone={line.amount ? "default" : "muted"} className="tnum">
                    {line.amount ? formatDzd(line.amount) : "—"}
                  </Text>
                }
              />
            ))}
          </ListSection>
        ))}

        {detail.others.length > 0 ? (
          <ListSection title="Autres">
            {detail.others.map((other, index) => (
              <ListRow
                key={index}
                primary={other.label}
                secondary={other.partialOf ? `Reste, sur ${formatDzd(other.partialOf)}` : undefined}
                trailing={
                  <Text as="span" variant="body" className="tnum">
                    {formatDzd(other.amount)}
                  </Text>
                }
              />
            ))}
          </ListSection>
        ) : null}

        <div className="flex flex-col gap-1" data-supplier-detail-total>
          <TotalRow label="Reste à payer" amount={formatDzd(detail.total)} strong />
        </div>
      </div>
    </Sheet>
  );
}
