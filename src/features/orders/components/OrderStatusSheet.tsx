"use client";

import { useState, useTransition } from "react";
import type { OrderStatus } from "@prisma/client";
import { ArrowRightLeft, Check, ShieldAlert } from "lucide-react";
import { Sheet } from "@/ui/primitives/Sheet";
import { Button } from "@/ui/primitives/Button";
import { Stack } from "@/ui/primitives/Stack";
import { transitionOrderStatusAction } from "@/server/orders/actions";
import { useToast } from "@/ui/providers/ToastProvider";

const STATUS_META: Record<
  OrderStatus,
  { label: string; description: string; tone: "warning" | "success" | "neutral" | "danger" }
> = {
  PENDING: {
    label: "En attente",
    description: "Commande prise — pas encore d'acompte / pas encore prête.",
    tone: "warning",
  },
  READY: {
    label: "À traiter",
    description: "Prête à être livrée / encaissée.",
    tone: "success",
  },
  DELIVERED: {
    label: "Livrée",
    description: "Encaissée et remise au client.",
    tone: "neutral",
  },
  CANCELLED: {
    label: "Annulée",
    description: "Commande abandonnée.",
    tone: "danger",
  },
};

const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ["READY", "DELIVERED", "CANCELLED"],
  READY: ["PENDING", "DELIVERED", "CANCELLED"],
  DELIVERED: ["READY", "PENDING"],
  CANCELLED: ["PENDING", "READY"],
};

const TONE_BG: Record<"warning" | "success" | "neutral" | "danger", string> = {
  warning: "var(--admin-warning-bg)",
  success: "var(--admin-success-bg)",
  neutral: "var(--admin-surface-muted)",
  danger: "var(--admin-danger-bg)",
};

const TONE_FG: Record<"warning" | "success" | "neutral" | "danger", string> = {
  warning: "var(--admin-warning)",
  success: "var(--admin-success)",
  neutral: "var(--admin-text-muted)",
  danger: "var(--admin-danger)",
};

type OrderStatusSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  currentStatus: OrderStatus;
  hasSale: boolean;
  onChanged?: (next: OrderStatus) => void;
};

export function OrderStatusSheet({
  open,
  onOpenChange,
  orderId,
  currentStatus,
  hasSale,
  onChanged,
}: OrderStatusSheetProps) {
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [target, setTarget] = useState<OrderStatus | null>(null);

  const allowed = ALLOWED_TRANSITIONS[currentStatus] ?? [];
  const dangerous: OrderStatus[] = ["DELIVERED", "CANCELLED"];

  const apply = (next: OrderStatus) => {
    setTarget(next);
    startTransition(async () => {
      const result = await transitionOrderStatusAction(orderId, next);
      setTarget(null);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`Statut changé : ${STATUS_META[next].label}`);
      onOpenChange(false);
      onChanged?.(result.data.status);
    });
  };

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title="Changer le statut"
      description="Le changement est immédiat. Aucun paiement n'est créé automatiquement."
      maxVh={70}
    >
      <Stack gap={2}>
        <div
          className="flex items-center gap-2 rounded-[12px] px-3 py-2 text-[12px]"
          style={{ background: TONE_BG[STATUS_META[currentStatus].tone], color: TONE_FG[STATUS_META[currentStatus].tone] }}
        >
          <Check size={14} aria-hidden />
          <span>
            Actuel : <strong className="font-semibold">{STATUS_META[currentStatus].label}</strong>
          </span>
        </div>

        {hasSale && (currentStatus === "DELIVERED") ? (
          <div
            className="flex items-start gap-2 rounded-[12px] px-3 py-2 text-[12px]"
            style={{ background: "var(--admin-warning-bg)", color: "var(--admin-warning)" }}
          >
            <ShieldAlert size={14} aria-hidden className="mt-0.5 shrink-0" />
            <p>
              Une vente est rattachée à cette commande. Tu ne peux pas la « dé-livrer ».
            </p>
          </div>
        ) : null}

        <ul className="space-y-1.5">
          {allowed.map((next) => {
            const meta = STATUS_META[next];
            const isDangerous = dangerous.includes(next);
            const disabled =
              pending ||
              (currentStatus === "DELIVERED" && hasSale);
            return (
              <li key={next}>
                <button
                  type="button"
                  onClick={() => apply(next)}
                  disabled={disabled}
                  className="flex w-full items-center gap-3 rounded-[12px] bg-[var(--admin-surface)] px-3 py-3 text-left tap-scale active:bg-[var(--admin-surface-muted)] disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ border: "1px solid var(--admin-border)" }}
                >
                  <span
                    className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                    style={{ background: TONE_BG[meta.tone], color: TONE_FG[meta.tone] }}
                  >
                    <ArrowRightLeft size={14} aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[14px] font-semibold text-[var(--admin-text)]">
                      {meta.label}
                      {isDangerous ? (
                        <span
                          className="ml-2 inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.04em]"
                          style={{
                            background: TONE_BG[meta.tone],
                            color: TONE_FG[meta.tone],
                          }}
                        >
                          Sensible
                        </span>
                      ) : null}
                    </span>
                    <span className="mt-0.5 block text-[12px] text-[var(--admin-text-subtle)]">
                      {meta.description}
                    </span>
                  </span>
                  {target === next && pending ? (
                    <span
                      className="inline-flex h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-current border-r-transparent"
                      style={{ color: "var(--admin-text-subtle)" }}
                      aria-label="Chargement"
                    />
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>

        <Button
          type="button"
          variant="ghost"
          size="md"
          fullWidth
          onClick={() => onOpenChange(false)}
        >
          Annuler
        </Button>
      </Stack>
    </Sheet>
  );
}
