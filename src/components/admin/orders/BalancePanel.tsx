"use client";

import { useCallback, useState, useTransition } from "react";
import { CheckCircle2, Clock, CreditCard, MinusCircle, Plus, RotateCcw } from "lucide-react";
import { SectionCard } from "../ui/SectionCard";
import { AdminButton } from "../ui/AdminButton";
import { AdminInput } from "../ui/AdminInput";
import { AdminToast, type ToastType } from "../ui/AdminToast";
import { BottomSheet } from "../shell/BottomSheet";
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

const TYPE_TONE: Record<PaymentTypeValue, string> = {
  DEPOSIT: "bg-amber-50 text-amber-800 border-amber-200",
  BALANCE: "bg-emerald-50 text-emerald-800 border-emerald-200",
  REFUND: "bg-red-50 text-red-800 border-red-200",
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

  return (
    <>
      <SectionCard>
        <h2 className="mb-3 text-sm font-semibold text-neutral-900">Acomptes & solde</h2>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-lg bg-neutral-50 p-2">
            <p className="text-[10px] uppercase tracking-wider text-neutral-500">Total</p>
            <p className="mt-0.5 text-sm font-semibold tabular-nums">{totalNum.toFixed(2)} €</p>
          </div>
          <div className="rounded-lg bg-emerald-50 p-2">
            <p className="text-[10px] uppercase tracking-wider text-emerald-700">Payé</p>
            <p className="mt-0.5 text-sm font-semibold tabular-nums text-emerald-800">
              {totalPaidNum.toFixed(2)} €
            </p>
          </div>
          <div
            className={
              dueNum > 0.005
                ? "rounded-lg bg-amber-50 p-2"
                : "rounded-lg bg-neutral-50 p-2"
            }
          >
            <p
              className={
                dueNum > 0.005
                  ? "text-[10px] uppercase tracking-wider text-amber-700"
                  : "text-[10px] uppercase tracking-wider text-neutral-500"
              }
            >
              Dû
            </p>
            <p
              className={
                dueNum > 0.005
                  ? "mt-0.5 text-sm font-semibold tabular-nums text-amber-800"
                  : "mt-0.5 text-sm font-semibold tabular-nums"
              }
            >
              {dueNum.toFixed(2)} €
            </p>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <AdminButton type="button" variant="primary" size="sm" onClick={() => openSheet("DEPOSIT")}>
            <Plus size={14} /> Acompte
          </AdminButton>
          <AdminButton type="button" variant="outline" size="sm" onClick={() => openSheet("BALANCE")}>
            <CreditCard size={14} /> Solde
          </AdminButton>
        </div>

        {payments.length > 0 ? (
          <div className="mt-4">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-500">
              Historique
            </h3>
            <ul className="space-y-1.5">
              {payments.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center justify-between gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm"
                >
                  <span className="inline-flex min-w-0 items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${TYPE_TONE[p.type]}`}
                    >
                      {p.type === "DEPOSIT" ? <Clock size={10} /> : null}
                      {p.type === "BALANCE" ? <CheckCircle2 size={10} /> : null}
                      {p.type === "REFUND" ? <MinusCircle size={10} /> : null}
                      {TYPE_LABEL[p.type]}
                    </span>
                    <span className="truncate text-neutral-600">
                      {new Date(p.paidAt).toLocaleDateString("fr-FR", {
                        day: "2-digit",
                        month: "short",
                      })}
                      {p.method ? ` · ${p.method}` : ""}
                    </span>
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <span className="text-sm font-semibold tabular-nums">
                      {Number(p.amount).toFixed(2)} €
                    </span>
                    {p.type !== "REFUND" ? (
                      <button
                        type="button"
                        onClick={() => voidPayment(p.id)}
                        disabled={pending}
                        className="rounded p-1 text-neutral-400 hover:text-red-600 disabled:opacity-50"
                        aria-label="Annuler ce paiement (crée un REFUND)"
                        title="Annuler (crée REFUND)"
                      >
                        <RotateCcw size={12} />
                      </button>
                    ) : null}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </SectionCard>

      <BottomSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        title={sheetType === "DEPOSIT" ? "Enregistrer un acompte" : "Enregistrer le solde"}
        description={
          sheetType === "DEPOSIT"
            ? "Premier acompte → passe automatiquement en « à traiter »."
            : `Reste dû : ${dueNum.toFixed(2)} €.`
        }
      >
        <div className="space-y-3">
          <AdminInput
            label="Montant €"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="50"
            autoFocus
          />
          <AdminInput
            label="Méthode (opt.)"
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            placeholder="cash, virement, snap-pay…"
          />
          <AdminInput
            label="Note (opt.)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder=""
          />
          <AdminButton
            type="button"
            variant="primary"
            isLoading={pending}
            onClick={submit}
            className="w-full"
          >
            Enregistrer
          </AdminButton>
        </div>
      </BottomSheet>

      {toast ? (
        <AdminToast type={toast.type} message={toast.message} onClose={() => setToast(null)} />
      ) : null}
    </>
  );
}
