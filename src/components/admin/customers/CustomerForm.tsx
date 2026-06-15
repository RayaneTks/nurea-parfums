"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/ui/primitives/Input";
import { Textarea } from "@/ui/primitives/Textarea";
import { Button } from "@/ui/primitives/Button";
import { Stack } from "@/ui/primitives/Stack";
import { Toast, type ToastType } from "@/ui/primitives/Toast";
import { StickyAction } from "@/ui/primitives/StickyAction";
import { createCustomerAction, updateCustomerAction } from "@/server/customers/actions";
import type { CustomerCreate } from "@/schemas/customer";

type Mode = "create" | "edit";

type CustomerFormProps = {
  mode: Mode;
  initial?: {
    id: string;
    fullName: string;
    phoneE164: string | null;
    snapchat: string | null;
    whatsappE164: string | null;
    address: string | null;
    notes: string | null;
  };
  redirectTo?: string;
};

function emptyToNull(v: string): string | null {
  const t = v.trim();
  return t === "" ? null : t;
}

export function CustomerForm({ mode, initial, redirectTo }: CustomerFormProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [toast, setToast] = useState<{ type: ToastType; message: string } | null>(null);

  const [fullName, setFullName] = useState(initial?.fullName ?? "");
  const [phoneE164, setPhone] = useState(initial?.phoneE164 ?? "");
  const [snapchat, setSnapchat] = useState(initial?.snapchat ?? "");
  const [whatsappE164, setWhatsapp] = useState(initial?.whatsappE164 ?? "");
  const [address, setAddress] = useState(initial?.address ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");

  const submit = () => {
    const payload: CustomerCreate = {
      fullName,
      phoneE164: emptyToNull(phoneE164),
      snapchat: emptyToNull(snapchat),
      whatsappE164: emptyToNull(whatsappE164),
      address: emptyToNull(address),
      notes: emptyToNull(notes),
    };

    startTransition(async () => {
      const result =
        mode === "create"
          ? await createCustomerAction(payload)
          : await updateCustomerAction(initial!.id, payload);

      if (!result.ok) {
        setToast({ type: "error", message: result.error });
        return;
      }
      setToast({
        type: "success",
        message: mode === "create" ? "Client créé." : "Fiche enregistrée.",
      });
      router.push(
        redirectTo ?? `/admin/clients/${mode === "create" ? result.data.id : initial!.id}`,
      );
      router.refresh();
    });
  };

  return (
    <>
      <form
        className="flex flex-col"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <Stack gap={3} className="pb-2">
          <Input
            label="Nom complet"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Alice Dupont"
            autoComplete="name"
            enterKeyHint="next"
          />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input
              label="Téléphone"
              value={phoneE164}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+33612345678"
              inputMode="tel"
              autoComplete="tel"
              hint="Format international (+33…)"
              enterKeyHint="next"
            />
            <Input
              label="WhatsApp"
              value={whatsappE164}
              onChange={(e) => setWhatsapp(e.target.value)}
              placeholder="+33612345678"
              inputMode="tel"
              enterKeyHint="next"
            />
          </div>
          <Input
            label="Snapchat"
            value={snapchat}
            onChange={(e) => setSnapchat(e.target.value)}
            placeholder="pseudo"
            autoCapitalize="none"
            enterKeyHint="next"
          />
          <Input
            label="Adresse"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Rue, ville, code postal"
            autoComplete="street-address"
            enterKeyHint="next"
          />
          <Textarea
            label="Notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Préférences, allergies, contexte…"
            enterKeyHint="done"
          />
        </Stack>

        <div aria-hidden className="admin-sticky-cta-spacer" />

        <StickyAction>
          <Button type="submit" variant="primary" size="lg" fullWidth isLoading={pending}>
            {mode === "create" ? "Créer le client" : "Enregistrer"}
          </Button>
        </StickyAction>
      </form>

      {toast ? (
        <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />
      ) : null}
    </>
  );
}
