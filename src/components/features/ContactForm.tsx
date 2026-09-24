"use client";

import type { FC, FormEvent } from "react";
import { useRef, useState } from "react";
import { buildContactMailto } from "@/lib/contactMailto";
import { submitContactForm } from "@/actions/contact";
import { ELAPSED_FIELD, HONEYPOT_FIELD } from "@/lib/contact/guard";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";

interface ContactFormState {
  name: string;
  email: string;
  subject: string;
  message: string;
}

type FieldErrors = Partial<Record<keyof ContactFormState, string>>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;

interface ContactFormProps {
  /** Pré-remplissage venu d'une fiche produit. */
  parfum?: string;
  marque?: string;
}

function initialState(parfum: string, marque: string): ContactFormState {
  if (!parfum && !marque) {
    return { name: "", email: "", subject: "", message: "" };
  }
  const label = [marque, parfum].filter(Boolean).join(" — ");
  return {
    name: "",
    email: "",
    subject: `Commander — ${label}`,
    message: `Bonjour,\nJe souhaite commander le parfum ${parfum}${marque ? ` de ${marque}` : ""}.\n\n`,
  };
}

function validate(state: ContactFormState): FieldErrors {
  const errors: FieldErrors = {};
  if (!state.name.trim()) errors.name = "Indiquez votre nom.";
  if (!state.email.trim()) errors.email = "Indiquez votre e-mail.";
  else if (!EMAIL_PATTERN.test(state.email.trim())) {
    errors.email = "Format d'e-mail invalide.";
  }
  if (!state.subject.trim()) errors.subject = "Indiquez un sujet.";
  if (!state.message.trim()) errors.message = "Écrivez votre message.";
  return errors;
}

/**
 * Le formulaire de la page Contact — la voie lente, sous la voie rapide.
 *
 * Il était la moitié droite d'un composant qui rendait toute la page ; la page
 * est désormais composée côté serveur (`app/(shop)/contact/page.tsx`) et seul
 * ce qui a besoin d'état reste client : la saisie, l'envoi, l'accusé.
 *
 * Charte § 05 : un seul aplat plein par écran, et il revient à Snapchat, canal
 * principal. L'envoi reste au filet, ce qui dit aussi le délai de réponse réel
 * des deux voies.
 */
export const ContactForm: FC<ContactFormProps> = ({ parfum = "", marque = "" }) => {
  const [form, setForm] = useState<ContactFormState>(() => initialState(parfum, marque));
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [sentVia, setSentVia] = useState<"resend" | "mailto" | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  /* Anti-abus, côté navigateur (voir `src/lib/contact/guard.ts`) : le leurre qu'un humain ne voit
     pas, et le temps réellement passé sur le formulaire. Les deux ne sont que des indices — le
     verdict est rendu côté serveur. */
  const honeypot = useRef<HTMLInputElement>(null);
  const openedAt = useRef<number>(Date.now());

  const patch = (key: keyof ContactFormState) => (value: string) =>
    setForm((current) => ({ ...current, [key]: value }));

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setServerError(null);

    const nextErrors = validate(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    const payload = new FormData();
    payload.set("name", form.name.trim());
    payload.set("email", form.email.trim());
    payload.set("subject", form.subject.trim());
    payload.set("message", form.message.trim());
    payload.set(HONEYPOT_FIELD, honeypot.current?.value ?? "");
    payload.set(ELAPSED_FIELD, String(Date.now() - openedAt.current));

    try {
      const result = await submitContactForm(payload);
      if (!result.ok) {
        setServerError(result.error);
        return;
      }

      /* Sans service d'envoi configuré, on repasse la main à la messagerie
         du visiteur plutôt que de perdre le message. */
      if (result.via === "mailto") {
        window.location.href = buildContactMailto({
          name: form.name.trim(),
          email: form.email.trim(),
          subject: form.subject.trim(),
          message: form.message.trim(),
        });
      }

      setSentVia(result.via === "mailto" ? "mailto" : "resend");
      setForm(initialState(parfum, marque));
      setErrors({});
    } catch {
      setServerError("Envoi impossible pour le moment. Réessayez, ou écrivez-nous directement.");
    } finally {
      setSubmitting(false);
    }
  };

  if (sentVia) {
    return (
      <div role="status" className="border border-nurea-border-strong p-6 md:p-10">
        <p className="nurea-name text-nurea-text">Merci pour votre message</p>
        <p className="nurea-body mt-4">
          {sentVia === "resend"
            ? "Nous vous répondons dans les plus brefs délais."
            : "Votre messagerie vient de s'ouvrir. Si ce n'est pas le cas, écrivez-nous directement à l'adresse indiquée plus haut."}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6" noValidate>
      {/* Leurre : masqué à l'écran, retiré de l'arbre d'accessibilité et du parcours au
          clavier. Un lecteur d'écran ne l'annonce pas, un robot le remplit. */}
      <div aria-hidden className="hidden">
        <label htmlFor="societe">Société (ne pas remplir)</label>
        <input
          ref={honeypot}
          id="societe"
          name={HONEYPOT_FIELD}
          type="text"
          tabIndex={-1}
          autoComplete="off"
          defaultValue=""
        />
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <Field
          id="name"
          name="name"
          label="Votre nom"
          autoComplete="name"
          value={form.name}
          error={errors.name}
          onChange={patch("name")}
        />
        <Field
          id="email"
          name="email"
          type="email"
          label="Votre e-mail"
          autoComplete="email"
          value={form.email}
          error={errors.email}
          onChange={patch("email")}
        />
      </div>

      <Field
        id="subject"
        name="subject"
        label="Sujet"
        value={form.subject}
        error={errors.subject}
        onChange={patch("subject")}
      />

      <Field
        id="message"
        name="message"
        label="Votre message"
        multiline
        value={form.message}
        error={errors.message}
        onChange={patch("message")}
      />

      {serverError ? (
        <p role="alert" className="nurea-caption text-nurea-alert">
          {serverError}
        </p>
      ) : null}

      <Button type="submit" variant="outline" disabled={submitting} className="self-start">
        {submitting ? "Transmission…" : "Envoyer le message"}
      </Button>
    </form>
  );
};
