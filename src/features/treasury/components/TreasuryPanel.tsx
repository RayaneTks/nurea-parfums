"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeftRight, Plus, SlidersHorizontal, AlertTriangle, Truck, ChevronRight, ChevronDown } from "lucide-react";
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
  backfillTreasuryAction,
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
  const [tracePocketId, setTracePocketId] = useState<string | null>(null);

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
  const submitBackfill = async () => {
    setPending(true);
    const res = await backfillTreasuryAction();
    setPending(false);
    res.ok
      ? done(
          res.data.created > 0
            ? `${res.data.created} mouvement(s) importé(s) dans « Non attribué ».`
            : "Historique déjà à jour.",
        )
      : fail(res.error);
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
          <button
            type="button"
            onClick={submitBackfill}
            disabled={pending}
            className="mt-2 text-[12px] font-medium text-[var(--admin-accent)] tap-scale disabled:opacity-50"
          >
            Importer l&apos;historique (ventes, acomptes, dépenses)
          </button>
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
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setTracePocketId(p.id)}
                    className="text-left tap-scale"
                  >
                    <Card padding={3}>
                      <HStack justify="between" align="center">
                        <span className="flex items-center gap-3">
                          <span className="inline-flex h-9 w-9 items-center justify-center rounded-[10px] bg-[var(--admin-surface-muted)] text-[var(--admin-accent)]">
                            <Icon size={18} />
                          </span>
                          <span className="flex items-center gap-1 text-[15px] font-semibold text-[var(--admin-text)]">
                            {p.name}
                            <ChevronDown
                              size={13}
                              className="-rotate-90 text-[var(--admin-text-subtle)]"
                              aria-hidden
                            />
                          </span>
                        </span>
                        <Money value={p.balance} bold tone="auto" />
                      </HStack>
                    </Card>
                  </button>
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
              Avance fournisseur
            </Button>
          </Stack>
        ) : null}

        {/* Mouvements groupés par mois */}
        {movements.length > 0 ? (
          <MovementsByMonth movements={movements} />
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
        title="Avance fournisseur"
        description="L'argent sort de la poche choisie. S'il existe une poche « Fournisseur », il y entre comme avance (sinon sortie sèche)."
        footer={
          <Button variant="primary" size="lg" fullWidth isLoading={pending} onClick={submitSupplier}>
            Enregistrer
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

      <PocketTraceSheet
        pocket={pockets.find((p) => p.id === tracePocketId) ?? null}
        movements={movements}
        onClose={() => setTracePocketId(null)}
      />

      {toast ? <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} /> : null}
    </>
  );
}

