"use client";

import { useCallback, useState, useTransition } from "react";
import { CheckCircle2, Clock, CreditCard, MinusCircle, Plus, RotateCcw } from "lucide-react";
import { Card } from "@/ui/primitives/Card";
import { Button } from "@/ui/primitives/Button";
import { Input } from "@/ui/primitives/Input";
import { Stack, HStack } from "@/ui/primitives/Stack";
import { Toast, type ToastType } from "@/ui/primitives/Toast";
import { Sheet } from "@/ui/primitives/Sheet";
import { Money } from "@/ui/patterns/Money";
import { recordPaymentAction, voidPaymentAction } from "@/server/orders/paymentActions";
import type { OrderBalance, PaymentRow } from "@/server/orders/payments";
import type { PaymentTypeValue } from "@/schemas/payment";

type BalancePanelProps = {
  orderId: string;
  initialBalance: OrderBalance;
  initialPayments: PaymentRow[];
};

const TYPE_LABEL: Record<PaymentTypeValue, string> = {
  DEPOSIT: "Acompte",
  BALANCE: "Solde",
  REFUND: "Remboursement",
};

type TypeToneStyle = { bg: string; fg: string; border: string };

const TYPE_TONE: Record<PaymentTypeValue, TypeToneStyle> = {
  DEPOSIT: {
    bg: "color-mix(in srgb, var(--admin-warning, #B07A2A) 12%, transparent)",
    fg: "var(--admin-warning, #8A5A1A)",
    border: "color-mix(in srgb, var(--admin-warning, #B07A2A) 35%, transparent)",
  },
  BALANCE: {
    bg: "var(--admin-success-bg)",
    fg: "var(--admin-success)",
    border: "color-mix(in srgb, var(--admin-success) 35%, transparent)",
  },
  REFUND: {
    bg: "var(--admin-danger-bg)",
    fg: "var(--admin-danger)",
    border: "color-mix(in srgb, var(--admin-danger) 35%, transparent)",
  },
};

