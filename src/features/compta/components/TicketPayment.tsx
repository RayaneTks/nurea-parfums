"use client";

import { useMemo } from "react";
import { Card } from "@/ui/primitives/Card";
import { Input } from "@/ui/primitives/Input";
import { Money } from "@/ui/patterns/Money";
import { Check, AlertCircle } from "lucide-react";
import { formateEuros } from "@/ui/patterns/format";

type TicketPaymentProps = {
  total: number;
  remainingDue: string;
  mode: "view" | "edit";
  onChange: (value: string) => void;
};

function parseAmount(raw: string): number {
  const n = Number(String(raw).replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

export function TicketPayment({ total, remainingDue, mode, onChange }: TicketPaymentProps) {
  const rem = useMemo(() => parseAmount(remainingDue), [remainingDue]);
  const paid = Math.max(0, total - rem);
  /*
   * Les deux termes d'un même rapport reçoivent la même précision.
   *
   * « 160 € reçus sur 160,50 € » laisse croire à deux échelles de mesure. Dès
   * que l'un des deux porte des centimes, les deux les portent : c'est ce qui
   * permet de lire le rapport d'un coup au lieu de le reconstituer.
   */
  const centimes =
    Math.round(paid * 100) % 100 !== 0 || Math.round(total * 100) % 100 !== 0;
  const isFullyPaid = rem <= 0;
  const isOver = rem > total + 0.001;

  if (mode === "view") {
    return (
      <Card padding={3} tone={isFullyPaid ? "surface" : "alt"}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            {isFullyPaid ? (
              <span
                className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
                style={{
                  background: "var(--admin-success-bg)",
                  color: "var(--admin-success)",
                }}
                aria-hidden
              >
                <Check size={14} />
              </span>
            ) : (
              <span
                className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
                style={{
                  background: "var(--admin-warning-bg)",
                  color: "var(--admin-warning)",
                }}
                aria-hidden
              >
                <AlertCircle size={14} />
              </span>
            )}
            <div className="min-w-0">
              <p className="text-[13px] font-semibold leading-tight text-[var(--admin-text)]">
                {isFullyPaid ? "Payé intégralement" : "Paiement partiel"}
              </p>
              <p className="text-[11px] tabular-nums text-[var(--admin-text-subtle)]">
                <Money value={paid} compact={!centimes} /> reçus sur{" "}
                <Money value={total} compact={!centimes} />
              </p>
            </div>
          </div>
          {!isFullyPaid ? (
            <div className="text-right">
              <p className="text-[11px] uppercase tracking-[0.04em] text-[var(--admin-text-subtle)]">
                À encaisser
              </p>
              <span
                className="tnum whitespace-nowrap text-[14px] font-semibold"
                style={{ color: "var(--admin-warning)" }}
              >
                {formateEuros(rem, { compact: true })}
              </span>
            </div>
          ) : null}
        </div>
      </Card>
    );
  }

  return (
    <Card padding={3} tone="surface">
      <div className="space-y-2">
        {/*
          Ce champ stocke ce qui RESTERA dû, pas ce que le client vient de
          donner. C'était la source d'erreur : au comptoir on pense « il m'a
          donné 50 € », et on tapait 50 dans un champ qui voulait dire
          « il en doit encore 50 ». Le flux de données n'est pas renversé — ce
          serait toucher à un chemin d'argent pour un problème de mots — mais
          le champ dit désormais ce qu'il attend, et le rappel se lit AVANT la
          saisie.
        */}
        <div className="flex items-center justify-between gap-3">
          <p className="text-[13px] font-medium text-[var(--admin-text)]">
            Restera à encaisser
          </p>
          <p className="text-[11px] tabular-nums text-[var(--admin-text-subtle)]">
            <Money value={paid} compact={!centimes} /> reçus sur{" "}
            <Money value={total} compact={!centimes} />
          </p>
        </div>
        <Input
          type="text"
          inputMode="decimal"
          value={remainingDue}
          onChange={(e) => onChange(e.target.value)}
          placeholder="0"
          numeric
          aria-label="Ce qui restera à encaisser après ce paiement, en euros"
          enterKeyHint="done"
          error={isOver ? "Supérieur au total de la vente" : undefined}
          hint={!isOver ? "Mets 0 si le client solde tout" : undefined}
        />
      </div>
    </Card>
  );
}
