"use client";

import { useState } from "react";
import { useShellSheet } from "@/app-shell/SheetRegistry";
import { useToast } from "@/app-shell/FeedbackProvider";
import { FormField } from "@/ui/patterns/FormField";
import { ShareButton, shareOrCopy } from "@/ui/patterns/ShareButton";
import { Button } from "@/ui/primitives/Button";
import { Sheet } from "@/ui/primitives/Sheet";
import { Textarea } from "@/ui/primitives/Textarea";

/**
 * S09 — Relancer (06 S09, N5) : le message pré-rédigé, modifiable, envoyé par la feuille de partage iOS (repli :
 * copie + « Message copié »).
 */
export function RelanceSheet({ open, onClose, name, text }: { open: boolean; onClose: () => void; name: string; text: string }) {
  const { showToast } = useToast();
  const [message, setMessage] = useState(text);
  useShellSheet(open, onClose);
  const feedback = (msg: string, type: "success" | "error") => showToast({ type, message: msg });
  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      title={`Relancer · ${name}`}
      size="auto"
    >
      <div className="flex flex-col gap-4">
        {/* Hauteur bornée : clavier ouvert sur un iPhone SE, le champ entier reste au-dessus du clavier. */}
        <FormField label="Message">
          {(field) => <Textarea {...field} value={message} onChange={(e) => setMessage(e.target.value)} rows={4} />}
        </FormField>
        {/* Sheet de saisie courte : les boutons dans le corps, sous le message (règle de S20). */}
        <div className="flex flex-col gap-2">
          <ShareButton payload={{ text: message }} label="Envoyer…" variant="primary" size="lg" fullWidth onFeedback={feedback} />
          <Button
            variant="secondary"
            fullWidth
            onClick={() =>
              void shareOrCopy({ text: message }, { clipboard: navigator.clipboard }).then((outcome) => {
                if (outcome === "copied") feedback("Message copié", "success");
                else feedback("Copie impossible sur cet appareil.", "error");
              })
            }
          >
            Copier
          </Button>
        </div>
      </div>
    </Sheet>
  );
}
