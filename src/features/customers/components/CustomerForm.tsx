"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { useAction } from "@/app-shell/hooks/useAction";
import { routes } from "@/app-shell/routes";
import type { CustomerDirectoryEntry, CustomerSummary } from "@/contracts/customers";
import { newId } from "@/domain/ids";
import { formatPhoneNational } from "@/domain/phone";
import { useLeaveGuard } from "@/features/catalogue/components/useLeaveGuard";
import { createCustomerAction, updateCustomerAction } from "@/server/customers/actions";
import { FormField } from "@/ui/patterns/FormField";
import { FormSection } from "@/ui/patterns/FormSection";
import { Button } from "@/ui/primitives/Button";
import { Input } from "@/ui/primitives/Input";
import { StickyAction } from "@/ui/primitives/StickyAction";
import { Text } from "@/ui/primitives/Text";
import { Textarea } from "@/ui/primitives/Textarea";
import { announceArrival } from "./arrival";
import { homonymOf, phoneOwner, phonePreview, phoneTakenMessage } from "./customers-model";

export type CustomerFormProps = {
  /** Toutes les fiches : homonyme et numéro déjà pris, dits avant l'envoi. */
  directory: readonly CustomerDirectoryEntry[];
} & ({ mode: "create"; initialName: string } | { mode: "edit"; customer: CustomerSummary });

type Values = { fullName: string; phone: string; whatsapp: string; snapchat: string; address: string; notes: string };

function initialValues(props: CustomerFormProps): Values {
  if (props.mode === "create") return { fullName: props.initialName, phone: "", whatsapp: "", snapchat: "", address: "", notes: "" };
  const c = props.customer;
  return {
    fullName: c.fullName,
    // Comme on l'écrit en France : « 06 12 34 56 78 » (le serveur le rend en E.164).
    phone: c.phoneE164 ? formatPhoneNational(c.phoneE164) : "",
    whatsapp: c.whatsappE164 ? formatPhoneNational(c.whatsappE164) : "",
    snapchat: c.snapchat ?? "",
    address: c.address ?? "",
    notes: c.notes ?? "",
  };
}

const sameValues = (a: Values, b: Values) => (Object.keys(a) as (keyof Values)[]).every((key) => a[key].trim() === b[key].trim());

/** Pulse une fois l'élément (l'alerte d'homonyme vers laquelle le CTA mène). */
function pulse(element: HTMLElement | null) {
  if (!element) return;
  element.classList.remove("admin-confirm-pulse");
  void element.offsetWidth;
  element.classList.add("admin-confirm-pulse");
  element.addEventListener("animationend", () => element.classList.remove("admin-confirm-pulse"), { once: true });
}

/**
 * E20 — Formulaire client (06 E20) : créer une fiche ou la compléter en quelques secondes, tous les champs au même
 * endroit. Le téléphone se tape comme on le dit (« 06 12 34 56 78 ») et son aperçu normalisé s'affiche dès qu'il est
 * reconnu ; un homonyme (création) ou un numéro déjà pris se disent AVANT l'envoi. Le CTA dit ce qui manque et y
 * mène (arbitrage n°9) ; succès : la fiche, qui pulse.
 */
