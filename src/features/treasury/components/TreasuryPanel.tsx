"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeftRight, Plus, SlidersHorizontal, AlertTriangle, Truck } from "lucide-react";
import { Stack, HStack } from "@/ui/primitives/Stack";
import { Card } from "@/ui/primitives/Card";
import { Button } from "@/ui/primitives/Button";
import { Input } from "@/ui/primitives/Input";
import { Sheet } from "@/ui/primitives/Sheet";
import { Money } from "@/ui/patterns/Money";
import { Toast, type ToastType } from "@/ui/primitives/Toast";
import { EmptyState } from "@/ui/primitives/EmptyState";
import { cn } from "@/lib/utils";
import { PocketSelector, pocketIcon } from "./PocketSelector";
import type { PocketWithBalance, MovementRow } from "@/server/treasury/queries";
import type { PocketKind, CashMovementKind } from "@prisma/client";
import {
  createPocketAction,
  transferAction,
  assignUnattributedAction,
  adjustmentAction,
  supplierPaymentAction,
} from "@/server/treasury/actions";

type TreasuryPanelProps = {
  total: string;
  unattributed: string;
  pockets: PocketWithBalance[];
  movements: MovementRow[];
};

const KIND_LABEL: Record<CashMovementKind, string> = {
  OPENING: "Ouverture",
  SALE_IN: "Vente",
  DEPOSIT_IN: "Acompte",
  BALANCE_IN: "Solde",
  REFUND_OUT: "Remboursement",
  EXPENSE_OUT: "Dépense",
  SUPPLIER_OUT: "Fournisseur",
  TRANSFER: "Transfert",
  ADJUSTMENT: "Ajustement",
};

const POCKET_KIND_OPTIONS: { value: PocketKind; label: string }[] = [
  { value: "CASH", label: "Espèces" },
  { value: "BANK", label: "Banque / Revolut" },
  { value: "SUPPLIER", label: "Fournisseur" },
  { value: "OTHER", label: "Autre" },
];

type SheetKind = "create" | "transfer" | "assign" | "adjust" | "supplier" | null;

