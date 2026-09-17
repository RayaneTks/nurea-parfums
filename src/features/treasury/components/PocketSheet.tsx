"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useShellSheet } from "@/app-shell/SheetRegistry";
import { useConfirm, useToast } from "@/app-shell/FeedbackProvider";
import { useAction } from "@/app-shell/hooks/useAction";
import { routes } from "@/app-shell/routes";
import type { PocketActivity, PocketSummary } from "@/contracts/treasury";
import { eur, eurFromWire, formatEur } from "@/domain/money";
import { useTransientSheet } from "@/features/documents/components/useTransientSheet";
import { updateSettingsAction } from "@/server/settings/actions";
import { archivePocketAction, deletePocketAction, updatePocketAction } from "@/server/treasury/actions";
import { InlineNameEditor } from "@/ui/patterns/InlineNameEditor";
import { Money } from "@/ui/patterns/Money";
import { Button } from "@/ui/primitives/Button";
import { Sheet } from "@/ui/primitives/Sheet";
import { Text } from "@/ui/primitives/Text";
import { JournalList } from "./JournalList";
import { MovementSheet, type MovementRequest } from "./MovementSheet";
import { POCKET_KIND_LABELS, archiveBlockedReason, ownPockets } from "./treasury-model";

type PocketSheetProps = {
  open: boolean;
  onClose: () => void;
  pocket: PocketSummary;
  activity: PocketActivity | undefined;
  pockets: readonly PocketSummary[];
};

/**
 * S14 — Poche (06 S14) : nom modifiable en place (sauf « Non attribué »), type, solde, poche proposée par défaut,
 * 10 derniers mouvements et « Voir tout » (E04 filtré), « Transférer » (S15, depuis cette poche ; « Répartir » pour
 * « Non attribué »), « Ajustement », « Archiver » à solde nul — sinon désactivé avec sa raison —, « Supprimer » pour
 * une poche qui n'a jamais eu de mouvement.
 */