export function BalancePanel({ orderId, initialBalance, initialPayments }: BalancePanelProps) {
  const [balance, setBalance] = useState<OrderBalance>(initialBalance);
  const [payments, setPayments] = useState<PaymentRow[]>(initialPayments);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetType, setSheetType] = useState<PaymentTypeValue>("BALANCE");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("");
  const [note, setNote] = useState("");
  const [pending, startTransition] = useTransition();
  const [toast, setToast] = useState<{ type: ToastType; message: string } | null>(null);

  const openSheet = (t: PaymentTypeValue) => {
    setSheetType(t);
    const dueNum = Number(balance.due);
    setAmount(t === "BALANCE" && dueNum > 0 ? dueNum.toFixed(2) : "");
    setMethod("");
    setNote("");
    setSheetOpen(true);
  };

  const refreshFromServer = useCallback(async () => {
    const [bRes, pRes] = await Promise.all([
      fetch(`/api/admin/orders/${orderId}/balance`, { credentials: "include", cache: "no-store" }).catch(
        () => null,
      ),
      fetch(`/api/admin/orders/${orderId}/payments`, { credentials: "include", cache: "no-store" }),
    ]);
    if (bRes?.ok) {
      const json = (await bRes.json()) as { balance?: OrderBalance };
      if (json.balance) setBalance(json.balance);
    }
    if (pRes.ok) {
      const json = (await pRes.json()) as { rows?: PaymentRow[] };
      setPayments(json.rows ?? []);
    }
  }, [orderId]);

  const submit = () => {
    if (Number(amount.replace(",", ".")) <= 0) {
      setToast({ type: "error", message: "Montant > 0 requis." });
      return;
    }
    startTransition(async () => {
      const result = await recordPaymentAction({
        orderId,
        type: sheetType,
        amount: amount.replace(",", "."),
        method: method.trim() || null,
        note: note.trim() || null,
      });
      if (!result.ok) {
        setToast({ type: "error", message: result.error });
        return;
      }
      setToast({ type: "success", message: "Paiement enregistré." });
      setSheetOpen(false);
      await refreshFromServer();
    });
  };

  const voidPayment = (paymentId: string) => {
    startTransition(async () => {
      const result = await voidPaymentAction({ paymentId, reason: null });
      if (!result.ok) {
        setToast({ type: "error", message: result.error });
        return;
      }
      setToast({ type: "success", message: "Paiement annulé." });
      await refreshFromServer();
    });
  };

  const dueNum = Number(balance.due);
  const totalPaidNum = Number(balance.totalPaid);
  const totalNum = Number(balance.total);
  const hasDue = dueNum > 0.005;

  return (
    <>
      <Card padding={3}>
        <h2 className="mb-3 text-[13px] font-semibold text-[var(--admin-text)]">
          Acomptes & solde
        </h2>

        <div className="grid grid-cols-3 gap-2">
          <Card padding={2} tone="muted" elevated={false} borderless>
            <p className="text-[10px] font-medium uppercase tracking-[0.04em] text-[var(--admin-text-subtle)]">
              Total
            </p>
            <p className="mt-0.5">
              <Money value={totalNum} bold className="text-[14px]" />
            </p>
          </Card>
          <div
            className="rounded-[14px] p-2"
            style={{ background: "var(--admin-success-bg)" }}
          >
            <p
              className="text-[10px] font-medium uppercase tracking-[0.04em]"
              style={{ color: "var(--admin-success)" }}
            >
              Payé
            </p>
            <p className="mt-0.5">
              <Money value={totalPaidNum} bold tone="success" className="text-[14px]" />
            </p>
          </div>
          <div
            className="rounded-[14px] p-2"
            style={{
              background: hasDue
                ? "var(--admin-danger-bg)"
                : "var(--admin-surface-muted)",
            }}
          >
            <p
              className="text-[10px] font-medium uppercase tracking-[0.04em]"
              style={{
                color: hasDue ? "var(--admin-danger)" : "var(--admin-text-subtle)",
              }}
            >
              Dû
            </p>
            <p className="mt-0.5">
              <Money
                value={dueNum}
                bold
                tone={hasDue ? "danger" : "muted"}
                className="text-[14px]"
              />
            </p>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant="primary"
            size="sm"
            leadingIcon={<Plus size={14} />}
            onClick={() => openSheet("DEPOSIT")}
          >
            Acompte
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            leadingIcon={<CreditCard size={14} />}
            onClick={() => openSheet("BALANCE")}
          >
            Solde
          </Button>
        </div>

        {payments.length > 0 ? (
          <div className="mt-4">
            <h3 className="mb-2 text-[11px] font-bold uppercase tracking-[0.06em] text-[var(--admin-text-muted)]">
              Historique
            </h3>
            <Stack gap={2} as="ul">
              {payments.map((p) => {
                const tone = TYPE_TONE[p.type];
                return (
                  <li
                    key={p.id}
                    className="flex items-center justify-between gap-2 rounded-[12px] px-3 py-2"
                    style={{
                      background: "var(--admin-surface-alt)",
                      border: "1px solid var(--admin-border)",
                    }}
                  >
                    <span className="inline-flex min-w-0 items-center gap-2">
                      <span
                        className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold"
                        style={{
                          background: tone.bg,
                          color: tone.fg,
                          border: `1px solid ${tone.border}`,
                        }}
                      >
                        {p.type === "DEPOSIT" ? <Clock size={10} /> : null}
                        {p.type === "BALANCE" ? <CheckCircle2 size={10} /> : null}
                        {p.type === "REFUND" ? <MinusCircle size={10} /> : null}
                        {TYPE_LABEL[p.type]}
                      </span>
                      <span className="truncate text-[12px] text-[var(--admin-text-muted)]">
                        {new Date(p.paidAt).toLocaleDateString("fr-FR", {
                          day: "2-digit",
                          month: "short",
                        })}
                        {p.method ? ` · ${p.method}` : ""}
                      </span>
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Money value={p.amount} bold className="text-[14px]" />
                      {p.type !== "REFUND" ? (
                        <button
                          type="button"
                          onClick={() => voidPayment(p.id)}
                          disabled={pending}
                          className="rounded-full p-1.5 text-[var(--admin-text-subtle)] tap-scale hover:bg-[var(--admin-danger-bg)] hover:text-[var(--admin-danger)] disabled:opacity-50"
                          aria-label="Annuler ce paiement (crée un REFUND)"
                          title="Annuler (crée REFUND)"
                        >
                          <RotateCcw size={12} />
                        </button>
                      ) : null}
                    </span>
                  </li>
                );
              })}
            </Stack>
          </div>
        ) : null}
      </Card>

      <Sheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        title={sheetType === "DEPOSIT" ? "Enregistrer un acompte" : "Enregistrer le solde"}
        description={
          sheetType === "DEPOSIT"
            ? "Premier acompte → passe automatiquement en « à traiter »."
            : `Reste dû : ${dueNum.toFixed(2)} €.`
        }
        footer={
          <Button
            type="button"
            variant="primary"
            size="lg"
            fullWidth
            isLoading={pending}
            onClick={submit}
          >
            Enregistrer
          </Button>
        }
      >
        <Stack gap={3}>
          <Input
            label="Montant €"
            inputMode="decimal"
            variant="elevated"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="50"
            autoFocus
          />
          <Input
            label="Méthode (opt.)"
            variant="elevated"
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            placeholder="cash, virement, snap-pay…"
          />
          <Input
            label="Note (opt.)"
            variant="elevated"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder=""
          />
        </Stack>
      </Sheet>

      {toast ? (
        <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />
      ) : null}
    </>
  );
}