export function TreasuryPanel({ total, unattributed, pockets, movements }: TreasuryPanelProps) {
  const router = useRouter();
  const [sheet, setSheet] = useState<SheetKind>(null);
  const [pending, setPending] = useState(false);
  const [toast, setToast] = useState<{ type: ToastType; message: string } | null>(null);

  // Champs partagés des formulaires.
  const [name, setName] = useState("");
  const [kind, setKind] = useState<PocketKind>("CASH");
  const [amount, setAmount] = useState("");
  const [label, setLabel] = useState("");
  const [fromId, setFromId] = useState<string | null>(null);
  const [toId, setToId] = useState<string | null>(null);

  const realPockets = pockets.filter((p) => !p.isSystem);
  const unattributedNum = Number(unattributed);
  const hasUnattributed = Number.isFinite(unattributedNum) && unattributedNum > 0.005;

  const reset = () => {
    setName("");
    setKind("CASH");
    setAmount("");
    setLabel("");
    setFromId(null);
    setToId(null);
  };
  const open = (k: SheetKind) => {
    reset();
    setSheet(k);
  };
  const close = () => setSheet(null);

  const done = (message: string) => {
    setToast({ type: "success", message });
    setSheet(null);
    router.refresh();
  };
  const fail = (message: string) => setToast({ type: "error", message });

  const submitCreate = async () => {
    setPending(true);
    const res = await createPocketAction({ name, kind, openingBalance: amount || 0 });
    setPending(false);
    res.ok ? done("Poche créée.") : fail(res.error);
  };
  const submitTransfer = async () => {
    setPending(true);
    const res = await transferAction({
      fromPocketId: fromId ?? undefined,
      toPocketId: toId ?? undefined,
      amount,
      label,
    });
    setPending(false);
    res.ok ? done("Transfert enregistré.") : fail(res.error);
  };
  const submitAssign = async () => {
    setPending(true);
    const res = await assignUnattributedAction({ toPocketId: toId ?? undefined, amount });
    setPending(false);
    res.ok ? done("Somme répartie.") : fail(res.error);
  };
  const submitAdjust = async () => {
    setPending(true);
    const res = await adjustmentAction({ pocketId: fromId ?? undefined, amount, label });
    setPending(false);
    res.ok ? done("Ajustement enregistré.") : fail(res.error);
  };
  const submitSupplier = async () => {
    setPending(true);
    const res = await supplierPaymentAction({ pocketId: fromId, amount, label });
    setPending(false);
    res.ok ? done("Paiement fournisseur enregistré.") : fail(res.error);
  };

  return (
    <>
      <Stack gap={4}>
        {/* Total */}
        <Card padding={4} tone="surface">
          <p className="text-[11px] font-medium uppercase tracking-[0.04em] text-[var(--admin-text-subtle)]">
            Trésorerie totale
          </p>
          <p className="mt-1 text-[28px] font-bold leading-none">
            <Money value={total} />
          </p>
        </Card>

        {/* Rappel Non attribué */}
        {hasUnattributed ? (
          <button
            type="button"
            onClick={() => open("assign")}
            className="w-full rounded-[14px] border border-[var(--admin-danger-border)] bg-[var(--admin-danger-bg)] p-3 text-left tap-scale"
          >
            <HStack justify="between" align="center">
              <span className="flex items-center gap-2 text-[14px] font-semibold text-[var(--admin-danger)]">
                <AlertTriangle size={16} />
                {unattributedNum.toFixed(2)} € non attribué
              </span>
              <span className="text-[13px] font-semibold text-[var(--admin-danger)]">Répartir →</span>
            </HStack>
            <p className="mt-1 text-[12px] text-[var(--admin-text-muted)]">
              Cet argent doit être affecté à une poche réelle.
            </p>
          </button>
        ) : null}

        {/* Poches */}
        <div>
          <HStack justify="between" align="center" className="mb-2 px-1">
            <h3 className="text-[11px] font-bold uppercase tracking-[0.06em] text-[var(--admin-text-muted)]">
              Poches
            </h3>
            <button
              type="button"
              onClick={() => open("create")}
              className="inline-flex items-center gap-1 text-[13px] font-semibold text-[var(--admin-accent)] tap-scale"
            >
              <Plus size={14} /> Poche
            </button>
          </HStack>
          {realPockets.length === 0 ? (
            <EmptyState
              title="Aucune poche"
              description="Crée tes poches (Espèces, Revolut, Fournisseur…) avec leur solde actuel."
              action={
                <Button variant="primary" size="md" leadingIcon={<Plus size={16} />} onClick={() => open("create")}>
                  Créer une poche
                </Button>
              }
            />
          ) : (
            <Stack gap={2}>
              {realPockets.map((p) => {
                const Icon = pocketIcon(p.kind);
                return (
                  <Card key={p.id} padding={3}>
                    <HStack justify="between" align="center">
                      <span className="flex items-center gap-3">
                        <span className="inline-flex h-9 w-9 items-center justify-center rounded-[10px] bg-[var(--admin-surface-muted)] text-[var(--admin-accent)]">
                          <Icon size={18} />
                        </span>
                        <span className="text-[15px] font-semibold text-[var(--admin-text)]">{p.name}</span>
                      </span>
                      <Money value={p.balance} bold tone="auto" />
                    </HStack>
                  </Card>
                );
              })}
            </Stack>
          )}
        </div>

        {/* Actions */}
        {realPockets.length > 0 ? (
          <Stack gap={2}>
            <HStack gap={2}>
              <Button variant="secondary" size="md" fullWidth leadingIcon={<ArrowLeftRight size={15} />} onClick={() => open("transfer")}>
                Transfert
              </Button>
              <Button variant="secondary" size="md" fullWidth leadingIcon={<SlidersHorizontal size={15} />} onClick={() => open("adjust")}>
                Ajuster
              </Button>
            </HStack>
            <Button variant="secondary" size="md" fullWidth leadingIcon={<Truck size={15} />} onClick={() => open("supplier")}>
              Paiement fournisseur
            </Button>
          </Stack>
        ) : null}

        {/* Mouvements */}
        {movements.length > 0 ? (
          <div>
            <h3 className="mb-2 px-1 text-[11px] font-bold uppercase tracking-[0.06em] text-[var(--admin-text-muted)]">
              Mouvements récents
            </h3>
            <Card padding={0}>
              <ul className="divide-y px-3" style={{ borderColor: "var(--admin-border)" }}>
                {movements.map((m) => {
                  const amt = Number(m.amount);
                  const positive = amt >= 0;
                  return (
                    <li key={m.id} className="flex items-center justify-between gap-3 py-2.5">
                      <span className="min-w-0">
                        <span className="block truncate text-[14px] font-medium text-[var(--admin-text)]">
                          {m.label || KIND_LABEL[m.kind]}
                        </span>
                        <span className="block truncate text-[12px] text-[var(--admin-text-subtle)]">
                          {KIND_LABEL[m.kind]} · {m.pocketName} ·{" "}
                          {new Date(m.occurredAt).toLocaleDateString("fr-FR")}
                        </span>
                      </span>
                      <span
                        className={cn(
                          "shrink-0 text-[14px] font-bold tabular-nums",
                          positive ? "text-[var(--admin-success)]" : "text-[var(--admin-danger)]",
                        )}
                      >
                        {positive ? "+" : "−"}
                        {Math.abs(amt).toFixed(2)} €
                      </span>
                    </li>
                  );
                })}
              </ul>
            </Card>
          </div>
        ) : null}
      </Stack>

      {/* Sheet : créer poche */}
      <Sheet
        open={sheet === "create"}
        onOpenChange={(o) => (o ? null : close())}
        title="Nouvelle poche"
        description="Saisis le solde réel actuel comme point de départ."
        footer={
          <Button variant="primary" size="lg" fullWidth isLoading={pending} onClick={submitCreate}>
            Créer la poche
          </Button>
        }
      >
        <Stack gap={3}>
          <Input label="Nom" variant="elevated" value={name} onChange={(e) => setName(e.target.value)} placeholder="Espèces, Revolut, Fournisseur…" enterKeyHint="next" autoFocus />
          <div>
            <p className="mb-1.5 text-[13px] font-medium text-[var(--admin-text-muted)]">Type</p>
            <div className="flex flex-wrap gap-2">
              {POCKET_KIND_OPTIONS.map((k) => (
                <button
                  key={k.value}
                  type="button"
                  onClick={() => setKind(k.value)}
                  className={cn(
                    "inline-flex min-h-[44px] items-center rounded-[12px] border px-3 text-[14px] font-medium tap-scale",
                    kind === k.value
                      ? "border-[var(--admin-accent)] bg-[var(--admin-accent-bg)] text-[var(--admin-accent)]"
                      : "border-[var(--admin-border)] bg-[var(--admin-surface)] text-[var(--admin-text)]",
                  )}
                >
                  {k.label}
                </button>
              ))}
            </div>
          </div>
          <Input label="Solde d'ouverture €" inputMode="decimal" variant="elevated" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" enterKeyHint="done" />
        </Stack>
      </Sheet>

      {/* Sheet : transfert */}
      <Sheet
        open={sheet === "transfer"}
        onOpenChange={(o) => (o ? null : close())}
        title="Transfert entre poches"
        footer={
          <Button variant="primary" size="lg" fullWidth isLoading={pending} onClick={submitTransfer}>
            Transférer
          </Button>
        }
      >
        <Stack gap={3}>
          <div>
            <p className="mb-1.5 text-[13px] font-medium text-[var(--admin-text-muted)]">Depuis</p>
            <PocketSelector pockets={pockets} value={fromId} onChange={setFromId} includeSystem />
          </div>
          <div>
            <p className="mb-1.5 text-[13px] font-medium text-[var(--admin-text-muted)]">Vers</p>
            <PocketSelector pockets={pockets} value={toId} onChange={setToId} includeSystem />
          </div>
          <Input label="Montant €" inputMode="decimal" variant="elevated" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="50" enterKeyHint="next" />
          <Input label="Note (opt.)" variant="elevated" value={label} onChange={(e) => setLabel(e.target.value)} enterKeyHint="done" />
        </Stack>
      </Sheet>

      {/* Sheet : répartir Non attribué */}
      <Sheet
        open={sheet === "assign"}
        onOpenChange={(o) => (o ? null : close())}
        title="Répartir le non attribué"
        description={`${unattributedNum.toFixed(2)} € à affecter.`}
        footer={
          <Button variant="primary" size="lg" fullWidth isLoading={pending} onClick={submitAssign}>
            Affecter
          </Button>
        }
      >
        <Stack gap={3}>
          <div>
            <p className="mb-1.5 text-[13px] font-medium text-[var(--admin-text-muted)]">Vers la poche</p>
            <PocketSelector pockets={pockets} value={toId} onChange={setToId} />
          </div>
          <Input label="Montant €" inputMode="decimal" variant="elevated" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder={unattributedNum.toFixed(2)} enterKeyHint="done" />
        </Stack>
      </Sheet>

      {/* Sheet : ajustement */}
      <Sheet
        open={sheet === "adjust"}
        onOpenChange={(o) => (o ? null : close())}
        title="Ajustement manuel"
        description="Montant positif (ajoute) ou négatif (retire) pour corriger un solde."
        footer={
          <Button variant="primary" size="lg" fullWidth isLoading={pending} onClick={submitAdjust}>
            Enregistrer
          </Button>
        }
      >
        <Stack gap={3}>
          <div>
            <p className="mb-1.5 text-[13px] font-medium text-[var(--admin-text-muted)]">Poche</p>
            <PocketSelector pockets={pockets} value={fromId} onChange={setFromId} includeSystem />
          </div>
          <Input label="Montant € (+ ou −)" inputMode="text" variant="elevated" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="-10" enterKeyHint="next" />
          <Input label="Raison" variant="elevated" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Erreur de caisse…" enterKeyHint="done" />
        </Stack>
      </Sheet>

      {/* Sheet : paiement fournisseur */}
      <Sheet
        open={sheet === "supplier"}
        onOpenChange={(o) => (o ? null : close())}
        title="Paiement fournisseur"
        description="Sortie d'argent depuis une poche (ex. avance fournisseur)."
        footer={
          <Button variant="primary" size="lg" fullWidth isLoading={pending} onClick={submitSupplier}>
            Enregistrer la sortie
          </Button>
        }
      >
        <Stack gap={3}>
          <div>
            <p className="mb-1.5 text-[13px] font-medium text-[var(--admin-text-muted)]">Depuis la poche</p>
            <PocketSelector pockets={pockets} value={fromId} onChange={setFromId} includeSystem />
          </div>
          <Input label="Montant €" inputMode="decimal" variant="elevated" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="200" enterKeyHint="next" />
          <Input label="Note (opt.)" variant="elevated" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Commande de mars…" enterKeyHint="done" />
        </Stack>
      </Sheet>

      {toast ? <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} /> : null}
    </>
  );
}