export function PocketSheet({ open, onClose, pocket, activity, pockets }: PocketSheetProps) {
  useShellSheet(open, onClose);
  const router = useRouter();
  const confirm = useConfirm();
  const { showToast } = useToast();
  const movement = useTransientSheet<MovementRequest>();
  const rename = useAction(updatePocketAction);
  const setDefault = useAction(updateSettingsAction, { success: () => `${pocket.name} sera proposée par défaut` });
  const archive = useAction(archivePocketAction, { success: (archived) => `Poche « ${archived.name} » archivée` });
  const remove = useAction(deletePocketAction, { success: () => `Poche « ${pocket.name} » supprimée` });

  const balance = eurFromWire(pocket.balance);
  const blocked = archiveBlockedReason(pocket);
  const movementCount = activity?.movementCount ?? 0;
  const canMove = ownPockets(pockets).length > 0;
  const hasMoney = eur.compare(balance, eur.zero) > 0;

  const requestArchive = async () => {
    await confirm(
      {
        title: `Archiver la poche ${pocket.name} ?`,
        description: "Elle n'est plus proposée et ne reçoit plus de mouvement. Son historique reste dans le journal.",
        confirmLabel: "Archiver",
        cancelLabel: "Garder",
        tone: "primary",
      },
      async () => {
        const result = await archive.run({ id: pocket.id });
        if (!result.ok) throw new Error(result.error.message);
        onClose();
      },
    );
  };

  const requestDelete = async () => {
    const opening = eurFromWire(pocket.openingBalance);
    await confirm(
      {
        title: `Supprimer la poche ${pocket.name} ?`,
        description: eur.isZero(opening)
          ? "Elle n'a aucun mouvement."
          : `Elle n'a aucun mouvement. Ses ${formatEur(opening)} d'ouverture sortent de la Trésorerie.`,
        confirmLabel: "Supprimer",
        cancelLabel: "Garder",
        tone: "danger",
      },
      async () => {
        const result = await remove.run({ id: pocket.id });
        if (!result.ok) throw new Error(result.error.message);
        onClose();
      },
    );
  };

  const title = pocket.isSystem ? (
    pocket.name
  ) : (
    <InlineNameEditor
      value={pocket.name}
      ariaLabel="Renommer la poche"
      variant="h3"
      minLength={2}
      maxLength={60}
      onSave={async (name) => {
        const result = await rename.run({ id: pocket.id, name });
        if (!result.ok) {
          if (result.error.code === "VALIDATION") showToast({ type: "error", message: Object.values(result.error.fields ?? {})[0] ?? result.error.message });
          router.refresh();
        }
        return result.ok;
      }}
    />
  );

  return (
    <Sheet open={open} onOpenChange={(next) => (next ? undefined : onClose())} title={title} description={POCKET_KIND_LABELS[pocket.kind]} size="auto">
      <div className="flex flex-col gap-5 pb-2" data-pocket-sheet={pocket.name}>
        <div className="flex flex-col gap-1">
          <Text variant="micro" tone="subtle" uppercase>
            Solde
          </Text>
          <div data-pocket-balance>
            <Money value={pocket.balance} bold tone={eur.isNegative(balance) ? "danger" : "default"} className="admin-type-display" />
          </div>
          {pocket.isSystem ? (
            <Text variant="caption" tone="muted">
              L&apos;argent encaissé sans poche attend ici d&apos;être rangé.
            </Text>
          ) : pocket.isDefault ? (
            <Text variant="caption" tone="muted">
              Poche proposée par défaut
            </Text>
          ) : (
            <Button
              variant="text"
              size="sm"
              className="self-start"
              isLoading={setDefault.pending}
              onClick={() => void setDefault.run({ defaultPocketId: pocket.id })}
            >
              Définir par défaut
            </Button>
          )}
        </div>

        {canMove ? (
          <div className="flex flex-col gap-2">
            {pocket.isSystem ? (
              <Button variant="primary" size="lg" fullWidth disabled={!hasMoney} onClick={() => movement.show({ mode: "repartir" })}>
                {hasMoney ? "Répartir" : "Rien à répartir"}
              </Button>
            ) : (
              <Button variant="primary" size="lg" fullWidth onClick={() => movement.show({ mode: "transfert", pocketId: pocket.id })}>
                Transférer
              </Button>
            )}
            <Button variant="secondary" fullWidth onClick={() => movement.show({ mode: "ajustement", pocketId: pocket.id })}>
              Ajustement
            </Button>
          </div>
        ) : null}

        {activity && activity.recent.length > 0 ? (
          <JournalList
            entries={activity.recent}
            grouping="flat"
            title="Derniers mouvements"
            showPocket={false}
            nested
            footer={
              <Link
                href={routes.journal({ poche: pocket.id })}
                className="admin-type-caption admin-hit-target tap-scale self-start rounded-[var(--admin-radius-md)] px-1 font-semibold text-[var(--admin-accent)]"
              >
                Voir tout
              </Link>
            }
          />
        ) : (
          <Text variant="caption" tone="muted">
            Aucun mouvement dans cette poche.
          </Text>
        )}

        {!pocket.isSystem ? (
          <div className="flex flex-col gap-2 border-t border-[var(--admin-border)] pt-4">
            <Button variant="secondary" fullWidth disabled={blocked !== null} isLoading={archive.pending} onClick={() => void requestArchive()} data-archive-pocket>
              Archiver
            </Button>
            {blocked ? (
              <div data-archive-reason>
                <Text variant="caption" tone="muted">
                  {blocked}
                </Text>
              </div>
            ) : null}
            {movementCount === 0 ? (
              <Button variant="danger" fullWidth isLoading={remove.pending} onClick={() => void requestDelete()}>
                Supprimer
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>

      {movement.subject ? (
        <MovementSheet key={movement.key} open={movement.open} onClose={movement.hide} request={movement.subject} pockets={pockets} nested />
      ) : null}
    </Sheet>
  );
}
