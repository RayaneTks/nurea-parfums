"use client";

import type { FC, FormEvent } from "react";
import { useState } from "react";
import { ArrowRight, Send } from "lucide-react";
import { CONTACT } from "@/lib/data";

interface ContactFormState {
  name: string;
  email: string;
  subject: string;
  message: string;
}

export const ContactSection: FC = () => {
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
    <main className="w-full max-w-[1400px] mx-auto px-6 md:px-12 py-32 md:py-48 animate-[fadeInUp_0.6s_ease-out]">
      <div className="mx-auto max-w-5xl">
        <div className="mb-24 text-center">
          <span className="mb-6 block text-xs uppercase tracking-[0.4em] text-[#8C7A6B] md:text-sm dark:text-[#C29B62]">
            Conciergerie Privée
          </span>
          <h1 className="mb-8 font-serif text-5xl font-light leading-[1.1] text-[#222222] md:text-7xl dark:text-[#FDFCF8]">
            L&apos;Art de{" "}
            <span className="italic text-[#8C7A6B] dark:text-[#C29B62]">
              l&apos;Échange.
            </span>
          </h1>
          <p className="mx-auto max-w-lg text-sm font-light leading-relaxed text-[#888888] md:text-base dark:text-[#A0A0A0]">
            Notre Maison opère exclusivement sur commande via nos réseaux
            dédiés. Pour toute acquisition ou conseil olfactif, nous nous tenons
            à votre entière disposition.
          </p>
        </div>

        <div className="grid gap-16 md:grid-cols-12 md:gap-24">
          <div className="space-y-12 md:col-span-5">
            <div>
              <h3 className="mb-6 font-serif text-2xl">
                Commander via nos réseaux
              </h3>
              <p className="mb-8 text-sm font-light leading-relaxed text-[#888888] dark:text-[#A0A0A0]">
                Toutes nos créations sont disponibles sur commande. Échangez
                directement avec nous sur nos plateformes pour réserver votre
                pièce ou obtenir une recommandation personnalisée.
              </p>
              <div className="space-y-4">
                <a
                  href={CONTACT.whatsapp}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center justify-between bg-[#222222] p-6 text-[#FDFCF8] transition-all duration-500 hover:bg-[#8C7A6B] dark:bg-[#FDFCF8] dark:text-[#0A0A0A] dark:hover:bg-[#C29B62]"
                >
                  <div>
                    <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.2em]">
                      Messages &amp; Commandes
                    </span>
                    <span className="font-serif text-xl">WhatsApp</span>
                  </div>
                  <ArrowRight
                    size={20}
                    strokeWidth={1.5}
                    className="transition-transform duration-500 group-hover:-rotate-45"
                  />
                </a>
                <a
                  href={CONTACT.snapchat}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center justify-between bg-[#222222] p-6 text-[#FDFCF8] transition-all duration-500 hover:bg-[#FFD100] hover:text-[#0A0A0A] dark:bg-[#FDFCF8] dark:text-[#0A0A0A] dark:hover:bg-[#FFD100]"
                >
                  <div>
                    <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.2em]">
                      Contacter sur Snapchat
                    </span>
                    <span className="font-serif text-xl">Snapchat</span>
                  </div>
                  <ArrowRight
                    size={20}
                    strokeWidth={1.5}
                    className="transition-transform duration-500 group-hover:-rotate-45"
                  />
                </a>
              </div>
            </div>
          </div>

          <div className="md:col-span-7">
            <div className="bg-[#F5F4F0] p-8 md:p-12 dark:bg-[#141414]">
              <h3 className="mb-8 font-serif text-2xl">Nous écrire</h3>

              {isSubmitted ? (
                <div className="flex flex-col items-center justify-center py-16 text-center animate-[fadeInUp_0.6s_ease-out]">
                  <span className="mb-4 text-xs uppercase tracking-[0.4em] text-[#8C7A6B] dark:text-[#C29B62]">
                    Message transmis
                  </span>
                  <h4 className="mb-4 font-serif text-3xl">
                    Merci pour votre confiance.
                  </h4>
                  <p className="max-w-sm text-sm text-[#888888] dark:text-[#A0A0A0]">
                    Notre conciergerie reviendra vers vous dans les plus brefs
                    délais.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleContactSubmit} className="space-y-8">
                  <div className="grid gap-8 md:grid-cols-2">
                    <div className="relative">
                      <input
                        type="text"
                        id="name"
                        required
                        value={formState.name}
                        onChange={(event) =>
                          setFormState({
                            ...formState,
                            name: event.target.value,
                          })
                        }
                        className="peer block w-full border-b border-[#222222]/10 bg-transparent py-3 text-sm outline-none transition-colors focus:border-[#8C7A6B] dark:border-[#FDFCF8]/10 dark:focus:border-[#C29B62]"
                        placeholder=" "
                      />
                      <label
                        htmlFor="name"
                        className={`absolute left-0 top-3 text-sm text-[#888888] transition-all peer-focus:-top-4 peer-focus:text-[10px] peer-focus:tracking-[0.2em] peer-focus:uppercase dark:text-[#A0A0A0] ${
                          formState.name
                            ? "-top-4 text-[10px] tracking-[0.2em] uppercase"
                            : ""
                        }`}
                      >
                        Nom &amp; Prénom
                      </label>
                    </div>
                    <div className="relative">
                      <input
                        type="email"
                        id="email"
                        required
                        value={formState.email}
                        onChange={(event) =>
                          setFormState({
                            ...formState,
                            email: event.target.value,
                          })
                        }
                        className="peer block w-full border-b border-[#222222]/10 bg-transparent py-3 text-sm outline-none transition-colors focus:border-[#8C7A6B] dark:border-[#FDFCF8]/10 dark:focus:border-[#C29B62]"
                        placeholder=" "
                      />
                      <label
                        htmlFor="email"
                        className={`absolute left-0 top-3 text-sm text-[#888888] transition-all peer-focus:-top-4 peer-focus:text-[10px] peer-focus:tracking-[0.2em] peer-focus:uppercase dark:text-[#A0A0A0] ${
                          formState.email
                            ? "-top-4 text-[10px] tracking-[0.2em] uppercase"
                            : ""
                        }`}
                      >
                        E-mail
                      </label>
                    </div>
                  </div>

                  <div className="relative">
                    <input
                      type="text"
                      id="subject"
                      required
                      value={formState.subject}
                      onChange={(event) =>
                        setFormState({
                          ...formState,
                          subject: event.target.value,
                        })
                      }
                      className="peer block w-full border-b border-[#222222]/10 bg-transparent py-3 text-sm outline-none transition-colors focus:border-[#8C7A6B] dark:border-[#FDFCF8]/10 dark:focus:border-[#C29B62]"
                      placeholder=" "
                    />
                    <label
                      htmlFor="subject"
                      className={`absolute left-0 top-3 text-sm text-[#888888] transition-all peer-focus:-top-4 peer-focus:text-[10px] peer-focus:tracking-[0.2em] peer-focus:uppercase dark:text-[#A0A0A0] ${
                        formState.subject
                          ? "-top-4 text-[10px] tracking-[0.2em] uppercase"
                          : ""
                      }`}
                    >
                      Sujet de votre demande
                    </label>
                  </div>

                  <div className="relative pt-2">
                    <textarea
                      id="message"
                      required
                      rows={4}
                      value={formState.message}
                      onChange={(event) =>
                        setFormState({
                          ...formState,
                          message: event.target.value,
                        })
                      }
                      className="peer block w-full resize-none border-b border-[#222222]/10 bg-transparent py-3 text-sm outline-none transition-colors focus:border-[#8C7A6B] dark:border-[#FDFCF8]/10 dark:focus:border-[#C29B62]"
                      placeholder=" "
                    />
                    <label
                      htmlFor="message"
                      className={`absolute left-0 top-5 text-sm text-[#888888] transition-all peer-focus:-top-2 peer-focus:text-[10px] peer-focus:tracking-[0.2em] peer-focus:uppercase dark:text-[#A0A0A0] ${
                        formState.message
                          ? "-top-2 text-[10px] tracking-[0.2em] uppercase"
                          : ""
                      }`}
                    >
                      Votre message
                    </label>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="mt-8 flex w-full items-center justify-center gap-3 px-10 py-4 text-xs font-medium uppercase tracking-[0.2em] transition-all duration-300 disabled:opacity-50 md:w-auto bg-[#222222] text-[#FDFCF8] hover:bg-[#8C7A6B] dark:bg-[#FDFCF8] dark:text-[#0A0A0A] dark:hover:bg-[#C29B62]"
                  >
                    {isSubmitting ? "Envoi en cours..." : "Envoyer la demande"}
                    {!isSubmitting && <Send size={14} />}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
};
