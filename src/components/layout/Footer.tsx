import Link from "next/link";
import type { FC } from "react";
import { CONTACT } from "@/lib/data";

export const Footer: FC = () => {
  return (
    <footer className="mt-auto bg-[#0A0A0A] pt-24 pb-12 text-[#FDFCF8]">
      <div className="mx-auto max-w-[1400px] px-6 md:px-12">
        <div className="mb-20 grid gap-12 text-center md:grid-cols-3 md:gap-8 md:text-left">
          <div>
            <div className="mb-6 font-serif text-3xl tracking-widest uppercase">
              Nuréa
            </div>
            <p className="mx-auto max-w-xs text-sm font-light text-[#888888] md:mx-0">
              La quintessence de la parfumerie mondiale,
              curatée pour les esprits raffinés.
            </p>
          </div>

          <div className="flex flex-col gap-4">
            <span className="mb-2 text-[10px] font-semibold uppercase tracking-[0.3em] text-[#555555]">
              Conseil &amp; Commande
            </span>
            <a
              href={CONTACT.whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              className="group font-serif text-xl transition-all hover:text-[#C29B62]"
            >
              <span className="inline-block transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-2">
                WhatsApp
              </span>
            </a>
            <a
              href={CONTACT.snapchat}
              target="_blank"
              rel="noopener noreferrer"
              className="group font-serif text-xl transition-all hover:text-[#FFD100]"
            >
              <span className="inline-block transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-2">
                Snapchat
              </span>
            </a>
          </div>

          <div className="flex flex-col gap-4 md:items-end">
            <span className="mb-2 text-[10px] font-semibold uppercase tracking-[0.3em] text-[#555555]">
              Informations
            </span>
            <Link
              href="/contact"
              className="text-sm transition-colors hover:text-[#C29B62]"
            >
              Nous écrire
            </Link>
            <a
              href="#"
              className="text-sm transition-colors hover:text-[#C29B62]"
            >
              Mentions Légales
            </a>
          </div>
        </div>

        <div className="border-t border-[#FDFCF8]/10 pt-8 text-center text-xs uppercase tracking-widest text-[#555555]">
          © {new Date().getFullYear()} Nuréa Parfums. Tous droits réservés.
        </div>
      </div>
    </footer>
  );
};
