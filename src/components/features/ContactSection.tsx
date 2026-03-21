"use client";

import type { FC, FormEvent } from "react";
import { useEffect, useState } from "react";
import Image from "next/image";
import { useTheme } from "next-themes";
import { ArrowRight, Send } from "lucide-react";
import { CONTACT } from "@/lib/data";
import { ScrollReveal } from "@/components/ui/ScrollReveal";

interface ContactFormState {
  name: string;
  email: string;
  subject: string;
  message: string;
}

export const ContactSection: FC = () => {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const isDark = !mounted || resolvedTheme === "dark";

  const whatsappIcon = isDark
    ? "/branding/icons/nurea_icon_whatsapp_ivory.svg"
    : "/branding/icons/nurea_icon_whatsapp_bordeaux.svg";
  const snapchatIcon = isDark
    ? "/branding/icons/nurea_icon_snapchat_ivory.svg"
    : "/branding/icons/nurea_icon_snapchat_bordeaux.svg";

  const [formState, setFormState] = useState<ContactFormState>({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleContactSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setFormState({ name: "", email: "", subject: "", message: "" });
      setIsSubmitted(true);
    }, 1500);
  };

  return (
    <main className="relative w-full flex-1">
      {/* Decorative glow */}
      <div className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 h-[350px] w-[500px] bg-[var(--nurea-accent)] opacity-[0.025] blur-[100px]" />

      <div className="mx-auto max-w-[1200px] px-4 md:px-10 pt-28 pb-16 md:pt-40 md:pb-24">
        {/* Hero compact */}
        <ScrollReveal className="mx-auto mb-16 max-w-2xl text-center md:mb-24">
          <span className="mb-4 block text-[11px] font-medium uppercase tracking-[0.35em] text-[var(--nurea-accent)] md:text-[12px]">
            Conciergerie Privee
          </span>
          <h1 className="mb-5 font-serif text-[clamp(30px,6vw,52px)] leading-[1.08] text-[var(--nurea-text)]">
            L&apos;Art de{" "}
            <em className="italic">l&apos;Echange</em>
          </h1>
          <p className="mx-auto max-w-md text-[13px] leading-[1.85] text-[var(--nurea-text-muted)] md:text-[14px]">
            Notre Maison opere exclusivement sur commande via nos reseaux
            dedies. Pour toute acquisition ou conseil olfactif, nous nous tenons
            a votre entiere disposition.
          </p>
        </ScrollReveal>

        {/* Separator */}
        <ScrollReveal direction="scale" className="flex justify-center mb-16 md:mb-24">
          <Image
            src="/branding/separators/nurea_separator_copper.svg"
            alt=""
            width={100}
            height={10}
            className="max-w-[90px] opacity-25"
          />
        </ScrollReveal>

        <div className="mx-auto grid max-w-4xl gap-12 md:grid-cols-2 md:gap-16">
          {/* Left: Social CTAs */}
          <ScrollReveal direction="left" className="flex flex-col gap-4">
            <h2 className="mb-1 text-[11px] font-medium uppercase tracking-[0.3em] text-[var(--nurea-text-muted)]">
              Commander
            </h2>

            <a
              href={CONTACT.whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              className="group relative flex items-center gap-4 border border-[var(--nurea-border-hover)] bg-[var(--nurea-surface)] px-5 py-5 transition-all duration-500 hover:border-[var(--nurea-accent)] hover:bg-[var(--nurea-surface-hover)] active:scale-[0.99]"
            >
              <span className="flex h-12 w-12 shrink-0 items-center justify-center border border-[var(--nurea-border-hover)] transition-colors duration-300 group-hover:border-[var(--nurea-accent)]">
                <Image
                  src={whatsappIcon}
                  alt=""
                  width={22}
                  height={22}
                />
              </span>
              <div className="flex-1 min-w-0">
                <span className="block text-[10px] uppercase tracking-[0.18em] text-[var(--nurea-text-muted)] mb-0.5 md:text-[11px]">
                  Messages &amp; Commandes
                </span>
                <span className="font-serif text-base text-[var(--nurea-text)] md:text-lg">
                  WhatsApp
                </span>
              </div>
              <ArrowRight
                size={15}
                className="shrink-0 text-[var(--nurea-accent)] transition-transform duration-300 group-hover:-rotate-45"
              />
            </a>

            <a
              href={CONTACT.snapchat}
              target="_blank"
              rel="noopener noreferrer"
              className="group relative flex items-center gap-4 border border-[var(--nurea-border-hover)] bg-[var(--nurea-surface)] px-5 py-5 transition-all duration-500 hover:border-[#FFD100] hover:bg-[var(--nurea-surface-hover)] active:scale-[0.99]"
            >
              <span className="flex h-12 w-12 shrink-0 items-center justify-center border border-[var(--nurea-border-hover)] transition-colors duration-300 group-hover:border-[#FFD100]">
                <Image
                  src={snapchatIcon}
                  alt=""
                  width={22}
                  height={22}
                />
              </span>
              <div className="flex-1 min-w-0">
                <span className="block text-[10px] uppercase tracking-[0.18em] text-[var(--nurea-text-muted)] mb-0.5 md:text-[11px]">
                  Contacter sur Snapchat
                </span>
                <span className="font-serif text-base text-[var(--nurea-text)] md:text-lg">
                  Snapchat
                </span>
              </div>
              <ArrowRight
                size={15}
                className="shrink-0 text-[var(--nurea-text-muted)] transition-transform duration-300 group-hover:-rotate-45"
              />
            </a>

            {/* Email */}
            <div className="mt-3 border-t border-[var(--nurea-border)] pt-5">
              <span className="block text-[10px] uppercase tracking-[0.18em] text-[var(--nurea-text-muted)] mb-1.5 md:text-[11px]">
                Correspondance
              </span>
              <a
                href={`mailto:${CONTACT.email}`}
                className="font-serif text-sm text-[var(--nurea-text)] transition-colors duration-300 hover:text-[var(--nurea-accent)]"
              >
                {CONTACT.email}
              </a>
            </div>
          </ScrollReveal>

          {/* Right: Form */}
          <ScrollReveal direction="right" delay={120}>
            <div className="border border-[var(--nurea-border-hover)] bg-[var(--nurea-surface)] p-6 md:p-8">
              <h3 className="mb-1.5 text-[11px] font-medium uppercase tracking-[0.3em] text-[var(--nurea-text-muted)]">
                Nous ecrire
              </h3>
              <p className="mb-7 font-serif text-lg text-[var(--nurea-text)] md:text-xl">
                Un message, une demande
              </p>

              {isSubmitted ? (
                <div className="flex flex-col items-center justify-center py-14 text-center animate-fade-in-up">
                  <Image
                    src="/branding/monogram/np-circle-cuivre.png"
                    alt=""
                    width={48}
                    height={48}
                    className="mb-6 opacity-45"
                  />
                  <span className="mb-2 text-[11px] uppercase tracking-[0.25em] text-[var(--nurea-accent)]">
                    Message transmis
                  </span>
                  <h4 className="mb-3 font-serif text-xl text-[var(--nurea-text)]">
                    Merci pour votre confiance.
                  </h4>
                  <p className="max-w-xs text-[12px] leading-[1.8] text-[var(--nurea-text-muted)]">
                    Notre conciergerie reviendra vers vous dans les plus brefs
                    delais.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleContactSubmit} className="space-y-6">
                  <div className="grid gap-6 md:grid-cols-2">
                    <FloatingInput
                      id="name"
                      label="Nom & Prenom"
                      type="text"
                      value={formState.name}
                      onChange={(v) =>
                        setFormState({ ...formState, name: v })
                      }
                    />
                    <FloatingInput
                      id="email"
                      label="E-mail"
                      type="email"
                      value={formState.email}
                      onChange={(v) =>
                        setFormState({ ...formState, email: v })
                      }
                    />
                  </div>

                  <FloatingInput
                    id="subject"
                    label="Sujet de votre demande"
                    type="text"
                    value={formState.subject}
                    onChange={(v) =>
                      setFormState({ ...formState, subject: v })
                    }
                  />

                  <div className="relative pt-2">
                    <textarea
                      id="message"
                      required
                      rows={4}
                      value={formState.message}
                      onChange={(e) =>
                        setFormState({
                          ...formState,
                          message: e.target.value,
                        })
                      }
                      className="peer block w-full resize-none border-b border-[var(--nurea-border)] bg-transparent py-3 text-[12px] text-[var(--nurea-text)] outline-none transition-colors duration-300 focus:border-[var(--nurea-accent)] md:text-[13px]"
                      placeholder=" "
                    />
                    <label
                      htmlFor="message"
                      className={`absolute left-0 top-5 text-[12px] text-[var(--nurea-text-muted)] transition-all duration-300 peer-focus:-top-1 peer-focus:text-[8px] peer-focus:tracking-[0.2em] peer-focus:uppercase peer-focus:text-[var(--nurea-accent)] md:text-[13px] ${
                        formState.message
                          ? "-top-1 text-[8px] tracking-[0.2em] uppercase text-[var(--nurea-accent)]"
                          : ""
                      }`}
                    >
                      Votre message
                    </label>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="btn-nurea mt-3 w-full justify-center disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      "Envoi en cours..."
                    ) : (
                      <>
                        Envoyer la demande
                        <Send
                          size={12}
                          className="text-[var(--nurea-accent)]"
                        />
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          </ScrollReveal>
        </div>
      </div>
    </main>
  );
};

/* Floating label input */
const FloatingInput = ({
  id,
  label,
  type,
  value,
  onChange,
}: {
  id: string;
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
}) => (
  <div className="relative">
    <input
      type={type}
      id={id}
      required
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="peer block w-full border-b border-[var(--nurea-border)] bg-transparent py-3 text-[12px] text-[var(--nurea-text)] outline-none transition-colors duration-300 focus:border-[var(--nurea-accent)] md:text-[13px]"
      placeholder=" "
    />
    <label
      htmlFor={id}
      className={`absolute left-0 top-3 text-[12px] text-[var(--nurea-text-muted)] transition-all duration-300 peer-focus:-top-4 peer-focus:text-[8px] peer-focus:tracking-[0.2em] peer-focus:uppercase peer-focus:text-[var(--nurea-accent)] md:text-[13px] ${
        value
          ? "-top-4 text-[8px] tracking-[0.2em] uppercase text-[var(--nurea-accent)]"
          : ""
      }`}
    >
      {label}
    </label>
  </div>
);
