import type { FC, ReactNode } from "react";
import Link from "next/link";
import { BrandLogo } from "./BrandLogo";
import { CONTACT } from "@/lib/data";
import { SnapchatIcon, WhatsAppIcon } from "@/components/ui/Icons";
import { MENTION_FLACONS, MENTION_PHOTOS } from "@/lib/mentions";
import { SITE_NAME } from "@/lib/site";

const NAVIGATION = [
  { href: "/", label: "Le catalogue" },
  { href: "/parfums", label: "Toutes les marques" },
  { href: "/marque", label: "La parfumerie" },
  { href: "/contact", label: "Contact et commande" },
] as const;

const LEGAL = [
  { href: "/legal", label: "Mentions légales" },
  { href: "/legal", label: "Politique de confidentialité" },
  { href: "/legal", label: "CGV / CGU" },
  { href: "/legal", label: "Livraison et retours" },
] as const;

/*
 * WhatsApp n'apparaît que le jour où `CONTACT.whatsapp` porte un numéro : un pied
 * de page est une liste de raccourcis, pas un endroit où l'on annonce « bientôt ».
 */
const SOCIAL = [
  { href: CONTACT.snapchat, label: "Snapchat", Icon: SnapchatIcon },
  ...(CONTACT.whatsapp
    ? [{ href: CONTACT.whatsapp, label: "WhatsApp", Icon: WhatsAppIcon }]
    : []),
] as const;

const LINK = "transition-colors duration-dur-2 ease-soft mouse-hover:text-fg-1";

/**
 * Pied de page — composant serveur : l'année vient du rendu, le logo bascule en
 * CSS. Il porte les deux mentions dues au client (`src/lib/mentions.ts`).
 */
export const Footer: FC = () => (
  <footer className="mt-[var(--space-section)] border-t border-line bg-surface-1">
    <div className="page-x grid gap-12 py-12 md:grid-cols-2 lg:grid-cols-4">
      <div className="flex flex-col gap-4">
        <Link href="/" aria-label={`${SITE_NAME} — accueil`} className="flex h-11 w-fit items-center">
          <BrandLogo className="h-10" />
        </Link>
        <p className="t-body t-measure">
          Vous payez le parfum, pas la pub.
        </p>
        <p className="t-caption t-measure">{MENTION_FLACONS}</p>
        <ul className="flex gap-2">
          {SOCIAL.map(({ href, label, Icon }) => (
            <li key={label}>
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={label}
                className="press flex h-11 w-11 items-center justify-center rounded-md border border-line text-fg-1 transition-[background-color,transform] duration-dur-2 ease-soft mouse-hover:bg-surface-2"
              >
                <Icon className="h-5 w-5" />
              </a>
            </li>
          ))}
        </ul>
      </div>

      <FooterColumn title="Navigation">
        {NAVIGATION.map(({ href, label }) => (
          <li key={label}>
            <Link href={href} className={LINK}>
              {label}
            </Link>
          </li>
        ))}
      </FooterColumn>

      <FooterColumn title="Contact">
        <li>
          <a href={`mailto:${CONTACT.email}`} className={`${LINK} break-words`}>
            {/* Coupure permise après l'arobase : sans elle, « .fr » tombait seul sur sa ligne. */}
            {CONTACT.email.split("@")[0]}@<wbr />
            {CONTACT.email.split("@")[1]}
          </a>
        </li>
        <li>Envoi partout en France. Remise en main propre à Marseille.</li>
      </FooterColumn>

      <FooterColumn title="Légal">
        {LEGAL.map(({ href, label }) => (
          <li key={label}>
            <Link href={href} className={LINK}>
              {label}
            </Link>
          </li>
        ))}
      </FooterColumn>
    </div>

    <div className="page-x flex flex-col gap-1 border-t border-line py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <p className="t-caption">
        © {new Date().getFullYear()} {SITE_NAME}, Marseille. Tous droits réservés.
      </p>
      <p className="t-caption">{MENTION_PHOTOS}</p>
    </div>
  </footer>
);

const FooterColumn: FC<{ title: string; children: ReactNode }> = ({ title, children }) => (
  <div className="flex flex-col gap-4">
    <h2 className="t-caption">{title}</h2>
    <ul className="t-body flex flex-col [&_a]:inline-flex [&_a]:min-h-11 [&_a]:items-center">
      {children}
    </ul>
  </div>
);
