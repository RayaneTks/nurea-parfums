"use client";

import { useEffect, useRef, useState } from "react";
import { createCoalescer, type Coalescer } from "@/app-shell/hooks/coalesce";
import { useAction } from "@/app-shell/hooks/useAction";
import type { ActionError } from "@/contracts/result";
import { setLineDeliveredAction } from "@/server/documents/actions";
import { Button } from "@/ui/primitives/Button";
import { Stepper } from "@/ui/primitives/Stepper";
import { Text } from "@/ui/primitives/Text";

type LineDeliveryProps = {
  documentId: string;
  line: { id: string; perfumeName: string; quantity: number; deliveredQuantity: number; volumeMl: number | null };
  /** Refus de validation (ligne reprise hors règles) : la fiche s'ouvre en édition sur la ligne. */
  onValidation: (error: ActionError) => void;
};

type Input = { documentId: string; lineId: string; deliveredQuantity: number };

/**
 * Pointage d'une ligne (06 S01 zone 4, T3) : `Stepper` 0..quantité et « Tout » — 1 tap pour une ligne entière.
 * Optimiste : la valeur s'affiche tout de suite ; la valeur FINALE part 400 ms après le dernier tap (04 §3.7), et
 * part aussi si la fiche se ferme avant. Refus (réserve de stock annulée, ligne hors règles, réseau) : la valeur
 * d'avant revient, le toast dit pourquoi.
 */
export function LineDelivery({ documentId, line, onValidation }: LineDeliveryProps) {
  const [local, setLocal] = useState<number | null>(null);
  const shown = local ?? line.deliveredQuantity;
  const onValidationRef = useRef(onValidation);
  useEffect(() => {
    onValidationRef.current = onValidation;
  }, [onValidation]);

  const { run } = useAction(setLineDeliveredAction);
  const runRef = useRef(run);
  useEffect(() => {
    runRef.current = run;
  }, [run]);

  const coalescer = useRef<Coalescer<Input> | null>(null);
  /** Créé au premier geste (jamais pendant le rendu). */
  const coalescerOf = () => {
    coalescer.current ??= createCoalescer<Input>((input) => {
      void runRef.current(input).then((result) => {
        if (result.ok) return;
        setLocal(null);
        if (result.error.code === "VALIDATION") onValidationRef.current(result.error);
      });
    });
    return coalescer.current;
  };

  // La vérité revenue du serveur remplace la valeur optimiste.
  useEffect(() => {
    if (local !== null && line.deliveredQuantity === local && !coalescer.current?.hasPending()) setLocal(null);
  }, [line.deliveredQuantity, local]);

  // Fiche fermée ou app en arrière-plan : le dernier pointage part quand même.
  useEffect(() => {
    const flush = () => {
      if (document.visibilityState === "hidden") coalescer.current?.flush();
    };
    document.addEventListener("visibilitychange", flush);
    return () => {
      document.removeEventListener("visibilitychange", flush);
      // La valeur COURANTE au démontage est voulue : le dernier pointage part.
      coalescer.current?.flush();
    };
  }, []);

  const set = (value: number) => {
    setLocal(value);
    coalescerOf().schedule({ documentId, lineId: line.id, deliveredQuantity: value });
  };

  const label = `${line.perfumeName}${line.volumeMl ? ` ${line.volumeMl} ml` : ""}`;

  return (
    <div className="flex items-center justify-between gap-2" data-line-delivery={line.id}>
      <Text variant="caption" tone="muted" className="tnum">
        Livré {shown}/{line.quantity}
      </Text>
      <Stepper
        value={shown}
        min={0}
        max={line.quantity}
        onChange={set}
        ariaLabel={`Livré de ${label}`}
        trailing={
          <Button
            variant="secondary"
            size="sm"
            disabled={shown === line.quantity}
            onClick={() => set(line.quantity)}
            ariaLabel={`Tout livrer : ${label}`}
          >
            Tout
          </Button>
        }
      />
    </div>
  );
}