function PocketTraceSheet({
  pocket,
  movements,
  onClose,
}: {
  pocket: PocketWithBalance | null;
  movements: MovementRow[];
  onClose: () => void;
}) {
  const open = pocket !== null;
  const items = pocket
    ? movements.filter((m) => m.pocketId === pocket.id)
    : [];
  let inSum = 0;
  let outSum = 0;
  for (const m of items) {
    const v = Number(m.amount);
    if (v >= 0) inSum += v;
    else outSum += -v;
  }
  const opening = Number(pocket?.openingBalance ?? 0);
  const balance = Number(pocket?.balance ?? 0);

  return (
    <Sheet
      open={open}
      onOpenChange={(o) => (o ? null : onClose())}
      title={pocket?.name ?? ""}
      description="Trace de la poche : ouverture + entrées − sorties = solde."
    >
      {pocket ? (
        <Stack gap={4}>
          <div
            className="rounded-[14px] p-3"
            style={{ background: "var(--admin-surface-alt)" }}
          >
            <p className="text-[11px] font-medium uppercase tracking-[0.04em] text-[var(--admin-text-subtle)]">
              Solde actuel
            </p>
            <p className="mt-1 text-[26px] font-bold leading-none tabular-nums">
              {balance.toFixed(2).replace(".", ",")} €
            </p>
            <div className="mt-3 space-y-1 text-[12px] tabular-nums text-[var(--admin-text-muted)]">
              <p>Ouverture : <span className="font-medium text-[var(--admin-text)]">{opening.toFixed(2).replace(".", ",")} €</span></p>
              <p>Entrées : <span className="font-medium text-[var(--admin-success)]">+{inSum.toFixed(2).replace(".", ",")} €</span></p>
              <p>Sorties : <span className="font-medium text-[var(--admin-danger)]">−{outSum.toFixed(2).replace(".", ",")} €</span></p>
              <p className="pt-1 border-t" style={{ borderColor: "var(--admin-border)" }}>
                = solde {balance.toFixed(2).replace(".", ",")} €
              </p>
            </div>
          </div>

          <div>
            <p className="mb-1 px-1 text-[11px] font-bold uppercase tracking-[0.06em] text-[var(--admin-text-muted)]">
              Mouvements ({items.length})
            </p>
            {items.length === 0 ? (
              <p className="px-1 py-2 text-[12px] text-[var(--admin-text-subtle)]">
                Aucun mouvement sur cette poche pour le moment.
              </p>
            ) : (
              <ul className="divide-y px-1" style={{ borderColor: "var(--admin-border)" }}>
                {items.map((m) => (
                  <li key={m.id}>
                    <MovementLine mv={m} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Stack>
      ) : null}
    </Sheet>
  );
}

const MONTH_LABELS: Record<string, string> = {
  "01": "Janvier", "02": "Février", "03": "Mars", "04": "Avril",
  "05": "Mai", "06": "Juin", "07": "Juillet", "08": "Août",
  "09": "Septembre", "10": "Octobre", "11": "Novembre", "12": "Décembre",
};

function monthLabel(iso: string): { key: string; label: string } {
  const d = new Date(iso);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const y = d.getFullYear();
  return { key: `${y}-${m}`, label: `${MONTH_LABELS[m]} ${y}` };
}

type MovementItem =
  | { kind: "single"; mv: MovementRow }
  | {
      kind: "batchGroup";
      groupKey: string;
      groupLabel: string;
      href: string | null;
      net: number;
      items: MovementRow[];
    };

function buildMonthItems(items: MovementRow[]): MovementItem[] {
  const batchMap = new Map<string, MovementItem & { kind: "batchGroup" }>();
  const out: MovementItem[] = [];
  for (const mv of items) {
    if (mv.groupKey) {
      let g = batchMap.get(mv.groupKey);
      if (!g) {
        g = {
          kind: "batchGroup",
          groupKey: mv.groupKey,
          groupLabel: mv.groupLabel ?? "Lot",
          href: mv.href,
          net: 0,
          items: [],
        };
        batchMap.set(mv.groupKey, g);
        out.push(g);
      }
      // Premier groupLabel non-null fait foi (priorité aux dépenses qui exposent toujours le nom).
      if (!g.groupLabel || g.groupLabel === "Lot") {
        g.groupLabel = mv.groupLabel ?? g.groupLabel;
      }
      if (!g.href) g.href = mv.href;
      g.items.push(mv);
      g.net += Number(mv.amount);
    } else {
      out.push({ kind: "single", mv });
    }
  }
  // Élimine les groupes à un seul mouvement (pas la peine de plier).
  return out.map((it) =>
    it.kind === "batchGroup" && it.items.length < 2
      ? ({ kind: "single", mv: it.items[0] } as MovementItem)
      : it,
  );
}

function MovementsByMonth({ movements }: { movements: MovementRow[] }) {
  const groups = useMemo(() => {
    const map = new Map<
      string,
      { label: string; items: MovementRow[]; net: number }
    >();
    for (const m of movements) {
      const { key, label } = monthLabel(m.occurredAt);
      const g = map.get(key) ?? { label, items: [], net: 0 };
      g.items.push(m);
      g.net += Number(m.amount);
      map.set(key, g);
    }
    return Array.from(map.entries())
      .sort((a, b) => (a[0] < b[0] ? 1 : -1))
      .map(([key, g]) => [key, { ...g, structured: buildMonthItems(g.items) }] as const);
  }, [movements]);

  const [openMonths, setOpenMonths] = useState<Set<string>>(
    () => new Set([groups[0]?.[0]].filter(Boolean) as string[]),
  );
  const [openBatches, setOpenBatches] = useState<Set<string>>(new Set());

  const toggleMonth = (k: string) =>
    setOpenMonths((s) => {
      const next = new Set(s);
      next.has(k) ? next.delete(k) : next.add(k);
      return next;
    });
  const toggleBatch = (k: string) =>
    setOpenBatches((s) => {
      const next = new Set(s);
      next.has(k) ? next.delete(k) : next.add(k);
      return next;
    });

  return (
    <div>
      <h3 className="mb-2 px-1 text-[11px] font-bold uppercase tracking-[0.06em] text-[var(--admin-text-muted)]">
        Mouvements
      </h3>
      <Stack gap={2}>
        {groups.map(([key, g]) => {
          const isOpen = openMonths.has(key);
          return (
            <Card key={key} padding={0}>
              <button
                type="button"
                onClick={() => toggleMonth(key)}
                className="flex w-full items-center justify-between gap-3 px-3 py-2.5 tap-scale"
              >
                <span className="flex items-center gap-2">
                  <ChevronDown
                    size={14}
                    className={cn(
                      "text-[var(--admin-text-subtle)] transition-transform",
                      isOpen ? "" : "-rotate-90",
                    )}
                    aria-hidden
                  />
                  <span className="text-[13px] font-semibold text-[var(--admin-text)]">
                    {g.label}
                  </span>
                  <span className="text-[11px] text-[var(--admin-text-subtle)]">
                    {g.items.length} mvt{g.items.length > 1 ? "s" : ""}
                  </span>
                </span>
                <span
                  className={cn(
                    "text-[13px] font-bold tabular-nums",
                    g.net >= 0 ? "text-[var(--admin-success)]" : "text-[var(--admin-danger)]",
                  )}
                >
                  {g.net >= 0 ? "+" : "−"}
                  {Math.abs(g.net).toFixed(2)} €
                </span>
              </button>
              {isOpen ? (
                <ul
                  className="divide-y border-t px-3"
                  style={{ borderColor: "var(--admin-border)" }}
                >
                  {g.structured.map((it) =>
                    it.kind === "single" ? (
                      <li key={it.mv.id}>
                        <MovementLine mv={it.mv} />
                      </li>
                    ) : (
                      <li key={it.groupKey}>
                        <BatchGroupRow
                          group={it}
                          open={openBatches.has(it.groupKey)}
                          onToggle={() => toggleBatch(it.groupKey)}
                        />
                      </li>
                    ),
                  )}
                </ul>
              ) : null}
            </Card>
          );
        })}
      </Stack>
    </div>
  );
}

function MovementLine({ mv, inner = false }: { mv: MovementRow; inner?: boolean }) {
  const amt = Number(mv.amount);
  const positive = amt >= 0;
  const body = (
    <>
      <span className="min-w-0">
        <span className="block truncate text-[14px] font-medium text-[var(--admin-text)]">
          {mv.title}
        </span>
        <span className="block truncate text-[12px] text-[var(--admin-text-subtle)]">
          {KIND_LABEL[mv.kind]} · {mv.pocketName} ·{" "}
          {new Date(mv.occurredAt).toLocaleDateString("fr-FR")}
        </span>
      </span>
      <span className="flex shrink-0 items-center gap-1">
        <span
          className={cn(
            "text-[14px] font-bold tabular-nums",
            positive ? "text-[var(--admin-success)]" : "text-[var(--admin-danger)]",
          )}
        >
          {positive ? "+" : "−"}
          {Math.abs(amt).toFixed(2)} €
        </span>
        {mv.href ? (
          <ChevronRight
            size={15}
            className="text-[var(--admin-text-subtle)]"
            aria-hidden
          />
        ) : null}
      </span>
    </>
  );
  const cls = cn(
    "flex items-center justify-between gap-3 py-2.5 tap-scale",
    inner ? "pl-6 pr-1" : "",
  );
  return mv.href ? (
    <Link href={mv.href} prefetch className={cls}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

function BatchGroupRow({
  group,
  open,
  onToggle,
}: {
  group: Extract<MovementItem, { kind: "batchGroup" }>;
  open: boolean;
  onToggle: () => void;
}) {
  const positive = group.net >= 0;
  return (
    <>
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-3 py-2.5 tap-scale"
      >
        <span className="flex min-w-0 items-center gap-2">
          <ChevronDown
            size={14}
            className={cn(
              "shrink-0 text-[var(--admin-text-subtle)] transition-transform",
              open ? "" : "-rotate-90",
            )}
            aria-hidden
          />
          <span className="min-w-0">
            <span className="block truncate text-[14px] font-medium text-[var(--admin-text)]">
              Dépenses lot · {group.groupLabel}
            </span>
            <span className="block truncate text-[12px] text-[var(--admin-text-subtle)]">
              {group.items.length} ligne{group.items.length > 1 ? "s" : ""} regroupée
              {group.items.length > 1 ? "s" : ""}
            </span>
          </span>
        </span>
        <span
          className={cn(
            "shrink-0 text-[14px] font-bold tabular-nums",
            positive ? "text-[var(--admin-success)]" : "text-[var(--admin-danger)]",
          )}
        >
          {positive ? "+" : "−"}
          {Math.abs(group.net).toFixed(2)} €
        </span>
      </button>
      {open ? (
        <ul
          className="divide-y border-t"
          style={{ borderColor: "var(--admin-border)" }}
        >
          {group.items.map((mv) => (
            <li key={mv.id}>
              <MovementLine mv={mv} inner />
            </li>
          ))}
        </ul>
      ) : null}
    </>
  );
}
