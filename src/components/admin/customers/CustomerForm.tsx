"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AdminInput } from "../ui/AdminInput";
import { AdminButton } from "../ui/AdminButton";
import { AdminToast, type ToastType } from "../ui/AdminToast";
import { StickyAction } from "../shell/StickyAction";
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
      setToast({ type: "success", message: mode === "create" ? "Client créé." : "Client mis à jour." });
      router.push(redirectTo ?? `/admin/clients/${mode === "create" ? result.data.id : initial!.id}`);
      router.refresh();
    });
  };

  return (
    <>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <AdminInput
          label="Nom complet"
          required
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Alice Dupont"
          autoComplete="name"
        />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <AdminInput
            label="Téléphone (E.164)"
            value={phoneE164}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+33612345678"
            inputMode="tel"
            autoComplete="tel"
          />
          <AdminInput
            label="WhatsApp (E.164)"
            value={whatsappE164}
            onChange={(e) => setWhatsapp(e.target.value)}
            placeholder="+33612345678"
            inputMode="tel"
          />
        </div>
        <AdminInput
          label="Snapchat"
          value={snapchat}
          onChange={(e) => setSnapchat(e.target.value)}
          placeholder="username"
        />
        <AdminInput
          label="Adresse"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Rue, ville, code postal"
        />
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-700">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Préférences, allergies, contexte…"
            className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-nurea-bordeaux/40"
          />
        </div>

        <StickyAction>
          <AdminButton type="submit" isLoading={pending} className="w-full">
            {mode === "create" ? "Créer le client" : "Enregistrer"}
          </AdminButton>
        </StickyAction>
      </form>

      {toast ? (
        <AdminToast type={toast.type} message={toast.message} onClose={() => setToast(null)} />
      ) : null}
    </>
  );
}