export function CustomerForm(props: CustomerFormProps) {
  const router = useRouter();
  const editing = props.mode === "edit" ? props.customer : null;
  const selfId = editing?.id ?? null;
  const [initial] = useState(() => initialValues(props));
  const [values, setValues] = useState<Values>(initial);
  const [id] = useState(() => editing?.id ?? newId());
  const [homonymAccepted, setHomonymAccepted] = useState<string | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const alertRef = useRef<HTMLDivElement>(null);

  const dirty = !sameValues(values, initial);
  const guard = useLeaveGuard(dirty);

  const set = (key: keyof Values) => (event: { target: { value: string } }) => setValues((previous) => ({ ...previous, [key]: event.target.value }));

  const done = (customerId: string) => {
    guard.release();
    announceArrival(customerId);
    router.push(routes.client(customerId));
  };
  const create = useAction(createCustomerAction, { success: "Fiche créée", onSuccess: (data) => done(data.id) });
  const update = useAction(updateCustomerAction, { success: "Fiche enregistrée", onSuccess: (data) => done(data.id) });
  const error = create.error ?? update.error;
  const fields = error?.code === "VALIDATION" ? (error.fields ?? {}) : {};

  const trimmedName = values.fullName.trim();
  const owner = phoneOwner(props.directory, values.phone, selfId);
  const phoneChanged = values.phone.trim() !== initial.phone.trim();
  // Le numéro déjà pris d'une fiche reprise ne bloque pas une autre modification : seul un numéro SAISI est vérifié.
  const phoneTaken = owner && phoneChanged ? owner : undefined;
  // Conflit renvoyé par le serveur (fiche créée entre-temps ailleurs) : même message, sous le champ.
  const serverConflict = error?.code === "CONFLICT" ? error.message : null;
  const homonym = editing ? undefined : homonymOf(props.directory, { fullName: values.fullName, phone: "" }, selfId);
  const homonymPending = homonym !== undefined && homonymAccepted !== homonym.id;

  const preview = phonePreview(values.phone);
  const whatsappPreview = phonePreview(values.whatsapp);

  const submit = async () => {
    const payload = {
      fullName: values.fullName,
      phone: values.phone.trim() || null,
      whatsapp: values.whatsapp.trim() || null,
      snapchat: values.snapchat.trim() || null,
      address: values.address.trim() || null,
      notes: values.notes.trim() || null,
    };
    if (editing) await update.run({ id: editing.id, ...payload });
    else await create.run({ id, ...payload });
  };

  const cta = (() => {
    if (trimmedName.length < 2) return { label: "Saisir le nom", onPress: () => nameRef.current?.focus() };
    if (phoneTaken) return { label: "Corriger le téléphone", onPress: () => phoneRef.current?.focus() };
    if (homonymPending) {
      return {
        label: "Vérifier le doublon",
        onPress: () => {
          alertRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
          pulse(alertRef.current);
        },
      };
    }
    return { label: editing ? "Enregistrer" : "Créer la fiche", onPress: () => void submit() };
  })();

  const openOwner = (entry: CustomerDirectoryEntry) => {
    guard.release();
    router.push(routes.client(entry.id));
  };

  const phoneError = fields.phone ?? (phoneTaken ? phoneTakenMessage(phoneTaken) : serverConflict ?? undefined);

  return (
    <form
      className="flex flex-1 flex-col gap-4"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
      }}
      data-customer-form
    >
      <FormSection title="Fiche">
        <FormField label="Nom" required error={fields.fullName}>
          {(field) => (
            <Input
              {...field}
              ref={nameRef}
              value={values.fullName}
              onChange={set("fullName")}
              autoComplete="off"
              autoCapitalize="words"
              enterKeyHint="next"
              variant="elevated"
              placeholder="Prénom Nom"
            />
          )}
        </FormField>

        {homonymPending && homonym ? (
          <div
            ref={alertRef}
            role="status"
            className="flex flex-col gap-2 rounded-[var(--admin-radius-md)] border border-[var(--admin-warning-border)] bg-[var(--admin-warning-bg)] p-3"
            data-homonym-alert
          >
            <Text variant="caption" tone="warning" className="font-medium">
              {homonym.fullName} existe déjà.
            </Text>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" size="sm" onClick={() => openOwner(homonym)}>
                Ouvrir sa fiche
              </Button>
              <Button variant="text" size="sm" onClick={() => setHomonymAccepted(homonym.id)}>
                Créer quand même
              </Button>
            </div>
          </div>
        ) : null}

        <FormField
          label="Téléphone"
          error={
            phoneError ? (
              <>
                {phoneError}
                {phoneTaken ? (
                  <>
                    {" "}
                    <Link
                      href={routes.client(phoneTaken.id)}
                      onClick={() => guard.release()}
                      className="admin-hit-target font-semibold underline underline-offset-2"
                    >
                      Ouvrir sa fiche
                    </Link>
                  </>
                ) : null}
              </>
            ) : undefined
          }
          hint={preview ?? "Comme on le dit : 06 12 34 56 78"}
        >
          {(field) => (
            <Input
              {...field}
              ref={phoneRef}
              value={values.phone}
              onChange={set("phone")}
              type="tel"
              inputMode="tel"
              autoComplete="off"
              enterKeyHint="next"
              variant="elevated"
              placeholder="06 12 34 56 78"
            />
          )}
        </FormField>

        <FormField label="Snap" error={fields.snapchat} hint="Identifiant, sans le @">
          {(field) => (
            <Input
              {...field}
              value={values.snapchat}
              onChange={set("snapchat")}
              autoComplete="off"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              enterKeyHint="next"
              variant="elevated"
              placeholder="pseudo"
            />
          )}
        </FormField>

        <FormField label="WhatsApp" error={fields.whatsapp} hint={whatsappPreview ?? "Si ce n'est pas le même numéro"}>
          {(field) => (
            <Input
              {...field}
              value={values.whatsapp}
              onChange={set("whatsapp")}
              type="tel"
              inputMode="tel"
              autoComplete="off"
              enterKeyHint="next"
              variant="elevated"
              placeholder="06 12 34 56 78"
            />
          )}
        </FormField>
      </FormSection>

      <FormSection title="Adresse et notes">
        <FormField label="Adresse" error={fields.address}>
          {(field) => (
            <Input
              {...field}
              value={values.address}
              onChange={set("address")}
              autoComplete="off"
              enterKeyHint="next"
              variant="elevated"
              placeholder="Rue, ville"
            />
          )}
        </FormField>
        <FormField label="Notes" error={fields.notes}>
          {(field) => (
            <Textarea
              {...field}
              value={values.notes}
              onChange={set("notes")}
              rows={2}
              variant="elevated"
              placeholder="Préférences, taille de flacon habituelle…"
            />
          )}
        </FormField>
      </FormSection>

      <StickyAction>
        <Button variant="primary" size="lg" fullWidth isLoading={create.pending || update.pending} onClick={cta.onPress}>
          {cta.label}
        </Button>
      </StickyAction>
    </form>
  );
}
